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
    Middleware to enforce freemium usage limits on protected endpoints.
    
    All tiers (including Free) get usage-based access.
    No hard plan-gates — only usage limits enforced here.
    Cannot be bypassed from client-side.
    """
    
    # Endpoints with usage limits — maps path to usage type
    # Only POST/PUT endpoints that CONSUME a credit are listed.
    # GET endpoints (view existing data) are never limited.
    USAGE_LIMITED_ENDPOINTS = {
        # Resume creation/upload — consumes resume_edits
        "/api/v1/resumes/upload": "resume_edits",
        "/api/v1/resumes/": "resume_edits",  # POST to create
        # Resume analysis — consumes resume_analyses
        "/api/v1/resumes/analyze": "resume_analyses",
        "/api/v1/ats/score": "resume_analyses",
        "/api/v1/ats/analyze": "resume_analyses",
        # Interviews — consumes interviews
        "/api/v1/interview/start": "interviews",
        "/api/v1/interview/session": "interviews",
        "/api/v1/livekit/start-interview": "interviews",
    }
    
    # Methods that consume credits (only write operations)
    CREDIT_CONSUMING_METHODS = {"POST", "PUT"}
    
    async def dispatch(self, request: Request, call_next):
        """Check usage limits before allowing protected endpoints."""
        path = request.url.path
        method = request.method
        
        # Only check credit-consuming methods
        if method not in self.CREDIT_CONSUMING_METHODS:
            return await call_next(request)
        
        # Find matching usage-limited endpoint
        usage_type = self._get_usage_type(path)
        if not usage_type:
            return await call_next(request)
        
        # Get user from request state (set by auth middleware)
        user_id = getattr(request.state, 'user_id', None)
        
        if not user_id:
            # Let auth middleware handle unauthenticated requests
            return await call_next(request)
        
        try:
            db = next(get_db_session())
            
            # Check if user is superadmin — skip all limits
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.is_superadmin:
                db.close()
                return await call_next(request)
            
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user_id
            ).first()
            
            if not subscription:
                # Auto-create a FREE subscription for existing users who
                # registered before the freemium system was added.
                subscription = Subscription(
                    user_id=user_id,
                    plan=SubscriptionPlan.FREE,
                    status=SubscriptionStatus.ACTIVE,
                )
                subscription.apply_plan_limits()
                db.add(subscription)
                db.commit()
                db.refresh(subscription)
            
            if subscription.status != SubscriptionStatus.ACTIVE:
                db.close()
                return self._paywall_response(
                    "Your subscription is not active. Please renew.",
                    usage_type,
                )
            
            # Check specific usage limits
            if usage_type == "resume_edits" and not subscription.can_use_resume_edit():
                db.close()
                return self._paywall_response(
                    f"You've used all {subscription.resume_edits_limit} resume upload(s) on your {subscription.plan.value} plan. Upgrade for more.",
                    usage_type,
                )
            elif usage_type == "resume_analyses" and not subscription.can_use_analysis():
                db.close()
                return self._paywall_response(
                    f"You've used all {subscription.resume_analyses_limit} resume analysis/analyses on your {subscription.plan.value} plan. Upgrade for more.",
                    usage_type,
                )
            elif usage_type == "interviews" and not subscription.can_use_interview():
                db.close()
                return self._paywall_response(
                    f"You've used all {subscription.interviews_limit} interview(s) on your {subscription.plan.value} plan. Upgrade for more.",
                    usage_type,
                )
            
            db.close()
            
        except Exception as e:
            logger.error(f"Paywall check error: {e}")
            # Fail open for errors to avoid blocking legitimate requests
        
        return await call_next(request)
    
    def _get_usage_type(self, path: str) -> Optional[str]:
        """Find matching usage type for a path (supports prefix matching)."""
        # Exact match first
        if path in self.USAGE_LIMITED_ENDPOINTS:
            return self.USAGE_LIMITED_ENDPOINTS[path]
        # Prefix match for paths like /api/v1/resumes/{id}/...
        for endpoint, utype in self.USAGE_LIMITED_ENDPOINTS.items():
            if path.startswith(endpoint):
                return utype
        return None
    
    def _paywall_response(self, message: str, usage_type: str = "") -> JSONResponse:
        """Generate paywall error response with upgrade prompt."""
        return JSONResponse(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            content={
                "error": "usage_limit_reached",
                "message": message,
                "usage_type": usage_type,
                "upgrade_url": "/pricing",
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
