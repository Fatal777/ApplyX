"""
Job Application and Credits Models
===================================
Models for tracking job applications, user credits, and resume versions.

Features:
- Application tracking with status workflow
- Daily credit system for resume customization
- Resume versions per job application
"""

from __future__ import annotations

from datetime import datetime, date
from enum import Enum
from typing import Optional, List

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, Date,
    ForeignKey, Enum as SQLEnum, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class ApplicationStatus(str, Enum):
    """Job application status workflow."""
    SAVED = "saved"           # Bookmarked, not applied yet
    APPLIED = "applied"       # Application submitted
    SCREENING = "screening"   # Initial screening/phone screen
    INTERVIEW = "interview"   # Interview scheduled/completed
    OFFER = "offer"           # Received offer
    REJECTED = "rejected"     # Application rejected
    WITHDRAWN = "withdrawn"   # User withdrew application


class JobApplication(Base):
    """
    Tracks job applications with status and match scoring.
    
    Features:
    - Links to user and optionally to a resume version
    - Stores job details for offline access
    - Tracks match score and status changes
    """
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    
    # Job details (stored for offline access & history)
    job_external_id = Column(String(255), nullable=False)  # External job ID from source
    job_title = Column(String(500), nullable=False)
    company = Column(String(255), nullable=False)
    company_logo = Column(String(1000), nullable=True)
    location = Column(String(255), nullable=True)
    job_url = Column(String(2000), nullable=False)  # Redirect URL
    job_portal = Column(String(50), nullable=False)  # Source: indeed, glassdoor, etc.
    job_type = Column(String(50), nullable=True)  # full-time, part-time, contract
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    is_remote = Column(Boolean, default=False)
    job_description = Column(Text, nullable=True)  # Cached JD for matching
    
    # Match scoring
    match_score = Column(Float, nullable=True)  # 0-100 overall score
    match_breakdown = Column(JSON, nullable=True)  # Detailed scoring breakdown
    matched_skills = Column(JSON, nullable=True)  # List of matched skills
    missing_skills = Column(JSON, nullable=True)  # List of missing skills
    
    # Application status
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.SAVED, nullable=False)
    applied_at = Column(DateTime, nullable=True)  # When user clicked Apply
    status_updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # User notes
    notes = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    customized_resume = relationship("CustomizedResume", back_populates="application", uselist=False)
    
    # Indexes for fast queries
    __table_args__ = (
        Index("ix_job_applications_user_status", "user_id", "status"),
        Index("ix_job_applications_user_created", "user_id", "created_at"),
        UniqueConstraint("user_id", "job_external_id", "job_portal", name="uq_user_job"),
    )
    
    def to_dict(self) -> dict:
        """Convert to API response dict."""
        return {
            "id": self.id,
            "job_external_id": self.job_external_id,
            "job_title": self.job_title,
            "company": self.company,
            "company_logo": self.company_logo,
            "location": self.location,
            "job_url": self.job_url,
            "job_portal": self.job_portal,
            "job_type": self.job_type,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "is_remote": self.is_remote,
            "match_score": self.match_score,
            "match_breakdown": self.match_breakdown,
            "matched_skills": self.matched_skills or [],
            "missing_skills": self.missing_skills or [],
            "status": self.status.value if self.status else None,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "notes": self.notes,
            "is_favorite": self.is_favorite,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "has_customized_resume": self.customized_resume is not None,
        }


class CustomizedResume(Base):
    """
    Stores AI-customized resume versions for specific job applications.
    
    Each customization uses 1 credit and creates a tailored resume
    based on the job description.
    """
    __tablename__ = "customized_resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Version tracking
    version_number = Column(Integer, default=1, nullable=False)
    
    # Resume content (JSON format)
    original_content = Column(JSON, nullable=True)  # Original resume parsed data
    customized_content = Column(JSON, nullable=True)  # AI-improved content
    
    # Changes made during customization
    changes_made = Column(JSON, nullable=True)  # List of changes applied
    
    # Target job info
    target_job_title = Column(String(500), nullable=True)
    target_company = Column(String(255), nullable=True)
    
    # Section ordering (user can reorder)
    section_order = Column(JSON, nullable=True)  # ["summary", "skills", "experience", ...]
    
    # Scoring before/after
    original_score = Column(Float, nullable=True)
    improved_score = Column(Float, nullable=True)
    
    # Detailed changes
    skills_added = Column(JSON, nullable=True)
    keywords_added = Column(JSON, nullable=True)
    
    # File storage
    pdf_path = Column(String(500), nullable=True)
    docx_path = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    application = relationship("JobApplication", back_populates="customized_resume")
    user = relationship("User", back_populates="customized_resumes")
    resume = relationship("Resume", back_populates="customized_versions")
    
    # Index for fast version lookups
    __table_args__ = (
        Index("ix_customized_resumes_user_resume", "user_id", "resume_id"),
    )
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "application_id": self.application_id,
            "version_number": self.version_number,
            "target_job_title": self.target_job_title,
            "target_company": self.target_company,
            "original_score": self.original_score,
            "improved_score": self.improved_score,
            "section_order": self.section_order,
            "changes_made": self.changes_made or [],
            "skills_added": self.skills_added or [],
            "keywords_added": self.keywords_added or [],
            "has_pdf": bool(self.pdf_path),
            "has_docx": bool(self.docx_path),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class UserCredits(Base):
    """
    Tracks user credits for resume customization.
    
    Credit System:
    - Free tier: 3 credits per day (resets at midnight UTC)
    - Premium: 20 credits per day or unlimited
    - Each resume customization costs 1 credit
    """
    __tablename__ = "user_credits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Credit balance
    daily_credits_remaining = Column(Integer, default=3, nullable=False)
    daily_credits_max = Column(Integer, default=3, nullable=False)  # Max per day (3 free, 20 premium)
    bonus_credits = Column(Integer, default=0, nullable=False)  # Non-expiring bonus credits
    
    # Subscription tier
    tier = Column(String(20), default="free", nullable=False)  # free, premium, unlimited
    
    # Reset tracking
    last_reset_date = Column(Date, default=date.today, nullable=False)
    
    # Usage stats
    total_credits_used = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="credits")
    usage_history = relationship("CreditUsage", back_populates="user_credits", cascade="all, delete-orphan")
    
    def get_available_credits(self) -> int:
        """Get total available credits (daily + bonus)."""
        return self.daily_credits_remaining + self.bonus_credits
    
    def can_use_credit(self) -> bool:
        """Check if user can use a credit."""
        if self.tier == "unlimited":
            return True
        return self.get_available_credits() > 0
    
    def use_credit(self) -> bool:
        """
        Use one credit. Returns True if successful.
        Uses bonus credits first, then daily credits.
        """
        if self.tier == "unlimited":
            self.total_credits_used += 1
            return True
        
        if self.bonus_credits > 0:
            self.bonus_credits -= 1
            self.total_credits_used += 1
            return True
        
        if self.daily_credits_remaining > 0:
            self.daily_credits_remaining -= 1
            self.total_credits_used += 1
            return True
        
        return False
    
    def reset_daily_credits(self) -> None:
        """Reset daily credits (called at midnight UTC)."""
        today = date.today()
        if self.last_reset_date < today:
            self.daily_credits_remaining = self.daily_credits_max
            self.last_reset_date = today
    
    def to_dict(self) -> dict:
        return {
            "daily_credits_remaining": self.daily_credits_remaining,
            "daily_credits_max": self.daily_credits_max,
            "bonus_credits": self.bonus_credits,
            "total_available": self.get_available_credits(),
            "tier": self.tier,
            "total_credits_used": self.total_credits_used,
            "last_reset_date": self.last_reset_date.isoformat() if self.last_reset_date else None,
        }


class CreditUsage(Base):
    """
    Tracks credit usage history for auditing and analytics.
    """
    __tablename__ = "credit_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_credits_id = Column(Integer, ForeignKey("user_credits.id", ondelete="CASCADE"), nullable=False)
    
    # Usage details
    action = Column(String(50), nullable=False)  # resume_customization, etc.
    credits_used = Column(Integer, default=1, nullable=False)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True)
    
    # Context
    description = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user_credits = relationship("UserCredits", back_populates="usage_history")
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "action": self.action,
            "credits_used": self.credits_used,
            "application_id": self.application_id,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


__all__ = [
    "ApplicationStatus",
    "JobApplication",
    "CustomizedResume",
    "UserCredits",
    "CreditUsage",
]
