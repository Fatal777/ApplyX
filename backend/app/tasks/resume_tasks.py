"""Celery tasks for resume processing"""

import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.tasks.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.resume import Resume
from app.services.text_extraction import TextExtractionService
from app.services.nlp_analysis import NLPAnalysisService
from app.services.feedback import FeedbackService
from app.core.security import encrypt_sensitive_data

logger = logging.getLogger(__name__)


def get_db():
    """Get database session for Celery tasks"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass


@celery_app.task(bind=True, name='process_resume')
def process_resume_task(self, resume_id: int):
    """
    Async task to process uploaded resume
    - Extract text
    - Perform NLP analysis
    - Generate feedback
    """
    db = SessionLocal()
    
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
