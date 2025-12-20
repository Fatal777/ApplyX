"""Celery tasks for resume processing"""

import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.tasks.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.resume import Resume
from app.models.user import User
from app.services.text_extraction import TextExtractionService
from app.services.nlp_analysis import NLPAnalysisService
from app.services.feedback import FeedbackService
from app.services.contact_extractor import contact_extractor
from app.core.security import encrypt_sensitive_data

logger = logging.getLogger(__name__)


def get_db():
    """Get database session for Celery tasks"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass


def update_user_profile_from_resume(db: Session, user_id: int, extracted_text: str):
    """
    Auto-populate user profile fields from resume if not already set.
    Only fills in missing fields, never overwrites existing data.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        # Extract contact info from resume
        contact_info = contact_extractor.extract_all(extracted_text)
        confidence = contact_extractor.get_extraction_confidence(contact_info)
        
        updated = False
        
        # Only update if user doesn't have the field and we have high confidence
        if not user.full_name and contact_info.get('name') and confidence.get('name', 0) >= 0.7:
            user.full_name = contact_info['name']
            updated = True
            logger.info(f"Auto-populated name for user {user_id} from resume")
        
        if not user.phone_number and contact_info.get('phone') and confidence.get('phone', 0) >= 0.7:
            user.phone_number = contact_info['phone']
            updated = True
            logger.info(f"Auto-populated phone for user {user_id} from resume")
        
        if updated:
            user.contact_source = 'resume'
            user.profile_completed = user.is_profile_complete
            db.commit()
            
    except Exception as e:
        logger.warning(f"Could not auto-populate profile for user {user_id}: {str(e)}")


@celery_app.task(bind=True, name='process_resume')
def process_resume_task(self, resume_id: int):
    """
    Async task to process uploaded resume
    - Extract text
    - Perform NLP analysis
    - Generate feedback
    """
    db = SessionLocal()
    resume = None  # Initialize to avoid UnboundLocalError in exception handler
    
    try:
        logger.info(f"Starting resume processing for ID: {resume_id}")
        
        # Get resume from database
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            logger.error(f"Resume not found: {resume_id}")
            return {"status": "error", "message": "Resume not found"}
        
        # Update status to processing
        resume.status = "processing"
        db.commit()
        
        # Extract text from file
        logger.info(f"Extracting text from {resume.file_type} file")
        extractor = TextExtractionService()
        extracted_text = extractor.extract_text(resume.file_path, resume.file_type)
        
        if not extracted_text or len(extracted_text) < 50:
            resume.status = "failed"
            db.commit()
            logger.error(f"Failed to extract sufficient text from resume {resume_id}")
            return {"status": "error", "message": "Failed to extract text"}
        
        # Clean text
        cleaned_text = extractor.clean_text(extracted_text)
        
        # Encrypt and store extracted text
        encrypted_text = encrypt_sensitive_data(cleaned_text)
        resume.extracted_text = encrypted_text
        
        # Auto-populate user profile from resume (non-blocking, first resume only)
        try:
            update_user_profile_from_resume(db, resume.user_id, cleaned_text)
        except Exception as e:
            logger.warning(f"Profile auto-populate failed: {str(e)}")
        
        # Perform NLP analysis
        logger.info(f"Performing NLP analysis for resume {resume_id}")
        nlp_service = NLPAnalysisService()
        analysis = nlp_service.analyze_resume(cleaned_text)
        
        # Generate feedback
        logger.info(f"Generating feedback for resume {resume_id}")
        feedback_service = FeedbackService()
        feedback = feedback_service.generate_feedback(analysis)
        suggestions = feedback_service.generate_improvement_tips(analysis)
        
        # Generate AI-powered suggestions if AgentRouter is configured
        try:
            from app.services.ai_service import ai_service
            import asyncio
            
            # Create async loop to run AI generation
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            ai_suggestions = loop.run_until_complete(
                ai_service.generate_resume_suggestions(
                    cleaned_text,
                    analysis,
                    resume.job_description
                )
            )
            loop.close()
            
            # Merge AI suggestions with regular suggestions
            if ai_suggestions:
                suggestions.extend(ai_suggestions)
                logger.info(f"Added {len(ai_suggestions)} AI-powered suggestions")
        except Exception as e:
            logger.warning(f"Could not generate AI suggestions: {str(e)}")
        
        # Update resume with analysis results
        resume.analysis_score = analysis['score']
        resume.keywords = analysis['keywords']
        resume.sections = analysis['sections']
        resume.skills = analysis['skills']
        resume.experience = analysis['experience']
        resume.education = analysis['education']
        resume.feedback = feedback
        resume.suggestions = suggestions
        resume.status = "completed"
        resume.processed_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Resume processing completed for ID: {resume_id}")

        # Trigger asynchronous job matching task (non-blocking)
        try:
            from app.tasks.job_tasks import match_jobs_to_resume
            match_jobs_to_resume.delay(resume_id)
            logger.info(f"Enqueued job matching task for resume {resume_id}")
        except Exception as e:  # pragma: no cover
            logger.warning(f"Could not enqueue job matching for resume {resume_id}: {e}")
        
        return {
            "status": "success",
            "resume_id": resume_id,
            "score": analysis['score']
        }
        
    except Exception as e:
        logger.error(f"Error processing resume {resume_id}: {str(e)}")
        
        # Update status to failed
        if resume:
            resume.status = "failed"
            db.commit()
        
        return {"status": "error", "message": str(e)}
        
    finally:
        db.close()


@celery_app.task(name='cleanup_old_resumes')
def cleanup_old_resumes_task():
    """
    Periodic task to cleanup old resumes
    Run daily to remove resumes older than 30 days
    """
    db = SessionLocal()
    
    try:
        from datetime import timedelta
        from app.services.storage import get_storage_service
        
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        # Find old resumes
        old_resumes = db.query(Resume).filter(Resume.created_at < cutoff_date).all()
        
        storage_service = get_storage_service()
        deleted_count = 0
        
        for resume in old_resumes:
            try:
                # Delete file from storage
                storage_service.delete_file(resume.stored_filename)
                
                # Delete from database
                db.delete(resume)
                deleted_count += 1
                
            except Exception as e:
                logger.error(f"Error deleting resume {resume.id}: {str(e)}")
        
        db.commit()
        logger.info(f"Cleaned up {deleted_count} old resumes")
        
        return {"status": "success", "deleted_count": deleted_count}
        
    except Exception as e:
        logger.error(f"Error in cleanup task: {str(e)}")
        return {"status": "error", "message": str(e)}
        
    finally:
        db.close()
