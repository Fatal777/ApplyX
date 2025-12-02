"""
Credits Service
================
Manages user credits for resume customization.

Features:
- Daily credit reset
- Credit usage tracking
- Tier-based limits
"""

from datetime import date, datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.application import UserCredits, CreditUsage


class CreditsService:
    """Service for managing user credits."""
    
    # Tier configurations
    TIER_CONFIGS = {
        "free": {"daily_max": 3, "description": "3 customizations per day"},
        "premium": {"daily_max": 20, "description": "20 customizations per day"},
        "unlimited": {"daily_max": float('inf'), "description": "Unlimited customizations"},
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_or_create_credits(self, user_id: int) -> UserCredits:
        """Get user credits or create new record."""
        credits = self.db.query(UserCredits).filter(UserCredits.user_id == user_id).first()
        
        if not credits:
            credits = UserCredits(
                user_id=user_id,
                daily_credits_remaining=3,
                daily_credits_max=3,
                bonus_credits=0,
                tier="free",
                last_reset_date=date.today(),
                total_credits_used=0,
            )
            self.db.add(credits)
            self.db.commit()
            self.db.refresh(credits)
        else:
            # Check if we need to reset daily credits
            self._maybe_reset_daily(credits)
        
        return credits
    
    def _maybe_reset_daily(self, credits: UserCredits) -> None:
        """Reset daily credits if it's a new day."""
        today = date.today()
        if credits.last_reset_date < today:
            credits.daily_credits_remaining = credits.daily_credits_max
            credits.last_reset_date = today
            self.db.commit()
    
    def get_available_credits(self, user_id: int) -> dict:
        """Get available credits info for user."""
        credits = self.get_or_create_credits(user_id)
        
        return {
            "daily_remaining": credits.daily_credits_remaining,
            "daily_max": credits.daily_credits_max,
            "bonus_credits": credits.bonus_credits,
            "total_available": credits.get_available_credits(),
            "tier": credits.tier,
            "tier_description": self.TIER_CONFIGS.get(credits.tier, {}).get("description", ""),
            "can_customize": credits.can_use_credit(),
            "total_used": credits.total_credits_used,
            "resets_at": "midnight UTC",
        }
    
    def use_credit(
        self, 
        user_id: int, 
        action: str = "resume_customization",
        application_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> dict:
        """
        Use one credit for an action.
        
        Returns:
            dict with success status and remaining credits
        """
        credits = self.get_or_create_credits(user_id)
        
        if not credits.can_use_credit():
            return {
                "success": False,
                "error": "No credits available",
                "daily_remaining": credits.daily_credits_remaining,
                "bonus_credits": credits.bonus_credits,
                "tier": credits.tier,
                "upgrade_message": self._get_upgrade_message(credits.tier),
            }
        
        # Use the credit
        credits.use_credit()
        
        # Log usage
        usage = CreditUsage(
            user_credits_id=credits.id,
            action=action,
            credits_used=1,
            application_id=application_id,
            description=description,
        )
        self.db.add(usage)
        self.db.commit()
        
        return {
            "success": True,
            "credits_used": 1,
            "daily_remaining": credits.daily_credits_remaining,
            "bonus_credits": credits.bonus_credits,
            "total_available": credits.get_available_credits(),
        }
    
    def _get_upgrade_message(self, current_tier: str) -> str:
        """Get upgrade suggestion based on current tier."""
        if current_tier == "free":
            return "Upgrade to Premium for 20 customizations per day!"
        elif current_tier == "premium":
            return "Upgrade to Unlimited for unlimited customizations!"
        return ""
    
    def add_bonus_credits(self, user_id: int, amount: int, reason: str = "bonus") -> dict:
        """Add bonus credits to user (promotional, referral, etc.)."""
        credits = self.get_or_create_credits(user_id)
        credits.bonus_credits += amount
        
        # Log the addition
        usage = CreditUsage(
            user_credits_id=credits.id,
            action=f"bonus_added_{reason}",
            credits_used=-amount,  # Negative to indicate addition
            description=f"Added {amount} bonus credits: {reason}",
        )
        self.db.add(usage)
        self.db.commit()
        
        return {
            "success": True,
            "bonus_credits_added": amount,
            "total_bonus": credits.bonus_credits,
            "total_available": credits.get_available_credits(),
        }
    
    def upgrade_tier(self, user_id: int, new_tier: str) -> dict:
        """Upgrade user to a new tier."""
        if new_tier not in self.TIER_CONFIGS:
            return {"success": False, "error": f"Invalid tier: {new_tier}"}
        
        credits = self.get_or_create_credits(user_id)
        
        old_tier = credits.tier
        credits.tier = new_tier
        credits.daily_credits_max = self.TIER_CONFIGS[new_tier]["daily_max"]
        
        # Immediately give new daily credits if upgrading
        if credits.daily_credits_remaining < credits.daily_credits_max:
            credits.daily_credits_remaining = credits.daily_credits_max
        
        self.db.commit()
        
        return {
            "success": True,
            "old_tier": old_tier,
            "new_tier": new_tier,
            "daily_max": credits.daily_credits_max,
            "daily_remaining": credits.daily_credits_remaining,
        }
    
    def get_usage_history(self, user_id: int, limit: int = 50) -> list:
        """Get credit usage history for user."""
        credits = self.db.query(UserCredits).filter(UserCredits.user_id == user_id).first()
        
        if not credits:
            return []
        
        usages = (
            self.db.query(CreditUsage)
            .filter(CreditUsage.user_credits_id == credits.id)
            .order_by(CreditUsage.created_at.desc())
            .limit(limit)
            .all()
        )
        
        return [usage.to_dict() for usage in usages]


# Singleton-style function for quick access
def get_credits_service(db: Session) -> CreditsService:
    """Get credits service instance."""
    return CreditsService(db)
