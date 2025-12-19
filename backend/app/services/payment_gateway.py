"""
Payment Gateway Abstraction
===========================
Unified interface for multiple payment gateways with automatic failover.

Gateways:
- Razorpay (primary)
- Cashfree (backup)
- PayPal (international)

Features:
- Automatic failover on gateway errors
- Concurrent-safe operations
- Unified audit logging
"""

import logging
from typing import Optional, Dict, Any, List

from sqlalchemy.orm import Session

from app.services.razorpay_service import RazorpayService, get_razorpay_service
from app.services.cashfree_service import CashfreeService, get_cashfree_service
from app.models.subscription import SubscriptionPlan
from app.models.payment_audit import PaymentAudit, AuditAction

logger = logging.getLogger(__name__)


class PaymentGateway:
    """
    Unified payment gateway with failover support.
    
    Designed for high concurrency with:
    - Primary/backup gateway pattern
    - Automatic failover on errors
    - Complete audit trail
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.razorpay = get_razorpay_service(db)
        self.cashfree = get_cashfree_service(db)
        
        # Gateway priority (first available wins)
        self._gateways = [
            ("razorpay", self.razorpay),
            ("cashfree", self.cashfree),
        ]
    
    def get_available_gateways(self) -> List[str]:
        """Get list of configured gateways."""
        return [name for name, svc in self._gateways if svc.is_available()]
    
    async def create_order(
        self,
        user_id: int,
        plan: SubscriptionPlan,
        preferred_gateway: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create payment order with automatic failover.
        
        Tries preferred gateway first (if specified), then falls back
        to other available gateways.
        """
        errors = []
        
        # Order gateways by preference
        gateways = self._get_ordered_gateways(preferred_gateway)
        
        for gateway_name, gateway_service in gateways:
            if not gateway_service.is_available():
                continue
            
            try:
                if gateway_name == "razorpay":
                    result = gateway_service.create_order(user_id, plan)
                    result["gateway"] = "razorpay"
                elif gateway_name == "cashfree":
                    result = await gateway_service.create_order(user_id, plan, ip_address)
                    result["gateway"] = "cashfree"
                else:
                    continue
                
                logger.info(f"Order created via {gateway_name} for user {user_id}")
                return result
                
            except Exception as e:
                error_msg = str(e)
                errors.append(f"{gateway_name}: {error_msg}")
                logger.warning(f"Gateway {gateway_name} failed: {error_msg}")
                
                # Log failover attempt
                PaymentAudit.log_action(
                    self.db,
                    action=AuditAction.GATEWAY_ERROR.value,
                    user_id=user_id,
                    gateway=gateway_name,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    error_message=error_msg,
                    extra_data={"plan": plan.value, "failover": True}
                )
                continue
        
        # All gateways failed
        raise ValueError(f"All payment gateways failed: {'; '.join(errors)}")
    
    async def verify_payment(
        self,
        gateway: str,
        user_id: int,
        ip_address: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Verify payment on specific gateway.
        
        Gateway-specific parameters passed via kwargs:
        - Razorpay: razorpay_order_id, razorpay_payment_id, razorpay_signature
        - Cashfree: order_id
        """
        if gateway == "razorpay":
            if not self.razorpay.is_available():
                raise ValueError("Razorpay not configured")
            
            return self.razorpay.verify_payment(
                razorpay_order_id=kwargs.get("razorpay_order_id"),
                razorpay_payment_id=kwargs.get("razorpay_payment_id"),
                razorpay_signature=kwargs.get("razorpay_signature"),
                user_id=user_id
            )
        
        elif gateway == "cashfree":
            if not self.cashfree.is_available():
                raise ValueError("Cashfree not configured")
            
            return await self.cashfree.verify_payment(
                order_id=kwargs.get("order_id"),
                user_id=user_id,
                ip_address=ip_address
            )
        
        else:
            raise ValueError(f"Unknown gateway: {gateway}")
    
    def get_subscription_status(self, user_id: int) -> Dict[str, Any]:
        """Get subscription status (gateway-agnostic)."""
        return self.razorpay.get_subscription_status(user_id)
    
    def _get_ordered_gateways(self, preferred: Optional[str] = None) -> List[tuple]:
        """Get gateways ordered by preference."""
        if not preferred:
            return self._gateways
        
        preferred_first = []
        others = []
        
        for name, svc in self._gateways:
            if name == preferred:
                preferred_first.append((name, svc))
            else:
                others.append((name, svc))
        
        return preferred_first + others


def get_payment_gateway(db: Session) -> PaymentGateway:
    """Get payment gateway instance."""
    return PaymentGateway(db)
