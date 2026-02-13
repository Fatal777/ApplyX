"""
LiveKit Configuration
Handles LiveKit Cloud connection and token generation for real-time interview sessions
"""

from __future__ import annotations

import logging
from datetime import timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from livekit.api import AccessToken, VideoGrants  # livekit-api>=1.0
    _HAS_LIVEKIT = True
except ImportError:
    try:
        from livekit import api as _lk_api  # fallback: livekit>=0.18
        AccessToken = _lk_api.AccessToken
        VideoGrants = _lk_api.VideoGrants
        _HAS_LIVEKIT = True
    except (ImportError, AttributeError):
        _HAS_LIVEKIT = False
        logger.warning("livekit-api is not installed — LiveKit features disabled")

# LiveKit Cloud configuration from settings
LIVEKIT_URL = settings.LIVEKIT_URL or ""
LIVEKIT_API_KEY = settings.LIVEKIT_API_KEY or ""
LIVEKIT_API_SECRET = settings.LIVEKIT_API_SECRET or ""


def is_livekit_configured() -> bool:
    """Check if LiveKit is properly configured"""
    return bool(_HAS_LIVEKIT and LIVEKIT_URL and LIVEKIT_API_KEY and LIVEKIT_API_SECRET)


def generate_room_token(
    room_name: str,
    participant_identity: str,
    participant_name: str = "",
    ttl_hours: int = 2
) -> str:
    """
    Generate a LiveKit room access token for a participant
    
    Args:
        room_name: Unique room identifier (e.g., interview session ID)
        participant_identity: Unique participant ID (e.g., user ID)
        participant_name: Display name for the participant
        ttl_hours: Token validity in hours
    
    Returns:
        JWT token string for LiveKit room access
    """
    if not is_livekit_configured():
        raise ValueError("LiveKit is not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET")
    
    token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token.with_identity(participant_identity)
    token.with_name(participant_name or participant_identity)
    token.with_ttl(timedelta(hours=ttl_hours))
    
    # Grant permissions for the room
    token.with_grants(VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
    ))
    
    return token.to_jwt()


def generate_agent_token(
    room_name: str,
    agent_identity: str = "ai-interviewer"
) -> str:
    """
    Generate a token for the AI interviewer agent
    
    Args:
        room_name: Room to join
        agent_identity: Agent identifier
    
    Returns:
        JWT token for the agent
    """
    if not is_livekit_configured():
        raise ValueError("LiveKit is not configured")
    
    token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token.with_identity(agent_identity)
    token.with_name("AI Interviewer")
    token.with_ttl(timedelta(hours=4))
    
    token.with_grants(VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
        agent=True,  # Mark as agent
    ))
    
    return token.to_jwt()
