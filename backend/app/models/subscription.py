"""
Subscription and Payment Models
===============================
Models for tracking user subscriptions and payment history with Razorpay.

Features:
- Subscription plan tracking (Free, Basic, Pro, Enterprise)
- Payment transaction history
- Usage tracking (resume edits, interviews)
- Razorpay integration fields
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, Float, 
    Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class SubscriptionPlan(str, Enum):
    """Available subscription plans."""
    FREE = "free"
    BASIC = "basic"  # ₹99/month - 10 edits, 1 interview
    PRO = "pro"  # ₹499/month - unlimited edits, 5 interviews
    PRO_PLUS = "pro_plus"  # ₹5,489/month - unlimited everything + job guarantee


class SubscriptionStatus(str, Enum):
    """Subscription status workflow."""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class PaymentStatus(str, Enum):
    """Payment status."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


# Plan limits configuration
PLAN_LIMITS = {
    SubscriptionPlan.FREE: {"resume_edits": 1, "resume_analyses": 1, "interviews": 1},
    SubscriptionPlan.BASIC: {"resume_edits": 10, "resume_analyses": 10, "interviews": 3},
    SubscriptionPlan.PRO: {"resume_edits": -1, "resume_analyses": -1, "interviews": 10},  # -1 = unlimited
    SubscriptionPlan.PRO_PLUS: {"resume_edits": -1, "resume_analyses": -1, "interviews": -1},
}




class Subscription(Base):
    """
    User subscription tracking.
    
    Tracks the user's subscription plan, status, usage limits,
    and Razorpay subscription details for recurring billing.
    """
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Plan details
    plan = Column(SQLEnum(SubscriptionPlan), default=SubscriptionPlan.FREE, nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    
    # Usage tracking
    resume_edits_used = Column(Integer, default=0, nullable=False)
    resume_edits_limit = Column(Integer, default=1, nullable=False)  # Based on plan
    resume_analyses_used = Column(Integer, default=0, nullable=False)
    resume_analyses_limit = Column(Integer, default=1, nullable=False)  # Based on plan
    interviews_used = Column(Integer, default=0, nullable=False)
    interviews_limit = Column(Integer, default=1, nullable=False)  # Based on plan
    
    # Razorpay subscription ID (for recurring)
    razorpay_subscription_id = Column(String(255), nullable=True, unique=True)
    razorpay_customer_id = Column(String(255), nullable=True)
    
    # Billing cycle
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscription")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("ix_subscriptions_plan", "plan"),
        Index("ix_subscriptions_status", "status"),
    )
    
    def is_active(self) -> bool:
        """Check if subscription is active."""
        return self.status == SubscriptionStatus.ACTIVE
    
    def is_paid(self) -> bool:
        """Check if user has a paid subscription."""
        return self.plan in (SubscriptionPlan.BASIC, SubscriptionPlan.PRO, SubscriptionPlan.PRO_PLUS)
    
    def has_interview_access(self) -> bool:
        """Check if user can access interview platform (free tier gets 1)."""
        return self.is_active() and self.can_use_interview()
    
    def can_use_resume_edit(self) -> bool:
        """Check if user can perform a resume edit."""
        if self.resume_edits_limit == -1:  # Unlimited
            return True
        return self.resume_edits_used < self.resume_edits_limit
    
    def can_use_analysis(self) -> bool:
        """Check if user can perform a resume analysis."""
        if self.resume_analyses_limit == -1:  # Unlimited
            return True
        return self.resume_analyses_used < self.resume_analyses_limit
    
    def can_use_interview(self) -> bool:
        """Check if user can access an interview."""
        if self.interviews_limit == -1:  # Unlimited
            return True
        return self.interviews_used < self.interviews_limit
    
    def use_resume_edit(self) -> bool:
        """Use one resume edit. Returns True if successful."""
        if not self.can_use_resume_edit():
            return False
        if self.resume_edits_limit != -1:
            self.resume_edits_used += 1
        return True
    
    def use_analysis(self) -> bool:
        """Use one resume analysis. Returns True if successful."""
        if not self.can_use_analysis():
            return False
        if self.resume_analyses_limit != -1:
            self.resume_analyses_used += 1
        return True
    
    def use_interview(self) -> bool:
        """Use one interview. Returns True if successful."""
        if not self.can_use_interview():
            return False
        if self.interviews_limit != -1:
            self.interviews_used += 1
        return True
    
    def reset_usage_for_new_period(self):
        """Reset usage counters for new billing period."""
        self.resume_edits_used = 0
        self.resume_analyses_used = 0
        self.interviews_used = 0
    
    def apply_plan_limits(self):
        """Apply limits based on current plan."""
        limits = PLAN_LIMITS.get(self.plan, PLAN_LIMITS[SubscriptionPlan.FREE])
        self.resume_edits_limit = limits["resume_edits"]
        self.resume_analyses_limit = limits["resume_analyses"]
        self.interviews_limit = limits["interviews"]
    
    def to_dict(self) -> dict:
        """Convert to API response dict."""
        return {
            "id": self.id,
            "plan": self.plan.value,
            "status": self.status.value,
            "current_period_start": self.current_period_start.isoformat() if self.current_period_start else None,
            "current_period_end": self.current_period_end.isoformat() if self.current_period_end else None,
            "cancel_at_period_end": self.cancel_at_period_end,
            "has_interview_access": self.has_interview_access(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def usage_dict(self) -> dict:
        """Return usage info for frontend consumption."""
        return {
            "plan": self.plan.value,
            "status": self.status.value,
            "resume_edits": {
                "used": self.resume_edits_used,
                "limit": self.resume_edits_limit,
                "remaining": max(0, self.resume_edits_limit - self.resume_edits_used) if self.resume_edits_limit != -1 else -1,
            },
            "resume_analyses": {
                "used": self.resume_analyses_used,
                "limit": self.resume_analyses_limit,
                "remaining": max(0, self.resume_analyses_limit - self.resume_analyses_used) if self.resume_analyses_limit != -1 else -1,
            },
            "interviews": {
                "used": self.interviews_used,
                "limit": self.interviews_limit,
                "remaining": max(0, self.interviews_limit - self.interviews_used) if self.interviews_limit != -1 else -1,
            },
            "is_limit_reached": {
                "resume_edits": not self.can_use_resume_edit(),
                "resume_analyses": not self.can_use_analysis(),
                "interviews": not self.can_use_interview(),
            },
            "is_paid": self.is_paid(),
        }


class Payment(Base):
    """
    Payment transaction history.
    
    Tracks all payment transactions including Razorpay order/payment IDs
    for verification and auditing.
    """
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Razorpay payment details
    razorpay_order_id = Column(String(255), nullable=True, index=True)
    razorpay_payment_id = Column(String(255), nullable=True, unique=True)
    razorpay_signature = Column(String(500), nullable=True)
    
    # Payment details
    amount = Column(Float, nullable=False)  # Amount in rupees
    currency = Column(String(3), default="INR", nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    
    # Metadata
    description = Column(String(500), nullable=True)
    receipt_id = Column(String(100), nullable=True)
    plan_purchased = Column(SQLEnum(SubscriptionPlan), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    paid_at = Column(DateTime, nullable=True)
    
    # Relationships
    subscription = relationship("Subscription", back_populates="payments")
    
    # Indexes
    __table_args__ = (
        Index("ix_payments_user_id", "user_id"),
        Index("ix_payments_status", "status"),
    )
    
    def to_dict(self) -> dict:
        """Convert to API response dict."""
        return {
            "id": self.id,
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status.value,
            "description": self.description,
            "plan_purchased": self.plan_purchased.value if self.plan_purchased else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }


__all__ = [
    "SubscriptionPlan",
    "SubscriptionStatus",
    "PaymentStatus",
    "Subscription",
    "Payment",
]
