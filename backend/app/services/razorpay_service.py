"""
Razorpay Payment Service
========================
Handles all Razorpay payment operations including order creation,
payment verification, subscription management, and webhook handling.

Pricing (INR):
- Basic: ₹99/month
- Pro: ₹999/month
- Enterprise: ₹4,999/month
"""

import hmac
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.subscription import (
    Subscription, Payment, SubscriptionPlan, 
    SubscriptionStatus, PaymentStatus, PLAN_LIMITS
)
from app.models.application import UserCredits
from app.models.user import User

logger = logging.getLogger(__name__)

# Razorpay is optional - only import if available
try:
    import razorpay
    RAZORPAY_AVAILABLE = True
except ImportError:
    razorpay = None
    RAZORPAY_AVAILABLE = False
    logger.warning("Razorpay SDK not installed. Payment features will be disabled.")


class RazorpayService:
    """Service for Razorpay payment operations."""
    
    # Pricing in paise (1 rupee = 100 paise)
    PLAN_PRICES = {
        SubscriptionPlan.FREE: 0,
        SubscriptionPlan.BASIC: 99_00,  # ₹99
        SubscriptionPlan.PRO: 499_00,  # ₹499
        SubscriptionPlan.PRO_PLUS: 5489_00,  # ₹5,489
    }
    
    # Human-readable plan names
    PLAN_NAMES = {
        SubscriptionPlan.FREE: "Free",
        SubscriptionPlan.BASIC: "Basic",
        SubscriptionPlan.PRO: "Pro",
        SubscriptionPlan.PRO_PLUS: "Pro+",
    }
    
    # Resume analysis limits (based on subscription model)
    FREE_RESUME_ANALYSIS_LIMIT = 2
    
    def __init__(self, db: Session):
        self.db = db
        self.client = None
        
        if RAZORPAY_AVAILABLE and settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            self.client = razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
            )
    
    def is_available(self) -> bool:
        """Check if Razorpay is configured and available."""
        return self.client is not None
    
    def create_order(self, user_id: int, plan: SubscriptionPlan) -> Dict[str, Any]:
        """
        Create a Razorpay order for subscription purchase.
        
        Args:
            user_id: User ID purchasing subscription
            plan: Target subscription plan
            
        Returns:
            Order details for frontend Razorpay checkout
        """
        if not self.is_available():
            raise ValueError("Payment service not configured")
        
        amount = self.PLAN_PRICES.get(plan, 0)
        if amount == 0:
            raise ValueError("Cannot create order for free plan")
        
        # Get user for prefill
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Create Razorpay order
        receipt_id = f"applyx_{user_id}_{int(datetime.utcnow().timestamp())}"
        order_data = {
            "amount": amount,
            "currency": "INR",
            "receipt": receipt_id,
            "notes": {
                "user_id": str(user_id),
                "plan": plan.value,
                "user_email": user.email
            }
        }
        
        try:
            order = self.client.order.create(data=order_data)
        except Exception as e:
            logger.error(f"Failed to create Razorpay order: {e}")
            raise ValueError(f"Payment gateway error: {str(e)}")
        
        # Get or create subscription record
        subscription = self._get_or_create_subscription(user_id)
        
        # Create pending payment record
        payment = Payment(
            subscription_id=subscription.id,
            user_id=user_id,
            razorpay_order_id=order["id"],
            amount=amount / 100,  # Convert to rupees
            currency="INR",
            status=PaymentStatus.PENDING,
            description=f"Subscription upgrade to {self.PLAN_NAMES[plan]}",
            receipt_id=receipt_id,
            plan_purchased=plan,
        )
        self.db.add(payment)
        self.db.commit()
        
        logger.info(f"Created order {order['id']} for user {user_id}, plan {plan.value}")
        
        return {
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "name": "ApplyX",
            "description": f"ApplyX {self.PLAN_NAMES[plan]} Subscription",
            "prefill": {
                "email": user.email,
                "name": user.full_name or "",
                "contact": user.phone_number or "",
            },
            "theme": {
                "color": "#a3e635"  # lime-400
            }
        }
    
    def verify_payment(
        self, 
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Verify Razorpay payment signature and activate subscription.
        
        Args:
            razorpay_order_id: Razorpay order ID
            razorpay_payment_id: Razorpay payment ID
            razorpay_signature: Razorpay signature for verification
            user_id: User ID for verification
            
        Returns:
            Subscription activation result
        """
        if not self.is_available():
            raise ValueError("Payment service not configured")
        
        # Verify signature
        payload = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected_signature = hmac.new(
            key=settings.RAZORPAY_KEY_SECRET.encode(),
            msg=payload.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        if expected_signature != razorpay_signature:
            logger.warning(f"Invalid payment signature for order {razorpay_order_id}")
            raise ValueError("Invalid payment signature")
        
        # Find payment record
        payment = self.db.query(Payment).filter(
            Payment.razorpay_order_id == razorpay_order_id,
            Payment.user_id == user_id
        ).first()
        
        if not payment:
            raise ValueError("Payment not found")
        
        if payment.status == PaymentStatus.COMPLETED:
            # Already processed - return success
            return {
                "success": True,
                "plan": payment.plan_purchased.value if payment.plan_purchased else "pro",
                "already_processed": True
            }
        
        # Update payment record
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature
        payment.status = PaymentStatus.COMPLETED
        payment.paid_at = datetime.utcnow()
        
        # Activate subscription
        subscription = payment.subscription
        plan = payment.plan_purchased or SubscriptionPlan.PRO
        
        subscription.plan = plan
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.current_period_start = datetime.utcnow()
        subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
        
        # Update user credits tier
        self._update_user_tier(user_id, plan)
        
        self.db.commit()
        
        logger.info(f"Payment verified for user {user_id}, plan upgraded to {plan.value}")
        
        return {
            "success": True,
            "plan": plan.value,
            "expires_at": subscription.current_period_end.isoformat()
        }
    
    def get_subscription_status(self, user_id: int) -> Dict[str, Any]:
        """
        Get user's current subscription status.
        
        Returns comprehensive subscription and usage information.
        """
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        
        credits = self.db.query(UserCredits).filter(
            UserCredits.user_id == user_id
        ).first()
        
        # Default values for users without subscription
        plan = SubscriptionPlan.FREE
        status = SubscriptionStatus.ACTIVE
        expires_at = None
        resume_analysis_count = 0
        
        if subscription:
            plan = subscription.plan
            status = subscription.status
            expires_at = subscription.current_period_end
        
        if credits:
            resume_analysis_count = credits.resume_analysis_count
        
        is_paid = plan in (SubscriptionPlan.BASIC, SubscriptionPlan.PRO, SubscriptionPlan.PRO_PLUS)
        
        return {
            "plan": plan.value,
            "status": status.value,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "resume_analysis_count": resume_analysis_count,
            "resume_analysis_limit": self.FREE_RESUME_ANALYSIS_LIMIT,
            "resume_analysis_remaining": max(0, self.FREE_RESUME_ANALYSIS_LIMIT - resume_analysis_count) if not is_paid else -1,  # -1 = unlimited
            "can_access_interview": is_paid and status == SubscriptionStatus.ACTIVE,
            "can_analyze_resume": is_paid or resume_analysis_count < self.FREE_RESUME_ANALYSIS_LIMIT,
            "tier": credits.tier if credits else "free",
            "is_paid": is_paid,
        }
    
    def check_interview_access(self, user_id: int) -> Dict[str, Any]:
        """
        Check if user can access the interview platform.
        
        Returns:
            Dict with access status and upgrade message if needed
        """
        status = self.get_subscription_status(user_id)
        
        if status["can_access_interview"]:
            return {"allowed": True}
        
        return {
            "allowed": False,
            "error": "subscription_required",
            "message": "A Pro or Enterprise subscription is required to access the AI Interview Platform",
            "upgrade_url": "/pricing",
            "current_plan": status["plan"]
        }
    
    def check_resume_analysis_access(self, user_id: int) -> Dict[str, Any]:
        """
        Check if user can perform resume analysis and track usage.
        
        Returns:
            Dict with access status and usage info
        """
        status = self.get_subscription_status(user_id)
        
        if status["is_paid"]:
            return {"allowed": True, "unlimited": True}
        
        if status["can_analyze_resume"]:
            return {
                "allowed": True,
                "unlimited": False,
                "used": status["resume_analysis_count"],
                "limit": status["resume_analysis_limit"],
                "remaining": status["resume_analysis_remaining"]
            }
        
        return {
            "allowed": False,
            "error": "limit_reached",
            "message": f"You've used all {status['resume_analysis_limit']} free resume analyses",
            "used": status["resume_analysis_count"],
            "limit": status["resume_analysis_limit"],
            "upgrade_url": "/pricing"
        }
    
    def increment_resume_analysis_count(self, user_id: int) -> bool:
        """
        Increment the resume analysis count for a user.
        Called after successful analysis for free tier users.
        
        Returns:
            True if incremented, False if user has unlimited access
        """
        status = self.get_subscription_status(user_id)
        
        if status["is_paid"]:
            return False  # Don't track for paid users
        
        credits = self.db.query(UserCredits).filter(
            UserCredits.user_id == user_id
        ).first()
        
        if not credits:
            credits = UserCredits(user_id=user_id, resume_analysis_count=1)
            self.db.add(credits)
        else:
            credits.resume_analysis_count += 1
        
        self.db.commit()
        logger.info(f"User {user_id} resume analysis count: {credits.resume_analysis_count}")
        return True
    
    def get_payment_history(self, user_id: int, limit: int = 10) -> list:
        """Get user's payment history."""
        payments = self.db.query(Payment).filter(
            Payment.user_id == user_id
        ).order_by(Payment.created_at.desc()).limit(limit).all()
        
        return [p.to_dict() for p in payments]
    
    def _get_or_create_subscription(self, user_id: int) -> Subscription:
        """Get existing subscription or create new one."""
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        
        if not subscription:
            subscription = Subscription(
                user_id=user_id,
                plan=SubscriptionPlan.FREE,
                status=SubscriptionStatus.ACTIVE
            )
            self.db.add(subscription)
            self.db.commit()
            self.db.refresh(subscription)
        
        return subscription
    
    def _update_user_tier(self, user_id: int, plan: SubscriptionPlan):
        """Update UserCredits tier and subscription limits based on plan."""
        credits = self.db.query(UserCredits).filter(
            UserCredits.user_id == user_id
        ).first()
        
        tier_map = {
            SubscriptionPlan.FREE: "free",
            SubscriptionPlan.BASIC: "basic",
            SubscriptionPlan.PRO: "premium",
            SubscriptionPlan.PRO_PLUS: "unlimited"
        }
        
        credits_map = {
            SubscriptionPlan.FREE: 3,
            SubscriptionPlan.BASIC: 10,
            SubscriptionPlan.PRO: 20,
            SubscriptionPlan.PRO_PLUS: -1  # Unlimited
        }
        
        if credits:
            credits.tier = tier_map.get(plan, "free")
            credits.daily_credits_max = credits_map.get(plan, 3)
            credits.daily_credits_remaining = credits_map.get(plan, 3)
        else:
            credits = UserCredits(
                user_id=user_id,
                tier=tier_map.get(plan, "free"),
                daily_credits_max=credits_map.get(plan, 3),
                daily_credits_remaining=credits_map.get(plan, 3)
            )
            self.db.add(credits)
        
        # Also update subscription limits
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        
        if subscription:
            subscription.apply_plan_limits()
            subscription.reset_usage_for_new_period()



def get_razorpay_service(db: Session) -> RazorpayService:
    """Get Razorpay service instance."""
    return RazorpayService(db)
