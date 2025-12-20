"""User database model"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.db.database import Base


class UserBase(BaseModel):
    """Base Pydantic model for User"""
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False


class UserCreate(UserBase):
    """Schema for creating a new user"""
    pass


class UserUpdate(UserBase):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserInDB(UserBase):
    """Schema for user data in database"""
    id: int
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        orm_mode = True


class User(Base):
    """User model for authentication and profile using Supabase"""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    
    # Contact Information (phone must be unique across all accounts)
    phone_number = Column(String(20), unique=True, nullable=True, index=True)
    phone_verified = Column(Boolean, default=False, nullable=False)
    
    # Profile metadata
    profile_completed = Column(Boolean, default=False)
    contact_source = Column(String(20), nullable=True)  # 'manual', 'resume', 'google'
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superadmin = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")
    credits = relationship("UserCredits", back_populates="user", uselist=False, cascade="all, delete-orphan")
    customized_resumes = relationship("CustomizedResume", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"
    
    @property
    def is_profile_complete(self) -> bool:
        """Check if user has completed essential profile info"""
        return bool(self.full_name and self.email and self.phone_number)
    
    @classmethod
    def from_supabase_auth(cls, db, user_data: dict):
        """Create or update user from Supabase auth data"""
        from app.core.config import settings
        from app.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus
        from datetime import timedelta
        
        email = user_data.get('email')
        if not email:
            return None
        
        # Check if this is the admin user (supports ADMIN_EMAIL or falls back to ADMIN_USERNAME@applyx.in)
        admin_email = getattr(settings, 'ADMIN_EMAIL', None) or (getattr(settings, 'ADMIN_USERNAME', '') + '@applyx.in')
        is_admin = email.lower() == admin_email.lower()
            
        # Check if user exists
        user = db.query(cls).filter(cls.email == email).first()
        
        if not user:
            # Create new user - extract name from Google metadata if available
            metadata = user_data.get('user_metadata', {})
            full_name = metadata.get('full_name') or metadata.get('name', '')
            
            user = cls(
                email=email,
                full_name=full_name if full_name else ('ApplyX Admin' if is_admin else None),
                is_verified=user_data.get('email_confirmed_at') is not None,
                is_superadmin=is_admin,
                last_login=datetime.utcnow(),
                contact_source='google' if metadata.get('provider') == 'google' else None
            )
            db.add(user)
            db.flush()  # Get user ID for subscription
            
            # Create Pro+ subscription for admin
            if is_admin:
                admin_subscription = Subscription(
                    user_id=user.id,
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
        else:
            # Update existing user
            user.is_verified = user_data.get('email_confirmed_at') is not None
            user.last_login = datetime.utcnow()
            
            # If admin, ensure they have superadmin status and Pro+ subscription
            if is_admin:
                user.is_superadmin = True
                if not user.subscription:
                    admin_subscription = Subscription(
                        user_id=user.id,
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
                    # Ensure admin always has Pro+ with unlimited
                    user.subscription.plan = SubscriptionPlan.PRO_PLUS
                    user.subscription.status = SubscriptionStatus.ACTIVE
                    user.subscription.resume_edits_limit = -1
                    user.subscription.interviews_limit = -1
            
            # Update name from Google if not already set
            if not user.full_name:
                metadata = user_data.get('user_metadata', {})
                user.full_name = metadata.get('full_name') or metadata.get('name', '')
        
        db.commit()
        db.refresh(user)
        return user

