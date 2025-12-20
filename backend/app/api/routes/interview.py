"""Interview Platform API Routes"""

import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.interview import (
    InterviewSession, 
    InterviewQuestion,
    InterviewResponse,
    InterviewFeedback,
    InterviewType,
    InterviewStatus,
    DifficultyLevel,
)
from app.schemas.interview import (
    StartInterviewRequest,
    StartInterviewResponse,
    TranscribeRequest,
    TranscribeResponse,
    RespondRequest,
    RespondResponse,
    AnalyzeRequest,
    InterviewStatusResponse,
    InterviewSessionResponse,
    InterviewFeedbackResponse,
    InterviewPersona,
)
from app.api.dependencies import get_current_active_user
from app.services.speech_service import speech_service
from app.services.interview_ai_service import interview_ai_service
from app.services.razorpay_service import get_razorpay_service
from app.middleware.security import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview", tags=["Interview"])


# ============== Subscription Check Dependency ==============

async def require_interview_subscription(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Require active Pro/Enterprise subscription for interview features.
    
    Raises 402 Payment Required if user has free plan.
    """
    service = get_razorpay_service(db)
    access = service.check_interview_access(current_user.id)
    
    if not access.get("allowed"):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": access.get("error", "subscription_required"),
                "message": access.get("message", "A Pro or Enterprise subscription is required to access the AI Interview Platform"),
                "upgrade_url": access.get("upgrade_url", "/pricing"),
                "current_plan": access.get("current_plan", "free")
            }
        )
    
    return current_user


# ============== API Endpoints ==============

@router.get("/health")
async def interview_health_check():
    """Check health of interview services"""
    speech_health = await speech_service.health_check()
    ai_health = await interview_ai_service.health_check()
    
    return {
        "status": "healthy" if (speech_health.get("stt_available") and ai_health.get("available")) else "degraded",
        "speech_service": speech_health,
        "ai_service": ai_health
    }


@router.post("/start", response_model=StartInterviewResponse)
@limiter.limit("10/minute")  # Rate limit session creation
async def start_interview(
    request: Request,  # Starlette Request - required by rate limiter
    interview_request: StartInterviewRequest,  # Pydantic request body
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_interview_subscription),  # Requires subscription
    db: Session = Depends(get_db)
):
    """
    Start a new interview session.
    
    **Requires Pro or Enterprise subscription.**
    
    Generates questions based on interview type and optional resume/job context.
    Returns the first question with optional audio greeting.
    """
    try:
        # Get resume text if provided
        resume_text = None
        if interview_request.resume_id:
            from app.models.resume import Resume
            resume = db.query(Resume).filter(
                Resume.id == interview_request.resume_id,
                Resume.user_id == current_user.id
            ).first()
            if resume:
                resume_text = resume.extracted_text
        
        # Generate interview questions
        questions = await interview_ai_service.generate_questions(
            interview_type=interview_request.interview_type,
            resume_text=resume_text,
            job_description=interview_request.job_description,
            job_role=interview_request.job_role,
            num_questions=interview_request.num_questions,
            difficulty=interview_request.difficulty
        )
        
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate interview questions"
            )
        
        # Create session config
        config = {
            "difficulty": interview_request.difficulty.value,
            "persona": interview_request.persona.value,
            "job_role": interview_request.job_role,
            "job_description": interview_request.job_description[:500] if interview_request.job_description else None,
            "questions": questions,
            "num_questions": len(questions)
        }
        
        # Create interview session
        session = InterviewSession(
            user_id=current_user.id,
            resume_id=interview_request.resume_id,
            interview_type=interview_request.interview_type,
            status=InterviewStatus.IN_PROGRESS,
            config=config
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Generate greeting with first question
        first_question = questions[0]["question"]
        greeting = f"Welcome! I'm your interviewer today. Let's get started with the first question. {first_question}"
        
        # Generate audio for greeting (optional, can fail gracefully)
        greeting_audio = None
        try:
            tts_result = await speech_service.synthesize_speech(
                text=greeting,
                voice=interview_request.persona.value
            )
            if tts_result["success"]:
                greeting_audio = tts_result["audio"]
        except Exception as e:
            logger.warning(f"Failed to generate greeting audio: {str(e)}")
        
        logger.info(f"Started interview session {session.id} for user {current_user.id}")
        
        return StartInterviewResponse(
            session_id=session.id,
            status=session.status,
            questions=questions,
            first_question=first_question,
            greeting_audio=greeting_audio
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start interview: {str(e)}"
        )


@router.post("/transcribe", response_model=TranscribeResponse)
@limiter.limit("30/minute")  # Rate limit transcription requests
async def transcribe_audio(
    http_request: Request,
    request: TranscribeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Transcribe user's audio response using Whisper.
    """
    # Verify session belongs to user
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    if session.status != InterviewStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Interview is not in progress (status: {session.status.value})"
        )
    
    # Transcribe audio
    result = await speech_service.transcribe_audio(
        audio_data=request.audio_data,
        audio_format=request.audio_format
    )
    
    if not result["success"]:
        logger.warning(f"Transcription failed for session {session.id}: {result.get('error')}")
    
    return TranscribeResponse(
        success=result["success"],
        transcript=result.get("transcript", ""),
        duration=result.get("duration", 0.0),
        error=result.get("error")
    )


@router.post("/respond", response_model=RespondResponse)
@limiter.limit("30/minute")  # Rate limit AI responses
async def get_interviewer_response(
    http_request: Request,
    request: RespondRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get AI interviewer response after user answers.
    Saves the user's response and generates next question or follow-up.
    """
    # Verify session
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    if session.status != InterviewStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview is not in progress"
        )
    
    config = session.config or {}
    questions = config.get("questions", [])
    current_q_idx = request.question_number - 1
    
    if current_q_idx < 0 or current_q_idx >= len(questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid question number"
        )
    
    current_question = questions[current_q_idx]
    next_question = questions[current_q_idx + 1] if current_q_idx + 1 < len(questions) else None
    
    # Get conversation history
    previous_responses = db.query(InterviewResponse).filter(
        InterviewResponse.session_id == session.id
    ).order_by(InterviewResponse.question_number).all()
    
    conversation_history = []
    for resp in previous_responses[-3:]:  # Last 3 exchanges
        conversation_history.append({"role": "assistant", "content": resp.question_text})
        conversation_history.append({"role": "user", "content": resp.transcript})
    
    # Generate AI response
    ai_response = await interview_ai_service.generate_response(
        user_transcript=request.transcript,
        conversation_history=conversation_history,
        current_question=current_question["question"],
        next_question=next_question["question"] if next_question else None,
        persona=InterviewPersona(config.get("persona", "professional"))
    )
    
    # Analyze the response asynchronously
    analysis = await interview_ai_service.analyze_response(
        question=current_question["question"],
        user_transcript=request.transcript,
        expected_skills=current_question.get("expected_skills", []),
        evaluation_criteria=current_question.get("evaluation_criteria", [])
    )
    
    # Save the response
    interview_response = InterviewResponse(
        session_id=session.id,
        question_number=request.question_number,
        question_text=current_question["question"],
        transcript=request.transcript,
        audio_duration=0.0,  # Could be passed from frontend
        ai_analysis=analysis,
        scores=analysis.get("scores", {})
    )
    db.add(interview_response)
    db.commit()
    
    # Generate TTS for response
    audio_data = None
    try:
        tts_result = await speech_service.synthesize_speech(
            text=ai_response["response"],
            voice=config.get("persona", "professional")
        )
        if tts_result["success"]:
            audio_data = tts_result["audio"]
    except Exception as e:
        logger.warning(f"Failed to generate response audio: {str(e)}")
    
    # Determine next question number
    next_q_num = request.question_number
    if ai_response.get("transition_to_next") and next_question:
        next_q_num = request.question_number + 1
    
    return RespondResponse(
        response_text=ai_response["response"],
        audio_data=audio_data,
        next_question=next_question["question"] if next_question and ai_response.get("transition_to_next") else None,
        is_follow_up=ai_response.get("should_follow_up", False),
        is_conclusion=ai_response.get("is_conclusion", False),
        question_number=next_q_num
    )


@router.post("/analyze")
@limiter.limit("5/minute")  # Rate limit AI analysis
async def analyze_interview(
    request: AnalyzeRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Complete the interview and generate comprehensive feedback.
    This triggers async analysis of all responses.
    """
    # Verify session
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    # Get all responses
    responses = db.query(InterviewResponse).filter(
        InterviewResponse.session_id == session.id
    ).order_by(InterviewResponse.question_number).all()
    
    if not responses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No responses found for this interview"
        )
    
    # Prepare data for analysis
    response_data = [
        {"question": r.question_text, "transcript": r.transcript}
        for r in responses
    ]
    analysis_data = [r.ai_analysis or {} for r in responses]
    
    config = session.config or {}
    
    # Generate final feedback
    try:
        feedback_data = await interview_ai_service.generate_final_feedback(
            interview_type=session.interview_type,
            job_role=config.get("job_role"),
            responses=response_data,
            response_analyses=analysis_data
        )
        
        # Save feedback
        feedback = InterviewFeedback(
            session_id=session.id,
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
        db.commit()
        db.refresh(feedback)
        
        logger.info(f"Interview {session.id} completed with score {feedback.overall_score}")
        
        return {
            "success": True,
            "session_id": session.id,
            "feedback_id": feedback.id,
            "overall_score": feedback.overall_score,
            "message": "Interview completed. Feedback is ready."
        }
        
    except Exception as e:
        logger.error(f"Error analyzing interview: {str(e)}")
        session.status = InterviewStatus.FAILED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate feedback: {str(e)}"
        )


@router.get("/feedback/{session_id}", response_model=InterviewFeedbackResponse)
async def get_interview_feedback(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get feedback for a completed interview session.
    """
    # Verify session belongs to user
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    if session.status != InterviewStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Interview is not completed (status: {session.status.value})"
        )
    
    # Get feedback
    feedback = db.query(InterviewFeedback).filter(
        InterviewFeedback.session_id == session_id
    ).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found for this session"
        )
    
    return InterviewFeedbackResponse(
        id=feedback.id,
        session_id=feedback.session_id,
        overall_score=feedback.overall_score,
        category_scores=feedback.category_scores,
        strengths=feedback.strengths,
        improvements=feedback.improvements,
        detailed_feedback=feedback.detailed_feedback,
        recommendations=feedback.recommendations,
        generated_at=feedback.generated_at
    )


@router.get("/sessions", response_model=List[InterviewSessionResponse])
async def list_interview_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """
    List user's interview sessions.
    """
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        InterviewSessionResponse(
            id=s.id,
            user_id=s.user_id,
            resume_id=s.resume_id,
            interview_type=s.interview_type,
            status=s.status,
            config=s.config,
            created_at=s.created_at,
            completed_at=s.completed_at
        )
        for s in sessions
    ]


@router.get("/session/{session_id}/status", response_model=InterviewStatusResponse)
async def get_session_status(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current status of an interview session.
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    responses_count = db.query(InterviewResponse).filter(
        InterviewResponse.session_id == session_id
    ).count()
    
    config = session.config or {}
    total_questions = config.get("num_questions", len(config.get("questions", [])))
    
    feedback_exists = db.query(InterviewFeedback).filter(
        InterviewFeedback.session_id == session_id
    ).first() is not None
    
    return InterviewStatusResponse(
        session_id=session.id,
        status=session.status,
        current_question=responses_count + 1,
        total_questions=total_questions,
        responses_count=responses_count,
        feedback_ready=feedback_exists
    )


@router.delete("/session/{session_id}")
async def cancel_interview(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an in-progress interview session.
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    if session.status not in [InterviewStatus.SCHEDULED, InterviewStatus.IN_PROGRESS]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a completed or failed interview"
        )
    
    session.status = InterviewStatus.CANCELLED
    db.commit()
    
    return {"success": True, "message": "Interview cancelled"}


@router.get("/voices")
async def get_available_voices():
    """
    Get available voice options for TTS.
    """
    voices = await speech_service.get_voice_options()
    return {"voices": voices}
