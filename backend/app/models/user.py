"""User database model"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
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
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"
    
    @classmethod
    def from_supabase_auth(cls, db, user_data: dict):
        """Create or update user from Supabase auth data"""
        email = user_data.get('email')
        if not email:
            return None
            
        # Check if user exists
        user = db.query(cls).filter(cls.email == email).first()
        
        if not user:
            # Create new user
            user = cls(
                email=email,
                full_name=user_data.get('user_metadata', {}).get('full_name', ''),
                is_verified=user_data.get('email_confirmed_at') is not None,
                last_login=datetime.utcnow()
            )
            db.add(user)
        else:
            # Update existing user
            user.is_verified = user_data.get('email_confirmed_at') is not None
            user.last_login = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        return user
