"""
Cashfree Payment Service
========================
Backup payment gateway for redundancy and better rates.

Features:
- Order creation
- Payment verification
- Automatic failover from Razorpay
- Complete audit logging

Cashfree Rate: 1.95% (vs Razorpay 2%)
"""

import hmac
import hashlib
import logging
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.subscription import (
    Subscription, Payment, SubscriptionPlan,
    SubscriptionStatus, PaymentStatus
)
from app.models.user import User
from app.models.payment_audit import PaymentAudit, AuditAction

logger = logging.getLogger(__name__)


class CashfreeService:
    """Service for Cashfree payment operations."""
    
    # API endpoints
    SANDBOX_URL = "https://sandbox.cashfree.com/pg"
    PRODUCTION_URL = "https://api.cashfree.com/pg"
    
    # Pricing in paise
    PLAN_PRICES = {
        SubscriptionPlan.FREE: 0,
        SubscriptionPlan.BASIC: 99_00,
        SubscriptionPlan.PRO: 499_00,
        SubscriptionPlan.PRO_PLUS: 5489_00,
    }
    
    PLAN_NAMES = {
        SubscriptionPlan.FREE: "Free",
        SubscriptionPlan.BASIC: "Basic",
        SubscriptionPlan.PRO: "Pro",
        SubscriptionPlan.PRO_PLUS: "Pro+",
    }
    
    def __init__(self, db: Session):
        self.db = db
        self.app_id = getattr(settings, 'CASHFREE_APP_ID', None)
        self.secret_key = getattr(settings, 'CASHFREE_SECRET_KEY', None)
        self.is_sandbox = getattr(settings, 'CASHFREE_SANDBOX', True)
        self._http_client = None
    
    @property
    def base_url(self) -> str:
        return self.SANDBOX_URL if self.is_sandbox else self.PRODUCTION_URL
    
    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client
    
    def is_available(self) -> bool:
        """Check if Cashfree is configured."""
        return bool(self.app_id and self.secret_key)
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API headers."""
        return {
            "x-client-id": self.app_id,
            "x-client-secret": self.secret_key,
            "x-api-version": "2023-08-01",
            "Content-Type": "application/json"
        }
    
    async def create_order(
        self, 
        user_id: int, 
        plan: SubscriptionPlan,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Cashfree order for subscription purchase.
        """
        if not self.is_available():
            raise ValueError("Cashfree not configured")
        
        amount = self.PLAN_PRICES.get(plan, 0)
        if amount == 0:
            raise ValueError("Cannot create order for free plan")
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        order_id = f"applyx_{user_id}_{int(datetime.utcnow().timestamp())}"
        
        payload = {
            "order_id": order_id,
            "order_amount": amount / 100,  # Convert to rupees
            "order_currency": "INR",
            "customer_details": {
                "customer_id": str(user_id),
                "customer_email": user.email,
                "customer_phone": user.phone_number or "9999999999",
                "customer_name": user.full_name or "User"
            },
            "order_meta": {
                "return_url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/payment/callback?order_id={{order_id}}"
            },
            "order_note": f"ApplyX {self.PLAN_NAMES[plan]} Subscription"
        }
        
        try:
            response = await self.http_client.post(
                f"{self.base_url}/orders",
                json=payload,
                headers=self._get_headers()
            )
            result = response.json()
            
            if response.status_code != 200:
                logger.error(f"Cashfree order creation failed: {result}")
                raise ValueError(result.get("message", "Order creation failed"))
            
            # Create subscription if needed
            subscription = self._get_or_create_subscription(user_id)
            
            # Create payment record
            payment = Payment(
                subscription_id=subscription.id,
                user_id=user_id,
                razorpay_order_id=order_id,  # Reusing field for Cashfree order
                amount=amount / 100,
                currency="INR",
                status=PaymentStatus.PENDING,
                description=f"Subscription upgrade to {self.PLAN_NAMES[plan]}",
                receipt_id=order_id,
                plan_purchased=plan,
            )
            self.db.add(payment)
            self.db.commit()
            
            # Audit log
            PaymentAudit.log_action(
                self.db,
                action=AuditAction.ORDER_CREATED.value,
                user_id=user_id,
                payment_id=payment.id,
                gateway="cashfree",
                gateway_order_id=order_id,
                amount=amount,
                ip_address=ip_address,
                gateway_response=result,
                success=True,
                extra_data={"plan": plan.value}
            )
            
            logger.info(f"Cashfree order {order_id} created for user {user_id}")
            
            return {
                "order_id": order_id,
                "payment_session_id": result.get("payment_session_id"),
                "order_token": result.get("order_token"),
                "gateway": "cashfree",
                "amount": amount,
                "currency": "INR"
            }
            
        except httpx.RequestError as e:
            logger.error(f"Cashfree API error: {e}")
            raise ValueError(f"Payment gateway error: {str(e)}")
    
    async def verify_payment(
        self,
        order_id: str,
        user_id: int,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify Cashfree payment status.
        """
        if not self.is_available():
            raise ValueError("Cashfree not configured")
        
        try:
            response = await self.http_client.get(
                f"{self.base_url}/orders/{order_id}",
                headers=self._get_headers()
            )
            result = response.json()
            
            if response.status_code != 200:
                raise ValueError(result.get("message", "Verification failed"))
            
            order_status = result.get("order_status")
            
            # Find payment record
            payment = self.db.query(Payment).filter(
                Payment.razorpay_order_id == order_id,
                Payment.user_id == user_id
            ).first()
            
            if not payment:
                raise ValueError("Payment not found")
            
            if order_status == "PAID":
                # Update payment
                payment.status = PaymentStatus.COMPLETED
                payment.paid_at = datetime.utcnow()
                
                # Activate subscription
                subscription = payment.subscription
                plan = payment.plan_purchased or SubscriptionPlan.PRO
                subscription.plan = plan
                subscription.status = SubscriptionStatus.ACTIVE
                subscription.current_period_start = datetime.utcnow()
                subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
                subscription.apply_plan_limits()
                
                self.db.commit()
                
                # Audit log
                PaymentAudit.log_action(
                    self.db,
                    action=AuditAction.PAYMENT_VERIFIED.value,
                    user_id=user_id,
                    payment_id=payment.id,
                    gateway="cashfree",
                    gateway_order_id=order_id,
                    amount=int(payment.amount * 100),
                    ip_address=ip_address,
                    gateway_response=result,
                    success=True
                )
                
                logger.info(f"Cashfree payment verified for order {order_id}")
                
                return {
                    "success": True,
                    "plan": plan.value,
                    "expires_at": subscription.current_period_end.isoformat()
                }
            else:
                return {
                    "success": False,
                    "status": order_status,
                    "message": "Payment not completed"
                }
                
        except httpx.RequestError as e:
            logger.error(f"Cashfree verification error: {e}")
            raise ValueError(f"Verification failed: {str(e)}")
    
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


def get_cashfree_service(db: Session) -> CashfreeService:
    """Get Cashfree service instance."""
    return CashfreeService(db)
