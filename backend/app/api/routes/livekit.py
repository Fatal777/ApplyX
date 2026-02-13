"""
LiveKit API Routes (v1.3)
Handles token generation, room + agent dispatch, and interview lifecycle
for the rebuilt real-time mock-interview experience.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.api.dependencies import get_current_user
from app.core.livekit_config import (
    LIVEKIT_URL,
    generate_agent_token,
    generate_room_token,
    is_livekit_configured,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/livekit", tags=["livekit"])

# ── In-memory caches (swap for DB/Redis in production) ──────────────────────
_feedback_cache: dict[str, dict[str, Any]] = {}
_room_metadata_cache: dict[str, dict[str, Any]] = {}


# ── Request / Response schemas ──────────────────────────────────────────────


class TokenRequest(BaseModel):
    room_name: str
    participant_name: Optional[str] = None


class TokenResponse(BaseModel):
    token: str
    url: str
    room_name: str


class LiveKitStatus(BaseModel):
    configured: bool
    url: Optional[str] = None


class StartInterviewRequest(BaseModel):
    job_role: str = "Software Engineer"
    difficulty: str = "intermediate"
    persona: str = "professional"
    interview_type: str = "mixed"
    num_questions: int = 6
    resume_summary: Optional[str] = None
    job_description: Optional[str] = None


class StartInterviewResponse(BaseModel):
    token: str
    url: str
    room_name: str
    session_id: str


class EndInterviewRequest(BaseModel):
    room_name: str
    session_id: str


# ── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/status", response_model=LiveKitStatus)
async def get_livekit_status():
    """Check if LiveKit is configured."""
    return LiveKitStatus(
        configured=is_livekit_configured(),
        url=LIVEKIT_URL if is_livekit_configured() else None,
    )


@router.post("/token", response_model=TokenResponse)
async def get_room_token(
    request: TokenRequest,
    current_user=Depends(get_current_user),
):
    """Generate a LiveKit room access token for the signed-in user."""
    if not is_livekit_configured():
        raise HTTPException(status_code=503, detail="LiveKit is not configured")

    try:
        token = generate_room_token(
            room_name=request.room_name,
            participant_identity=str(current_user.id),
            participant_name=request.participant_name or current_user.email or "Candidate",
        )
        return TokenResponse(token=token, url=LIVEKIT_URL, room_name=request.room_name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Token generation failed: {exc}")


@router.post("/start-interview", response_model=StartInterviewResponse)
async def start_interview(
    request: StartInterviewRequest,
    current_user=Depends(get_current_user),
):
    """
    Create a LiveKit room with interview metadata, generate a participant
    token, and return everything the frontend needs to connect.

    The agent server auto-dispatches to newly created rooms — no explicit
    dispatch API call is needed when using LiveKit Cloud's default dispatch.
    """
    if not is_livekit_configured():
        raise HTTPException(status_code=503, detail="LiveKit is not configured")

    session_id = str(uuid.uuid4())
    room_name = f"interview-{session_id[:8]}"

    # Metadata the agent reads on entry (see interview_agent.py)
    room_metadata: dict[str, Any] = {
        "job_role": request.job_role,
        "difficulty": request.difficulty,
        "persona": request.persona,
        "interview_type": request.interview_type,
        "num_questions": request.num_questions,
        "session_id": session_id,
        "user_id": str(current_user.id),
    }
    if request.resume_summary:
        room_metadata["resume_summary"] = request.resume_summary[:2000]
    if request.job_description:
        room_metadata["job_description"] = request.job_description[:2000]

    try:
        # Create the room via LiveKit Server SDK and set metadata
        from livekit import api as lk_api

        lk = lk_api.LiveKitAPI(LIVEKIT_URL)
        await lk.room.create_room(
            lk_api.CreateRoomRequest(
                name=room_name,
                metadata=json.dumps(room_metadata),
                empty_timeout=300,  # close room 5 min after last participant leaves
                max_participants=3,  # candidate + agent + optional observer
            ),
        )
        await lk.aclose()

        # Cache metadata so end-interview can pass it to feedback generation
        _room_metadata_cache[room_name] = room_metadata

        # Generate participant token
        token = generate_room_token(
            room_name=room_name,
            participant_identity=str(current_user.id),
            participant_name=current_user.email or "Candidate",
        )

        logger.info(
            "Interview started: room=%s session=%s role=%s difficulty=%s",
            room_name,
            session_id,
            request.job_role,
            request.difficulty,
        )

        return StartInterviewResponse(
            token=token,
            url=LIVEKIT_URL,
            room_name=room_name,
            session_id=session_id,
        )

    except Exception as exc:
        logger.exception("Failed to start interview: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {exc}")


@router.post("/end-interview")
async def end_interview(
    request: EndInterviewRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    """
    Signal the backend that an interview has ended.
    Kicks off asynchronous feedback generation via the Gradient ADK agent
    and stores the result so the frontend can poll for it.
    """
    logger.info(
        "Interview ended: room=%s session=%s user=%s",
        request.room_name,
        request.session_id,
        current_user.id,
    )

    # Retrieve room metadata (job_role, difficulty, etc.) that we stored at creation
    room_meta = _room_metadata_cache.get(request.room_name, {})

    # Fire-and-forget: generate feedback in the background
    background_tasks.add_task(
        _generate_and_store_feedback,
        session_id=request.session_id,
        room_name=request.room_name,
        user_id=str(current_user.id),
        job_role=room_meta.get("job_role", "Software Engineer"),
        difficulty=room_meta.get("difficulty", "intermediate"),
    )

    return {
        "status": "ok",
        "session_id": request.session_id,
        "message": "Interview ended. Feedback generation started.",
    }


async def _generate_and_store_feedback(
    session_id: str,
    room_name: str,
    user_id: str,
    job_role: str = "Software Engineer",
    difficulty: str = "intermediate",
) -> None:
    """Background task: call the Gradient evaluation agent and cache results."""
    import traceback

    try:
        from app.services.gradient_service import gradient_service

        # For now we don't have the full transcript stored — use a summary
        # In production, store transcripts in DB via a webhook or agent data channel
        transcript_placeholder = (
            f"[Interview session {session_id} in room {room_name} for user {user_id}. "
            "Full transcript would be stored via LiveKit webhook or agent data channel.]"
        )

        raw = await gradient_service.generate_feedback(
            job_role=job_role,
            transcript=transcript_placeholder,
            difficulty=difficulty,
        )

        # Try to parse JSON from the agent response
        import json as _json

        try:
            feedback_data = _json.loads(raw)
        except _json.JSONDecodeError:
            # Agent returned non-JSON; wrap it
            feedback_data = {
                "overall_score": 70,
                "category_scores": {},
                "strengths": ["Completed the interview"],
                "improvements": ["Feedback parsing failed — raw response stored"],
                "detailed_feedback": raw[:2000],
                "recommendations": ["Try again for more detailed feedback"],
            }

        feedback_data["generated_at"] = __import__("datetime").datetime.utcnow().isoformat()
        _feedback_cache[session_id] = {"status": "ready", "feedback": feedback_data}
        logger.info("Feedback generated for session %s", session_id)

    except Exception:
        logger.exception("Feedback generation failed for session %s", session_id)
        _feedback_cache[session_id] = {
            "status": "error",
            "error": traceback.format_exc()[:500],
        }


@router.get("/feedback/{session_id}")
async def get_interview_feedback(
    session_id: str,
    current_user=Depends(get_current_user),
):
    """
    Poll for interview feedback.
    Returns status='pending' while feedback is being generated,
    status='ready' with the feedback object when done,
    or status='error' if generation failed.
    """
    entry = _feedback_cache.get(session_id)
    if entry is None:
        return {"status": "pending", "session_id": session_id}
    return {**entry, "session_id": session_id}


@router.post("/agent-token")
async def get_agent_token(room_name: str):
    """Generate a token for the AI interviewer agent (called by agent service)."""
    if not is_livekit_configured():
        raise HTTPException(status_code=503, detail="LiveKit is not configured")

    try:
        token = generate_agent_token(room_name=room_name)
        return {"token": token, "url": LIVEKIT_URL, "room_name": room_name}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agent token failed: {exc}")
