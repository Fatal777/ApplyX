"""
Payment Audit Model
===================
Comprehensive audit logging for all payment transactions.
Designed for high concurrency (1000+ concurrent payments) and compliance.

Features:
- Immutable audit trail
- Gateway response storage
- IP/device tracking
- Transaction categorization
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Text, JSON, Index
)
from sqlalchemy.sql import func

from app.db.database import Base


class AuditAction(str, Enum):
    """Types of auditable payment actions."""
    ORDER_CREATED = "order_created"
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_VERIFIED = "payment_verified"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_REFUNDED = "payment_refunded"
    SUBSCRIPTION_ACTIVATED = "subscription_activated"
    SUBSCRIPTION_RENEWED = "subscription_renewed"
    SUBSCRIPTION_CANCELLED = "subscription_cancelled"
    SUBSCRIPTION_EXPIRED = "subscription_expired"
    WEBHOOK_RECEIVED = "webhook_received"
    GATEWAY_ERROR = "gateway_error"


class PaymentAudit(Base):
    """
    Immutable payment audit log.
    
    Designed for high concurrency with:
    - Row-level insert only (no updates)
    - Optimized indexes for common queries
    - JSON storage for flexible gateway data
    """
    __tablename__ = "payment_audits"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User and payment references
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="SET NULL"), nullable=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    
    # Action details
    action = Column(String(50), nullable=False, index=True)
    
    # Gateway information
    gateway = Column(String(20), default="razorpay", nullable=False)  # razorpay, cashfree, paypal
    gateway_order_id = Column(String(255), nullable=True, index=True)
    gateway_payment_id = Column(String(255), nullable=True, index=True)
    gateway_response = Column(JSON, nullable=True)  # Full gateway response for debugging
    
    # Amount tracking
    amount = Column(Integer, nullable=True)  # In paise
    currency = Column(String(3), default="INR", nullable=False)
    
    # Request context
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)
    device_fingerprint = Column(String(255), nullable=True)
    
    # Result
    success = Column(Integer, default=1, nullable=False)  # 1=success, 0=failure
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Extra context data
    extra_data = Column(JSON, nullable=True)  # Additional context (renamed from metadata)
    
    # Timestamp (immutable)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    # Optimized indexes for common queries
    __table_args__ = (
        # Query: Get all audits for a user (for history)
        Index("ix_payment_audits_user_date", "user_id", "created_at"),
        # Query: Get all audits for an order (for debugging)
        Index("ix_payment_audits_order", "gateway_order_id"),
        # Query: Get recent errors (for monitoring)
        Index("ix_payment_audits_errors", "success", "created_at"),
        # Query: Get audits by action type (for analytics)
        Index("ix_payment_audits_action_date", "action", "created_at"),
    )
    
    @classmethod
    def log_action(
        cls,
        db,
        action: str,
        user_id: Optional[int] = None,
        payment_id: Optional[int] = None,
        subscription_id: Optional[int] = None,
        gateway: str = "razorpay",
        gateway_order_id: Optional[str] = None,
        gateway_payment_id: Optional[str] = None,
        gateway_response: Optional[Dict[str, Any]] = None,
        amount: Optional[int] = None,
        currency: str = "INR",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> "PaymentAudit":
        """
        Log a payment audit entry.
        
        This is designed for high concurrency - it only inserts,
        never updates, allowing for parallel writes.
        """
        audit = cls(
            user_id=user_id,
            payment_id=payment_id,
            subscription_id=subscription_id,
            action=action,
            gateway=gateway,
            gateway_order_id=gateway_order_id,
            gateway_payment_id=gateway_payment_id,
            gateway_response=gateway_response,
            amount=amount,
            currency=currency,
            ip_address=ip_address,
            user_agent=user_agent,
            success=1 if success else 0,
            error_code=error_code,
            error_message=error_message,
            extra_data=extra_data,
        )
        db.add(audit)
        # Commit immediately for audit trail integrity
        db.commit()
        return audit
    
    def to_dict(self) -> dict:
        """Convert to API response dict."""
        return {
            "id": self.id,
            "action": self.action,
            "gateway": self.gateway,
            "gateway_order_id": self.gateway_order_id,
            "gateway_payment_id": self.gateway_payment_id,
            "amount": self.amount / 100 if self.amount else None,  # Convert to rupees
            "currency": self.currency,
            "success": bool(self.success),
            "error_code": self.error_code,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


__all__ = ["AuditAction", "PaymentAudit"]
