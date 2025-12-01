"""User Profile API Routes"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserProfileUpdate, UserProfileResponse
from app.api.dependencies import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/user", tags=["User Profile"])


def calculate_profile_completion(user: User) -> tuple[int, list[str]]:
    """Calculate profile completion percentage and missing fields"""
    fields = {
        'full_name': ('Full Name', user.full_name),
        'email': ('Email', user.email),
        'phone_number': ('Phone Number', user.phone_number),
    }
    
    total_fields = len(fields)
    completed = sum(1 for _, value in fields.values() if value)
    missing = [label for field, (label, value) in fields.items() if not value]
    
    percentage = int((completed / total_fields) * 100)
    return percentage, missing


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile information.
    Includes completion percentage and missing fields.
    """
    completion_pct, missing_fields = calculate_profile_completion(current_user)
    
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone_number=current_user.phone_number,
        profile_completed=current_user.profile_completed or False,
        contact_source=current_user.contact_source,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        completion_percentage=completion_pct,
        missing_fields=missing_fields
    )


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile information.
    This is the primary endpoint for users to complete their profile.
    """
    update_data = profile_data.model_dump(exclude_unset=True)
    
    # Update fields
    for field, value in update_data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    
    # Mark contact source as manual if user is updating
    if update_data:
        current_user.contact_source = 'manual'
    
    # Check if profile is now complete
    current_user.profile_completed = current_user.is_profile_complete
    
    db.commit()
    db.refresh(current_user)
    
    completion_pct, missing_fields = calculate_profile_completion(current_user)
    
    logger.info(f"User {current_user.id} updated profile. Completion: {completion_pct}%")
    
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone_number=current_user.phone_number,
        profile_completed=current_user.profile_completed or False,
        contact_source=current_user.contact_source,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        completion_percentage=completion_pct,
        missing_fields=missing_fields
    )


@router.get("/profile/status")
async def get_profile_status(
    current_user: User = Depends(get_current_active_user)
):
    """
    Quick check for profile completion status.
    Useful for showing/hiding profile completion prompts in UI.
    """
    completion_pct, missing_fields = calculate_profile_completion(current_user)
    
    return {
        "is_complete": current_user.profile_completed or completion_pct == 100,
        "completion_percentage": completion_pct,
        "missing_fields": missing_fields,
        "needs_attention": completion_pct < 100 and len(missing_fields) > 0
    }
