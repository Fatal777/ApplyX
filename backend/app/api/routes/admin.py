"""
Admin Dashboard API
===================
Secure admin-only endpoints for dashboard analytics.

Features:
- Comprehensive analytics
- User/Payment/Interview tracking
- Hidden route (not /admin)
- Token-based authentication
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import secrets

from app.db.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.resume import Resume
from app.models.interview import InterviewSession, InterviewStatus
from app.models.subscription import Subscription, Payment, SubscriptionPlan, PaymentStatus
from app.models.payment_audit import PaymentAudit
from app.models.application import JobApplication

logger = logging.getLogger(__name__)

# Security configuration
security = HTTPBasic()

# Admin credentials (use environment variables in production)
ADMIN_USERNAME = getattr(settings, 'ADMIN_USERNAME', 'applyx_admin')
ADMIN_PASSWORD = getattr(settings, 'ADMIN_PASSWORD', 'SecureAdminPass2024!')

# Hidden route - not discoverable
router = APIRouter(prefix="/nexus-control", tags=["Admin"])


def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin credentials using constant-time comparison."""
    is_username_correct = secrets.compare_digest(
        credentials.username.encode("utf-8"),
        ADMIN_USERNAME.encode("utf-8")
    )
    is_password_correct = secrets.compare_digest(
        credentials.password.encode("utf-8"),
        ADMIN_PASSWORD.encode("utf-8")
    )
    
    if not (is_username_correct and is_password_correct):
        logger.warning(f"Failed admin login attempt: {credentials.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    return credentials.username


# ============== Dashboard Overview ==============

@router.get("/dashboard")
async def get_dashboard_overview(
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get complete dashboard overview with all key metrics."""
    
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # User stats
    total_users = db.query(User).count()
    users_today = db.query(User).filter(User.created_at >= today).count()
    users_this_week = db.query(User).filter(User.created_at >= week_ago).count()
    users_this_month = db.query(User).filter(User.created_at >= month_ago).count()
    
    # Subscription breakdown
    subscription_stats = db.query(
        Subscription.plan, func.count(Subscription.id)
    ).group_by(Subscription.plan).all()
    
    plan_counts = {plan.value: count for plan, count in subscription_stats}
    
    # Revenue stats
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).scalar() or 0
    
    revenue_today = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.paid_at >= today
    ).scalar() or 0
    
    revenue_this_week = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.paid_at >= week_ago
    ).scalar() or 0
    
    revenue_this_month = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.paid_at >= month_ago
    ).scalar() or 0
    
    # Interview stats
    total_interviews = db.query(InterviewSession).count()
    interviews_today = db.query(InterviewSession).filter(
        InterviewSession.created_at >= today
    ).count()
    completed_interviews = db.query(InterviewSession).filter(
        InterviewSession.status == InterviewStatus.COMPLETED
    ).count()
    
    # Resume stats
    total_resumes = db.query(Resume).count()
    resumes_today = db.query(Resume).filter(Resume.created_at >= today).count()
    
    # Application stats
    total_applications = db.query(JobApplication).count()
    applications_today = db.query(JobApplication).filter(
        JobApplication.created_at >= today
    ).count()
    
    return {
        "generated_at": now.isoformat(),
        "users": {
            "total": total_users,
            "today": users_today,
            "this_week": users_this_week,
            "this_month": users_this_month,
        },
        "subscriptions": {
            "free": plan_counts.get("free", 0),
            "basic": plan_counts.get("basic", 0),
            "pro": plan_counts.get("pro", 0),
            "pro_plus": plan_counts.get("pro_plus", 0),
        },
        "revenue": {
            "total": float(total_revenue),
            "today": float(revenue_today),
            "this_week": float(revenue_this_week),
            "this_month": float(revenue_this_month),
            "currency": "INR",
        },
        "interviews": {
            "total": total_interviews,
            "today": interviews_today,
            "completed": completed_interviews,
            "completion_rate": round(completed_interviews / max(total_interviews, 1) * 100, 1),
        },
        "resumes": {
            "total": total_resumes,
            "today": resumes_today,
        },
        "applications": {
            "total": total_applications,
            "today": applications_today,
        }
    }


@router.get("/users")
async def get_users_list(
    limit: int = 50,
    offset: int = 0,
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get paginated list of all users with details."""
    
    users = db.query(User).order_by(desc(User.created_at)).offset(offset).limit(limit).all()
    total = db.query(User).count()
    
    user_list = []
    for user in users:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user.id
        ).first()
        
        user_list.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone_number,
            "phone_verified": user.phone_verified,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "subscription": {
                "plan": subscription.plan.value if subscription else "free",
                "status": subscription.status.value if subscription else "active",
            } if subscription else None
        })
    
    return {
        "users": user_list,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.put("/users/{user_id}/plan")
async def update_user_plan(
    user_id: int,
    plan: str,
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Change a user's subscription plan. Admin only."""
    from app.models.subscription import SubscriptionPlan, SubscriptionStatus
    
    # Validate plan
    valid_plans = {p.value: p for p in SubscriptionPlan}
    if plan not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {list(valid_plans.keys())}")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    
    if subscription:
        old_plan = subscription.plan.value
        subscription.plan = valid_plans[plan]
        subscription.status = SubscriptionStatus.ACTIVE
        # Reset usage counters on plan change
        subscription.resume_edits_used = 0
        subscription.interviews_used = 0
        subscription.resume_analyses_used = 0
        # Apply correct limits for the new plan
        subscription.apply_plan_limits()
    else:
        old_plan = "none"
        subscription = Subscription(
            user_id=user_id,
            plan=valid_plans[plan],
            status=SubscriptionStatus.ACTIVE,
        )
        subscription.apply_plan_limits()
        db.add(subscription)
    
    db.commit()
    logger.info(f"Admin {admin} changed user {user.email} plan: {old_plan} → {plan}")
    
    return {
        "status": "success",
        "user_id": user_id,
        "email": user.email,
        "old_plan": old_plan,
        "new_plan": plan,
    }


@router.get("/payments")
async def get_payments_list(
    limit: int = 50,
    offset: int = 0,
    status_filter: Optional[str] = None,
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get paginated list of all payments."""
    
    query = db.query(Payment)
    
    if status_filter:
        try:
            status_enum = PaymentStatus(status_filter)
            query = query.filter(Payment.status == status_enum)
        except ValueError:
            pass
    
    payments = query.order_by(desc(Payment.created_at)).offset(offset).limit(limit).all()
    total = query.count()
    
    payment_list = []
    for payment in payments:
        user = db.query(User).filter(User.id == payment.user_id).first()
        
        payment_list.append({
            "id": payment.id,
            "user_email": user.email if user else "Unknown",
            "amount": float(payment.amount),
            "currency": payment.currency,
            "status": payment.status.value,
            "plan": payment.plan_purchased.value if payment.plan_purchased else None,
            "gateway_order_id": payment.razorpay_order_id,
            "Gateway_payment_id": payment.razorpay_payment_id,
            "created_at": payment.created_at.isoformat() if payment.created_at else None,
            "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        })
    
    return {
        "payments": payment_list,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/interviews")
async def get_interviews_list(
    limit: int = 50,
    offset: int = 0,
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get paginated list of all interview sessions."""
    
    interviews = db.query(InterviewSession).order_by(
        desc(InterviewSession.created_at)
    ).offset(offset).limit(limit).all()
    total = db.query(InterviewSession).count()
    
    interview_list = []
    for interview in interviews:
        user = db.query(User).filter(User.id == interview.user_id).first()
        
        interview_list.append({
            "id": interview.id,
            "user_email": user.email if user else "Unknown",
            "type": interview.interview_type.value if interview.interview_type else None,
            "status": interview.status.value if interview.status else None,
            "score": interview.overall_score,
            "duration_mins": interview.duration_minutes,
            "created_at": interview.created_at.isoformat() if interview.created_at else None,
        })
    
    return {
        "interviews": interview_list,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/analytics/daily")
async def get_daily_analytics(
    days: int = 30,
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get daily analytics for charts."""
    
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)
    
    daily_data = []
    
    for i in range(days):
        day = start_date + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        signups = db.query(User).filter(
            User.created_at >= day_start,
            User.created_at < day_end
        ).count()
        
        revenue = db.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.paid_at >= day_start,
            Payment.paid_at < day_end
        ).scalar() or 0
        
        interviews = db.query(InterviewSession).filter(
            InterviewSession.created_at >= day_start,
            InterviewSession.created_at < day_end
        ).count()
        
        resumes = db.query(Resume).filter(
            Resume.created_at >= day_start,
            Resume.created_at < day_end
        ).count()
        
        daily_data.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "signups": signups,
            "revenue": float(revenue),
            "interviews": interviews,
            "resumes": resumes,
        })
    
    return {"daily_analytics": daily_data, "days": days}


@router.get("/analytics/gateway")
async def get_gateway_analytics(
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get payment gateway performance analytics."""
    
    gateway_stats = db.query(
        PaymentAudit.gateway,
        func.count(PaymentAudit.id).label("total"),
        func.sum(case((PaymentAudit.success == 1, 1), else_=0)).label("successful"),
        func.sum(PaymentAudit.amount).label("volume")
    ).group_by(PaymentAudit.gateway).all()
    
    from sqlalchemy import case
    
    gateway_stats = db.query(
        PaymentAudit.gateway,
        func.count(PaymentAudit.id).label("total"),
    ).filter(
        PaymentAudit.action == "order_created"
    ).group_by(PaymentAudit.gateway).all()
    
    return {
        "gateways": [
            {
                "name": stat[0],
                "orders": stat[1],
            }
            for stat in gateway_stats
        ]
    }
