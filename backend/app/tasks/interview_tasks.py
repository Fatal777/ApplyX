"""Celery tasks for interview processing"""

import logging
from typing import Dict, Any, List
from datetime import datetime
from celery import shared_task

from app.tasks.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.interview import (
    InterviewSession, 
    InterviewResponse, 
    InterviewFeedback,
    InterviewStatus,
    InterviewType
)

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name='analyze_interview_response')
def analyze_interview_response_task(
    self,
    response_id: int,
    question: str,
    transcript: str,
    expected_skills: List[str],
    evaluation_criteria: List[str]
) -> Dict[str, Any]:
    """
    Async task to analyze a single interview response.
    Used when real-time analysis would be too slow.
    """
    db = SessionLocal()
    
    try:
        logger.info(f"Starting response analysis for response ID: {response_id}")
        
        # Import here to avoid circular imports
        from app.services.interview_ai_service import interview_ai_service
        import asyncio
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            analysis = loop.run_until_complete(
                interview_ai_service.analyze_response(
                    question=question,
                    user_transcript=transcript,
                    expected_skills=expected_skills,
                    evaluation_criteria=evaluation_criteria
                )
            )
        finally:
            loop.close()
        
        # Update response with analysis
        response = db.query(InterviewResponse).filter(
            InterviewResponse.id == response_id
        ).first()
        
        if response:
            response.ai_analysis = analysis
            response.scores = analysis.get("scores", {})
            db.commit()
            logger.info(f"Analysis saved for response {response_id}")
        
        return {
            "status": "success",
            "response_id": response_id,
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Error analyzing response {response_id}: {str(e)}")
        return {
            "status": "error",
            "response_id": response_id,
            "error": str(e)
        }
    finally:
        db.close()


@celery_app.task(bind=True, name='generate_interview_feedback')
def generate_interview_feedback_task(
    self,
    session_id: int
) -> Dict[str, Any]:
    """
    Async task to generate comprehensive interview feedback.
    Called after all questions are answered.
    """
    db = SessionLocal()
    
    try:
        logger.info(f"Generating feedback for interview session: {session_id}")
        
        # Get session
        session = db.query(InterviewSession).filter(
            InterviewSession.id == session_id
        ).first()
        
        if not session:
            return {"status": "error", "error": "Session not found"}
        
        # Get all responses
        responses = db.query(InterviewResponse).filter(
            InterviewResponse.session_id == session_id
        ).order_by(InterviewResponse.question_number).all()
        
        if not responses:
            return {"status": "error", "error": "No responses found"}
        
        # Prepare data
        response_data = [
            {"question": r.question_text, "transcript": r.transcript}
            for r in responses
        ]
        analysis_data = [r.ai_analysis or {} for r in responses]
        
        config = session.config or {}
        
        # Import and run AI service
        from app.services.interview_ai_service import interview_ai_service
        import asyncio
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            feedback_data = loop.run_until_complete(
                interview_ai_service.generate_final_feedback(
                    interview_type=session.interview_type,
                    job_role=config.get("job_role"),
                    responses=response_data,
                    response_analyses=analysis_data
                )
            )
        finally:
            loop.close()
        
        # Save feedback
        feedback = InterviewFeedback(
            session_id=session_id,
            overall_score=feedback_data.get("overall_score", 0),
            category_scores=feedback_data.get("category_scores", {}),
            strengths=feedback_data.get("top_strengths", []),
            improvements=feedback_data.get("priority_improvements", []),
            detailed_feedback=feedback_data.get("detailed_feedback", {}),
            recommendations=feedback_data.get("recommendations", [])
        )
        db.add(feedback)
        
        # Update session status
        session.status = InterviewStatus.COMPLETED
        session.completed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Feedback generated for session {session_id}, score: {feedback.overall_score}")
        
        return {
            "status": "success",
            "session_id": session_id,
            "feedback_id": feedback.id,
            "overall_score": feedback.overall_score
        }
        
    except Exception as e:
        logger.error(f"Error generating feedback for session {session_id}: {str(e)}")
        
        # Mark session as failed
        try:
            session = db.query(InterviewSession).filter(
                InterviewSession.id == session_id
            ).first()
            if session:
                session.status = InterviewStatus.FAILED
                db.commit()
        except Exception:
            pass
        
        return {
            "status": "error",
            "session_id": session_id,
            "error": str(e)
        }
    finally:
        db.close()


@celery_app.task(bind=True, name='batch_transcribe')
def batch_transcribe_task(
    self,
    session_id: int,
    audio_data_list: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Batch transcribe multiple audio segments.
    Useful for processing recorded interview segments.
    
    audio_data_list: List of {"audio_data": base64, "audio_format": str, "question_number": int}
    """
    db = SessionLocal()
    
    try:
        logger.info(f"Batch transcribing {len(audio_data_list)} segments for session {session_id}")
        
        from app.services.speech_service import speech_service
        import asyncio
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        results = []
        
        try:
            for item in audio_data_list:
                result = loop.run_until_complete(
                    speech_service.transcribe_audio(
                        audio_data=item["audio_data"],
                        audio_format=item.get("audio_format", "webm")
                    )
                )
                results.append({
                    "question_number": item["question_number"],
                    "success": result["success"],
                    "transcript": result.get("transcript", ""),
                    "duration": result.get("duration", 0.0),
                    "error": result.get("error")
                })
        finally:
            loop.close()
        
        successful = sum(1 for r in results if r["success"])
        logger.info(f"Batch transcription complete: {successful}/{len(results)} successful")
        
        return {
            "status": "success",
            "session_id": session_id,
            "total": len(results),
            "successful": successful,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in batch transcription: {str(e)}")
        return {
            "status": "error",
            "session_id": session_id,
            "error": str(e)
        }
    finally:
        db.close()


@celery_app.task(name='cleanup_old_interview_sessions')
def cleanup_old_interview_sessions(days_old: int = 30) -> Dict[str, Any]:
    """
    Periodic task to clean up old cancelled/failed interview sessions.
    Run via Celery beat scheduler.
    """
    db = SessionLocal()
    
    try:
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Find old sessions that are cancelled or failed
        old_sessions = db.query(InterviewSession).filter(
            InterviewSession.status.in_([InterviewStatus.CANCELLED, InterviewStatus.FAILED]),
            InterviewSession.created_at < cutoff_date
        ).all()
        
        count = 0
        for session in old_sessions:
            # Delete associated responses
            db.query(InterviewResponse).filter(
                InterviewResponse.session_id == session.id
            ).delete()
            
            # Delete associated feedback if exists
            db.query(InterviewFeedback).filter(
                InterviewFeedback.session_id == session.id
            ).delete()
            
            # Delete session
            db.delete(session)
            count += 1
        
        db.commit()
        logger.info(f"Cleaned up {count} old interview sessions")
        
        return {
            "status": "success",
            "cleaned_sessions": count
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up old sessions: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()
