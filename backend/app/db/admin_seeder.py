"""
Admin User Seeder
=================
Creates or updates the superadmin user on application startup.
Reads credentials from environment variables.
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus

logger = logging.getLogger(__name__)


def seed_admin_user(db: Session) -> None:
    """
    Create or update the superadmin user from environment variables.
    
    The admin user gets:
    - is_superadmin = True
    - is_verified = True
    - Pro+ subscription with unlimited access
    """
    admin_email = f"{settings.ADMIN_USERNAME}@applyx.in"
    
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.email == admin_email).first()
        
        if not admin_user:
            # Create new admin user
            admin_user = User(
                email=admin_email,
                full_name="ApplyX Admin",
                is_active=True,
                is_verified=True,
                is_superadmin=True,
                last_login=datetime.utcnow()
            )
            db.add(admin_user)
            db.flush()  # Get the user ID
            
            # Create Pro+ subscription for admin
            admin_subscription = Subscription(
                user_id=admin_user.id,
                plan=SubscriptionPlan.PRO_PLUS,
                status=SubscriptionStatus.ACTIVE,
                resume_edits_used=0,
                resume_edits_limit=-1,  # Unlimited
                interviews_used=0,
                interviews_limit=-1,  # Unlimited
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=36500),  # 100 years
            )
            db.add(admin_subscription)
            
            db.commit()
            logger.info(f"Created superadmin user: {admin_email}")
        else:
            # Update existing user to be superadmin
            admin_user.is_superadmin = True
            admin_user.is_verified = True
            admin_user.is_active = True
            
            # Ensure admin has Pro+ subscription
            if not admin_user.subscription:
                admin_subscription = Subscription(
                    user_id=admin_user.id,
                    plan=SubscriptionPlan.PRO_PLUS,
                    status=SubscriptionStatus.ACTIVE,
                    resume_edits_used=0,
                    resume_edits_limit=-1,
                    interviews_used=0,
                    interviews_limit=-1,
                    current_period_start=datetime.utcnow(),
                    current_period_end=datetime.utcnow() + timedelta(days=36500),
                )
                db.add(admin_subscription)
            else:
                admin_user.subscription.plan = SubscriptionPlan.PRO_PLUS
                admin_user.subscription.status = SubscriptionStatus.ACTIVE
                admin_user.subscription.resume_edits_limit = -1
                admin_user.subscription.interviews_limit = -1
            
            db.commit()
            logger.info(f"Updated superadmin user: {admin_email}")
            
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed admin user: {e}")
        raise
