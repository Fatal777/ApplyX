"""
Mobile Payment Service
======================
Handles mobile-optimized payments with UPI deep linking and payment polling.

Features:
- UPI intent generation for mobile apps
- Payment status polling
- Deep link callbacks
- Mobile device detection
"""

import logging
import re
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.subscription import Payment, PaymentStatus
from app.models.payment_audit import PaymentAudit, AuditAction

logger = logging.getLogger(__name__)


class MobilePaymentService:
    """Service for mobile-optimized payments."""
    
    # UPI apps with deep link schemes
    UPI_APPS = {
        "gpay": "tez://upi/pay",
        "phonepe": "phonepe://pay",
        "paytm": "paytmmp://pay",
        "bhim": "upi://pay",
        "default": "upi://pay"
    }
    
    # Payment polling config
    MAX_POLL_DURATION = 300  # 5 minutes max
    POLL_INTERVAL = 3  # 3 seconds between polls
    
    def __init__(self, db: Session):
        self.db = db
    
    @staticmethod
    def is_mobile_device(user_agent: str) -> bool:
        """Detect if request is from mobile device."""
        mobile_patterns = [
            r'Android', r'iPhone', r'iPad', r'iPod',
            r'webOS', r'BlackBerry', r'IEMobile', r'Opera Mini',
            r'Mobile', r'mobile'
        ]
        return any(re.search(pattern, user_agent) for pattern in mobile_patterns)
    
    @staticmethod
    def get_upi_app(user_agent: str) -> str:
        """Detect UPI app from user agent."""
        ua_lower = user_agent.lower()
        
        if 'gpay' in ua_lower or 'google pay' in ua_lower:
            return 'gpay'
        elif 'phonepe' in ua_lower:
            return 'phonepe'
        elif 'paytm' in ua_lower:
            return 'paytm'
        elif 'bhim' in ua_lower:
            return 'bhim'
        return 'default'
    
    def generate_upi_intent(
        self,
        order_id: str,
        amount: float,
        merchant_name: str = "ApplyX",
        merchant_vpa: Optional[str] = None,
        transaction_note: str = "ApplyX Subscription"
    ) -> Dict[str, Any]:
        """
        Generate UPI intent URLs for various UPI apps.
        
        Returns deep link URLs for all major UPI apps.
        """
        vpa = merchant_vpa or getattr(settings, 'MERCHANT_UPI_VPA', 'applyx@razorpay')
        amount_str = f"{amount:.2f}"
        
        # Common UPI parameters
        params = {
            "pa": vpa,  # Payee VPA
            "pn": merchant_name,  # Payee name
            "am": amount_str,  # Amount
            "cu": "INR",  # Currency
            "tn": transaction_note,  # Transaction note
            "tr": order_id,  # Transaction reference
        }
        
        param_string = "&".join(f"{k}={v}" for k, v in params.items())
        
        intents = {}
        for app_name, scheme in self.UPI_APPS.items():
            intents[app_name] = f"{scheme}?{param_string}"
        
        return {
            "intents": intents,
            "default_intent": intents["default"],
            "order_id": order_id,
            "amount": amount,
            "polling_endpoint": f"/api/v1/payment/mobile/status/{order_id}"
        }
    
    def get_payment_status(self, order_id: str) -> Dict[str, Any]:
        """
        Get current payment status for polling.
        
        Returns status and completion details.
        """
        payment = self.db.query(Payment).filter(
            Payment.razorpay_order_id == order_id
        ).first()
        
        if not payment:
            return {
                "found": False,
                "status": "not_found",
                "message": "Order not found"
            }
        
        is_completed = payment.status == PaymentStatus.COMPLETED
        
        return {
            "found": True,
            "order_id": order_id,
            "status": payment.status.value,
            "completed": is_completed,
            "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
            "amount": payment.amount,
            "continue_polling": payment.status == PaymentStatus.PENDING
        }
    
    def create_mobile_payment_session(
        self,
        order_id: str,
        amount: float,
        user_agent: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a mobile-optimized payment session.
        
        Returns UPI intents and polling configuration.
        """
        is_mobile = self.is_mobile_device(user_agent)
        preferred_app = self.get_upi_app(user_agent) if is_mobile else None
        
        upi_data = self.generate_upi_intent(order_id, amount)
        
        # Audit log
        PaymentAudit.log_action(
            self.db,
            action=AuditAction.PAYMENT_INITIATED.value,
            gateway="upi",
            gateway_order_id=order_id,
            amount=int(amount * 100),
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            success=True,
            extra_data={
                "is_mobile": is_mobile,
                "preferred_app": preferred_app
            }
        )
        
        callback_url = getattr(settings, 'PAYMENT_CALLBACK_URL', None) or f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/payment/callback"
        
        return {
            "is_mobile": is_mobile,
            "preferred_app": preferred_app,
            "upi_intents": upi_data["intents"],
            "default_intent": upi_data["intents"].get(preferred_app, upi_data["default_intent"]),
            "order_id": order_id,
            "amount": amount,
            "polling": {
                "endpoint": f"/api/v1/payment/mobile/status/{order_id}",
                "interval_ms": self.POLL_INTERVAL * 1000,
                "max_duration_ms": self.MAX_POLL_DURATION * 1000
            },
            "callback_url": f"{callback_url}?order_id={order_id}"
        }


def get_mobile_payment_service(db: Session) -> MobilePaymentService:
    """Get mobile payment service instance."""
    return MobilePaymentService(db)
