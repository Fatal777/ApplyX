"""
LiveKit API Routes
Handles token generation and room management for real-time interview sessions
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.livekit_config import (
    generate_room_token,
    generate_agent_token,
    is_livekit_configured,
    LIVEKIT_URL
)
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/livekit", tags=["livekit"])


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


@router.get("/status", response_model=LiveKitStatus)
async def get_livekit_status():
    """Check if LiveKit is configured"""
    return LiveKitStatus(
        configured=is_livekit_configured(),
        url=LIVEKIT_URL if is_livekit_configured() else None
    )


@router.post("/token", response_model=TokenResponse)
async def get_room_token(
    request: TokenRequest,
    current_user = Depends(get_current_user)
):
    """
    Generate a LiveKit room access token for the current user
    
    Args:
        request: Room name and optional participant name
        current_user: Authenticated user from Supabase
    
    Returns:
        Token response with JWT and LiveKit URL
    """
    if not is_livekit_configured():
        raise HTTPException(
            status_code=503,
            detail="LiveKit is not configured on this server"
        )
    
    try:
        # Use user ID as participant identity
        participant_identity = str(current_user.id)
        participant_name = request.participant_name or current_user.email or "Candidate"
        
        token = generate_room_token(
            room_name=request.room_name,
            participant_identity=participant_identity,
            participant_name=participant_name
        )
        
        return TokenResponse(
            token=token,
            url=LIVEKIT_URL,
            room_name=request.room_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate token: {str(e)}"
        )


@router.post("/agent-token")
async def get_agent_token(room_name: str):
    """
    Generate a token for the AI interviewer agent
    This is typically called by the agent service, not the frontend
    """
    if not is_livekit_configured():
        raise HTTPException(
            status_code=503,
            detail="LiveKit is not configured"
        )
    
    try:
        token = generate_agent_token(room_name=room_name)
        return {
            "token": token,
            "url": LIVEKIT_URL,
            "room_name": room_name
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate agent token: {str(e)}"
        )
