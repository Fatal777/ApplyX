"""
Phone Verification Models
=========================
Models for OTP-based phone verification to ensure unique phone per account.

Features:
- OTP storage with expiry
- Phone verification status
- Rate limiting support
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class PhoneVerification(Base):
    """
    OTP verification record.
    
    Stores temporary OTPs for phone verification with:
    - 5-minute expiry
    - Attempt tracking for security
    - Rate limiting support
    """
    __tablename__ = "phone_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Phone number (normalized format: +91XXXXXXXXXX)
    phone_number = Column(String(15), nullable=False, index=True)
    
    # OTP details
    otp_hash = Column(String(255), nullable=False)  # SHA256 hash of OTP
    expires_at = Column(DateTime, nullable=False)
    
    # Verification state
    verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    
    # Security tracking
    attempts = Column(Integer, default=0, nullable=False)  # Failed attempts
    max_attempts = Column(Integer, default=3, nullable=False)
    
    # User linkage (optional - set after verification)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    # Audit
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    created_at = Column(DateTime, default=func.now())
    
    # Indexes for common queries
    __table_args__ = (
        Index("ix_phone_verifications_phone_expires", "phone_number", "expires_at"),
        Index("ix_phone_verifications_user", "user_id"),
    )
    
    def is_expired(self) -> bool:
        """Check if OTP has expired."""
        return datetime.utcnow() > self.expires_at
    
    def is_locked(self) -> bool:
        """Check if too many failed attempts."""
        return self.attempts >= self.max_attempts
    
    def increment_attempts(self):
        """Record a failed verification attempt."""
        self.attempts += 1
    
    @classmethod
    def new_expiry(cls, minutes: int = 5) -> datetime:
        """Generate new expiry timestamp."""
        return datetime.utcnow() + timedelta(minutes=minutes)


class OTPRateLimit(Base):
    """
    Rate limiting for OTP requests.
    
    Tracks OTP requests per phone/IP to prevent abuse:
    - Max 3 OTPs per hour per phone
    - Max 10 OTPs per hour per IP
    """
    __tablename__ = "otp_rate_limits"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Target (phone or IP)
    identifier = Column(String(50), nullable=False, index=True)  # Phone or IP
    identifier_type = Column(String(10), nullable=False)  # "phone" or "ip"
    
    # Count tracking
    request_count = Column(Integer, default=1, nullable=False)
    window_start = Column(DateTime, default=func.now(), nullable=False)
    window_hours = Column(Integer, default=1, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index("ix_otp_rate_limits_identifier_type", "identifier", "identifier_type"),
    )
    
    def is_window_expired(self) -> bool:
        """Check if rate limit window has expired."""
        window_end = self.window_start + timedelta(hours=self.window_hours)
        return datetime.utcnow() > window_end
    
    def reset_window(self):
        """Reset rate limit window."""
        self.window_start = datetime.utcnow()
        self.request_count = 1
    
    def increment(self):
        """Increment request count in current window."""
        if self.is_window_expired():
            self.reset_window()
        else:
            self.request_count += 1


__all__ = [
    "PhoneVerification",
    "OTPRateLimit",
]
