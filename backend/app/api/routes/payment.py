"""
Payment API Routes
==================
Endpoints for Razorpay payment integration including:
- Order creation
- Payment verification
- Subscription status
- Payment history
- Transaction audit logs

Designed for high concurrency (1000+ simultaneous payments).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.database import get_db
from app.api.dependencies import get_current_user, get_current_active_user
from app.services.razorpay_service import get_razorpay_service, RazorpayService
from app.models.subscription import SubscriptionPlan
from app.models.user import User
from app.models.payment_audit import PaymentAudit, AuditAction
from app.middleware.security import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payment", tags=["Payment"])


# ============== Request/Response Models ==============

class CreateOrderRequest(BaseModel):
    """Request to create a payment order."""
    plan: str = Field(..., description="Plan to purchase: 'basic', 'pro', or 'pro_plus'")


class VerifyPaymentRequest(BaseModel):
    """Request to verify payment after Razorpay checkout."""
    razorpay_order_id: str = Field(..., description="Razorpay order ID")
    razorpay_payment_id: str = Field(..., description="Razorpay payment ID")
    razorpay_signature: str = Field(..., description="Razorpay signature for verification")


class SubscriptionStatusResponse(BaseModel):
    """Subscription status response."""
    plan: str
    status: str
    expires_at: Optional[str]
    resume_analysis_count: int
    resume_analysis_limit: int
    resume_analysis_remaining: int
    can_access_interview: bool
    can_analyze_resume: bool
    tier: str
    is_paid: bool


# ============== Usage / Freemium Endpoints ==============

@router.get("/usage")
async def get_usage(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get current user's usage limits and remaining credits.
    
    Used by the frontend to show usage indicators and decide
    whether to show the upgrade modal before an action.
    """
    from app.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus, PLAN_LIMITS
    
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        # Auto-create a FREE subscription if missing (defensive)
        subscription = Subscription(
            user_id=current_user.id,
            plan=SubscriptionPlan.FREE,
            status=SubscriptionStatus.ACTIVE,
        )
        subscription.apply_plan_limits()
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    
    return subscription.usage_dict()


@router.post("/consume-credit")
async def consume_credit(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Explicitly consume a usage credit after a successful action.
    
    The frontend calls this AFTER a resume upload/analysis/interview succeeds,
    so the credit is only deducted for successful operations (not failed ones).
    
    Body: { "type": "resume_edits" | "resume_analyses" | "interviews" }
    """
    from app.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus
    
    body = await request.json()
    credit_type = body.get("type", "")
    
    if credit_type not in ("resume_edits", "resume_analyses", "interviews"):
        raise HTTPException(status_code=400, detail="Invalid credit type")
    
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=402, detail="No subscription found")
    
    # Superadmins skip
    if current_user.is_superadmin:
        return {"consumed": False, "reason": "admin_bypass"}
    
    success = False
    if credit_type == "resume_edits":
        success = subscription.use_resume_edit()
    elif credit_type == "resume_analyses":
        success = subscription.use_analysis()
    elif credit_type == "interviews":
        success = subscription.use_interview()
    
    if not success:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "usage_limit_reached",
                "message": f"Your {subscription.plan.value} plan limit for {credit_type} has been reached.",
                "upgrade_url": "/pricing",
            },
        )
    
    db.commit()
    return {
        "consumed": True,
        "credit_type": credit_type,
        "usage": subscription.usage_dict(),
    }


# ============== Razorpay Order Endpoints ==============

@router.post("/create-order")
@limiter.limit("10/minute")
async def create_order(
    request: Request,
    order_request: CreateOrderRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a Razorpay order for subscription purchase.
    """
    # Normalize plan name
    plan_name = order_request.plan.lower().replace("-", "_").replace("+", "_plus")
    
    try:
        plan = SubscriptionPlan(plan_name)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {order_request.plan}. Must be 'basic', 'pro', or 'pro_plus'"
        )
    
    if plan == SubscriptionPlan.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create order for free plan"
        )
    
    service = get_razorpay_service(db)
    
    if not service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured"
        )
    
    # Get IP for audit
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]
    
    try:
        order = service.create_order(current_user.id, plan)
        
        # Audit log (concurrent-safe)
        PaymentAudit.log_action(
            db,
            action=AuditAction.ORDER_CREATED.value,
            user_id=current_user.id,
            gateway="razorpay",
            gateway_order_id=order.get("order_id"),
            amount=order.get("amount"),
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
            extra_data={"plan": plan.value}
        )
        
        logger.info(f"Created order for user {current_user.id}, plan {plan.value}")
        return order
        
    except ValueError as e:
        PaymentAudit.log_action(
            db,
            action=AuditAction.GATEWAY_ERROR.value,
            user_id=current_user.id,
            gateway="razorpay",
            ip_address=ip_address,
            success=False,
            error_message=str(e),
            extra_data={"plan": plan.value}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        PaymentAudit.log_action(
            db,
            action=AuditAction.GATEWAY_ERROR.value,
            user_id=current_user.id,
            gateway="razorpay",
            ip_address=ip_address,
            success=False,
            error_message=str(e),
            extra_data={"plan": plan.value}
        )
        logger.error(f"Failed to create order: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment order"
        )


@router.post("/verify")
@limiter.limit("20/minute")
async def verify_payment(
    request: Request,
    verify_request: VerifyPaymentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify Razorpay payment and activate subscription.
    
    Called by frontend after successful Razorpay checkout.
    """
    service = get_razorpay_service(db)
    
    if not service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured"
        )
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    try:
        result = service.verify_payment(
            razorpay_order_id=verify_request.razorpay_order_id,
            razorpay_payment_id=verify_request.razorpay_payment_id,
            razorpay_signature=verify_request.razorpay_signature,
            user_id=current_user.id
        )
        logger.info(f"Payment verified for user {current_user.id}")
        
        # Audit log success
        PaymentAudit.log_action(
            db,
            action=AuditAction.PAYMENT_VERIFIED.value,
            user_id=current_user.id,
            gateway="razorpay",
            gateway_order_id=verify_request.razorpay_order_id,
            gateway_payment_id=verify_request.razorpay_payment_id,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            success=True,
            metadata={"plan": result.get("plan")}
        )
        
        return result
    except ValueError as e:
        logger.warning(f"Payment verification failed: {e}")
        
        # Audit log failure
        PaymentAudit.log_action(
            db,
            action=AuditAction.PAYMENT_FAILED.value,
            user_id=current_user.id,
            gateway="razorpay",
            gateway_order_id=verify_request.razorpay_order_id,
            gateway_payment_id=verify_request.razorpay_payment_id,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            success=False,
            error_message=str(e)
        )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Payment verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment verification failed"
        )


@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's subscription status.
    
    Returns comprehensive subscription and usage information including:
    - Current plan and status
    - Resume analysis usage
    - Interview platform access
    """
    service = get_razorpay_service(db)
    status = service.get_subscription_status(current_user.id)
    return status


@router.get("/check-interview-access")
async def check_interview_access(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Check if user can access the interview platform.
    
    Returns access status and upgrade message if subscription required.
    """
    service = get_razorpay_service(db)
    return service.check_interview_access(current_user.id)


@router.get("/check-resume-access")
async def check_resume_analysis_access(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Check if user can perform resume analysis.
    
    Free users have 2 lifetime analyses. Paid users have unlimited.
    """
    service = get_razorpay_service(db)
    return service.check_resume_analysis_access(current_user.id)


@router.get("/history")
async def get_payment_history(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get user's payment history.
    
    Returns list of past payments with details.
    """
    service = get_razorpay_service(db)
    payments = service.get_payment_history(current_user.id, limit)
    return {"payments": payments, "total": len(payments)}


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Razorpay webhook events.
    
    Webhooks are used for:
    - Subscription renewals
    - Payment failures
    - Refunds
    
    Note: This endpoint doesn't require authentication as it's called by Razorpay.
    Instead, we verify the webhook signature.
    """
    # Get webhook signature from headers
    signature = request.headers.get("X-Razorpay-Signature")
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing webhook signature"
        )
    
    # Get raw body for signature verification
    body = await request.body()
    
    # Audit log webhook received
    PaymentAudit.log_action(
        db,
        action=AuditAction.WEBHOOK_RECEIVED.value,
        gateway="razorpay",
        gateway_response={"body_preview": body[:500].decode() if body else None},
        success=True
    )
    
    # TODO: Implement webhook signature verification and handling
    logger.info(f"Received Razorpay webhook: {body[:200]}")
    
    return {"status": "received"}


@router.get("/transactions")
async def get_transaction_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive transaction history with audit logs.
    
    Returns all payment-related activities for compliance and debugging.
    """
    # Get audit logs for user
    audits = db.query(PaymentAudit).filter(
        PaymentAudit.user_id == current_user.id
    ).order_by(PaymentAudit.created_at.desc()).offset(offset).limit(limit).all()
    
    # Get total count
    total = db.query(PaymentAudit).filter(
        PaymentAudit.user_id == current_user.id
    ).count()
    
    return {
        "transactions": [a.to_dict() for a in audits],
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ============== Mobile Payment Endpoints ==============

@router.post("/mobile/create")
@limiter.limit("10/minute")
async def create_mobile_payment(
    request: Request,
    order_request: CreateOrderRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a mobile-optimized payment with UPI deep linking.
    
    Returns UPI intent URLs for all major UPI apps (GPay, PhonePe, Paytm, BHIM).
    """
    from app.services.mobile_payment_service import get_mobile_payment_service
    from app.services.payment_gateway import get_payment_gateway
    
    # Normalize plan name
    plan_name = order_request.plan.lower().replace("-", "_").replace("+", "_plus")
    
    try:
        plan = SubscriptionPlan(plan_name)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {order_request.plan}"
        )
    
    if plan == SubscriptionPlan.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create order for free plan"
        )
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # Create order via payment gateway
    gateway = get_payment_gateway(db)
    order = await gateway.create_order(
        user_id=current_user.id,
        plan=plan,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Generate mobile payment session with UPI intents
    mobile_service = get_mobile_payment_service(db)
    amount = order.get("amount", 0) / 100  # Convert from paise
    
    mobile_session = mobile_service.create_mobile_payment_session(
        order_id=order.get("order_id"),
        amount=amount,
        user_agent=user_agent,
        ip_address=ip_address
    )
    
    return {
        **order,
        **mobile_session
    }


@router.get("/mobile/status/{order_id}")
async def get_mobile_payment_status(
    order_id: str,
    db: Session = Depends(get_db)
):
    """
    Get payment status for mobile polling.
    
    Called repeatedly by frontend to check if UPI payment completed.
    """
    from app.services.mobile_payment_service import get_mobile_payment_service
    
    mobile_service = get_mobile_payment_service(db)
    status_result = mobile_service.get_payment_status(order_id)
    
    return status_result


@router.get("/gateways")
async def get_available_gateways(
    db: Session = Depends(get_db)
):
    """
    Get list of available payment gateways.
    
    Frontend can use this to show available payment options.
    """
    from app.services.payment_gateway import get_payment_gateway
    
    gateway = get_payment_gateway(db)
    available = gateway.get_available_gateways()
    
    return {
        "gateways": available,
        "primary": available[0] if available else None
    }


