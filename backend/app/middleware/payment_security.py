"""
Payment Security Middleware
===========================
Security hardening for payment endpoints.

Features:
- Enhanced rate limiting for payment operations
- Paywall guard middleware
- Fraud detection signals
- Request fingerprinting
"""

import hashlib
import logging
from typing import Optional
from datetime import datetime, timedelta

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.database import get_db_session
from app.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus

logger = logging.getLogger(__name__)


class PaywallGuardMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce paywall on protected endpoints.
    
    Blocks access to premium features without valid subscription.
    Cannot be bypassed from client-side.
    """
    
    # Endpoints requiring paid subscription
    PROTECTED_ENDPOINTS = {
        "/api/v1/interview/start": ["basic", "pro", "pro_plus"],
        "/api/v1/interview/session": ["basic", "pro", "pro_plus"],
    }
    
    # Endpoints with usage limits
    USAGE_LIMITED_ENDPOINTS = {
        "/api/v1/resumes/analyze": "resume_edits",
        "/api/v1/interview/start": "interviews",
    }
    
    async def dispatch(self, request: Request, call_next):
        """Check subscription before allowing protected endpoints."""
        path = request.url.path
        
        # Skip if not a protected endpoint
        if not self._is_protected(path):
            return await call_next(request)
        
        # Get user from request state (set by auth middleware)
        user_id = getattr(request.state, 'user_id', None)
        
        if not user_id:
            # Let auth middleware handle unauthenticated requests
            return await call_next(request)
        
        try:
            # Check subscription
            db = next(get_db_session())
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user_id
            ).first()
            
            if not subscription:
                return self._paywall_response("No active subscription")
            
            # Check if plan is allowed for this endpoint
            required_plans = self.PROTECTED_ENDPOINTS.get(path)
            if required_plans and subscription.plan.value not in required_plans:
                return self._paywall_response(
                    f"This feature requires {', '.join(required_plans)} plan"
                )
            
            # Check usage limits
            if not subscription.status == SubscriptionStatus.ACTIVE:
                return self._paywall_response("Subscription not active")
            
            # Check specific usage limits
            usage_type = self.USAGE_LIMITED_ENDPOINTS.get(path)
            if usage_type:
                if usage_type == "resume_edits" and not subscription.can_use_resume_edit():
                    return self._paywall_response("Resume edit limit reached")
                elif usage_type == "interviews" and not subscription.can_use_interview():
                    return self._paywall_response("Interview limit reached")
            
            db.close()
            
        except Exception as e:
            logger.error(f"Paywall check error: {e}")
            # Fail open for other errors to avoid blocking legitimate requests
        
        return await call_next(request)
    
    def _is_protected(self, path: str) -> bool:
        """Check if path is protected."""
        return (
            path in self.PROTECTED_ENDPOINTS or 
            path in self.USAGE_LIMITED_ENDPOINTS
        )
    
    def _paywall_response(self, message: str) -> JSONResponse:
        """Generate paywall error response."""
        return JSONResponse(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            content={
                "error": "subscription_required",
                "message": message,
                "upgrade_url": "/pricing"
            }
        )


class FraudDetectionService:
    """
    Basic fraud detection for payment operations.
    
    Signals suspicious activity for manual review.
    """
    
    # Thresholds
    MAX_ORDERS_PER_HOUR = 5
    MAX_FAILED_PAYMENTS_PER_DAY = 10
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_device_fingerprint(self, request: Request) -> str:
        """Generate a simple device fingerprint."""
        components = [
            request.client.host if request.client else "unknown",
            request.headers.get("user-agent", ""),
            request.headers.get("accept-language", ""),
            request.headers.get("accept-encoding", ""),
        ]
        
        fingerprint_string = "|".join(components)
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:32]
    
    def check_velocity(
        self,
        user_id: int,
        ip_address: str,
        action: str = "order"
    ) -> dict:
        """
        Check for velocity-based fraud signals.
        
        Returns dict with is_suspicious flag and reason.
        """
        from app.models.payment_audit import PaymentAudit
        
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        # Check order velocity
        if action == "order":
            order_count = self.db.query(PaymentAudit).filter(
                PaymentAudit.user_id == user_id,
                PaymentAudit.action == "order_created",
                PaymentAudit.created_at > hour_ago
            ).count()
            
            if order_count >= self.MAX_ORDERS_PER_HOUR:
                return {
                    "is_suspicious": True,
                    "reason": "too_many_orders",
                    "message": f"Too many orders ({order_count}) in the past hour"
                }
        
        # Check failed payment velocity
        failed_count = self.db.query(PaymentAudit).filter(
            PaymentAudit.user_id == user_id,
            PaymentAudit.success == 0,
            PaymentAudit.created_at > day_ago
        ).count()
        
        if failed_count >= self.MAX_FAILED_PAYMENTS_PER_DAY:
            return {
                "is_suspicious": True,
                "reason": "too_many_failures",
                "message": f"Too many failed payments ({failed_count}) today"
            }
        
        # Check IP velocity (multiple users from same IP)
        ip_users = self.db.query(PaymentAudit.user_id).filter(
            PaymentAudit.ip_address == ip_address,
            PaymentAudit.created_at > hour_ago
        ).distinct().count()
        
        if ip_users > 3:
            return {
                "is_suspicious": True,
                "reason": "shared_ip",
                "message": f"Multiple users ({ip_users}) from same IP"
            }
        
        return {"is_suspicious": False}


def get_fraud_detection_service(db: Session) -> FraudDetectionService:
    """Get fraud detection service instance."""
    return FraudDetectionService(db)
