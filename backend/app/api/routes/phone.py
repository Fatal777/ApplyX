"""
Phone Verification API Routes
=============================
Endpoints for OTP-based phone verification.

Features:
- Send OTP to phone
- Verify OTP and link to account
- Check if phone exists
- Rate limited to prevent abuse
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
import re

from app.db.database import get_db
from app.api.dependencies import get_current_user, get_current_active_user
from app.services.otp_service import get_otp_service, OTPService
from app.models.user import User
from app.middleware.security import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/phone", tags=["Phone Verification"])


# ============== Request/Response Models ==============

class SendOTPRequest(BaseModel):
    """Request to send OTP."""
    phone: str = Field(..., description="Phone number (10 digits)")
    
    @validator("phone")
    def validate_phone(cls, v):
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', v)
        if len(digits) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return v


class VerifyOTPRequest(BaseModel):
    """Request to verify OTP."""
    verification_id: int = Field(..., description="Verification ID from send-otp")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")
    
    @validator("otp")
    def validate_otp(cls, v):
        if not v.isdigit():
            raise ValueError("OTP must be numeric")
        return v


class CheckPhoneRequest(BaseModel):
    """Request to check if phone exists."""
    phone: str = Field(..., description="Phone number to check")


# ============== API Endpoints ==============

@router.post("/send-otp")
@limiter.limit("3/hour")  # Strict rate limit
async def send_otp(
    request: Request,
    data: SendOTPRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Send OTP to phone number for verification.
    
    Rate limited to 3 requests per hour per user.
    OTP expires in 5 minutes.
    """
    # Get client IP
    ip_address = request.client.host if request.client else None
    
    service = get_otp_service(db)
    
    result = await service.send_otp(data.phone, ip_address)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to send OTP")
        )
    
    logger.info(f"OTP sent for user {current_user.id}")
    
    return {
        "success": True,
        "verification_id": result["verification_id"],
        "expires_in": result["expires_in"],
        "message": "OTP sent successfully"
    }


@router.post("/verify-otp")
@limiter.limit("10/hour")
async def verify_otp(
    request: Request,
    data: VerifyOTPRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify OTP and link phone to account.
    
    Once verified, the phone number is permanently linked to this account
    and cannot be used by another account.
    """
    service = get_otp_service(db)
    
    result = service.verify_otp(
        verification_id=data.verification_id,
        otp=data.otp,
        user_id=current_user.id
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Verification failed")
        )
    
    logger.info(f"Phone verified for user {current_user.id}")
    
    return {
        "success": True,
        "phone": result["phone"],
        "message": "Phone number verified and linked to your account"
    }


@router.get("/status")
async def get_phone_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's phone verification status.
    """
    return {
        "phone": current_user.phone_number,
        "verified": current_user.phone_verified,
        "masked_phone": (
            f"+91****{current_user.phone_number[-4:]}" 
            if current_user.phone_number and len(current_user.phone_number) > 4 
            else None
        )
    }


@router.post("/check")
async def check_phone_exists(
    data: CheckPhoneRequest,
    db: Session = Depends(get_db)
):
    """
    Check if a phone number is already registered.
    
    This is a public endpoint (doesn't require auth) for checking
    before signup.
    """
    service = get_otp_service(db)
    result = service.check_phone_exists(data.phone)
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return {
        "exists": result["exists"],
        "message": "Phone already registered" if result["exists"] else "Phone available"
    }


@router.delete("/unlink")
async def unlink_phone(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Unlink phone number from account.
    
    This removes the phone verification, allowing the number to be
    used by another account.
    """
    if not current_user.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No phone number linked to this account"
        )
    
    old_phone = current_user.phone_number
    current_user.phone_number = None
    current_user.phone_verified = False
    db.commit()
    
    logger.info(f"Phone unlinked for user {current_user.id}")
    
    return {
        "success": True,
        "message": "Phone number unlinked from your account"
    }
