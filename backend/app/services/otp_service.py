"""
OTP Service
===========
Handles OTP generation, sending, and verification via multiple providers.

Providers:
- Primary: MSG91 (₹2,500 free credits)
- Fallback: Fast2SMS (₹50 free credits)

Features:
- Secure OTP generation (6-digit)
- Rate limiting (3/hour per phone, 10/hour per IP)
- Provider failover
- Phone number normalization
"""

import hashlib
import hmac
import logging
import random
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.phone_verification import PhoneVerification, OTPRateLimit

logger = logging.getLogger(__name__)


class OTPService:
    """Service for OTP generation and verification."""
    
    # Rate limits
    MAX_OTP_PER_PHONE_HOUR = 3
    MAX_OTP_PER_IP_HOUR = 10
    OTP_EXPIRY_MINUTES = 5
    MAX_VERIFICATION_ATTEMPTS = 3
    
    def __init__(self, db: Session):
        self.db = db
        self._http_client = None
    
    @property
    def http_client(self) -> httpx.AsyncClient:
        """Lazy HTTP client initialization."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client
    
    @staticmethod
    def normalize_phone(phone: str) -> str:
        """
        Normalize phone number to E.164 format for India.
        
        Examples:
            9876543210 -> +919876543210
            09876543210 -> +919876543210
            +919876543210 -> +919876543210
            91 9876543210 -> +919876543210
        """
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        # Remove leading zeros
        cleaned = cleaned.lstrip('0')
        
        # Remove existing + if present
        if cleaned.startswith('+'):
            cleaned = cleaned[1:]
        
        # Remove country code if present
        if cleaned.startswith('91') and len(cleaned) > 10:
            cleaned = cleaned[2:]
        
        # Validate 10-digit Indian mobile number
        if len(cleaned) != 10 or not cleaned[0] in '6789':
            raise ValueError(f"Invalid Indian mobile number: {phone}")
        
        return f"+91{cleaned}"
    
    @staticmethod
    def generate_otp() -> str:
        """Generate a secure 6-digit OTP."""
        return str(random.randint(100000, 999999))
    
    @staticmethod
    def hash_otp(otp: str) -> str:
        """Hash OTP for secure storage."""
        return hashlib.sha256(otp.encode()).hexdigest()
    
    @staticmethod
    def verify_otp_hash(otp: str, otp_hash: str) -> bool:
        """Verify OTP against stored hash."""
        return hmac.compare_digest(
            hashlib.sha256(otp.encode()).hexdigest(),
            otp_hash
        )
    
    def check_rate_limit(self, phone: str, ip_address: Optional[str] = None) -> Tuple[bool, str]:
        """
        Check if OTP request is allowed based on rate limits.
        
        Returns:
            Tuple of (allowed: bool, message: str)
        """
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        
        # Check phone rate limit
        phone_limit = self.db.query(OTPRateLimit).filter(
            OTPRateLimit.identifier == phone,
            OTPRateLimit.identifier_type == "phone",
            OTPRateLimit.window_start > hour_ago
        ).first()
        
        if phone_limit and phone_limit.request_count >= self.MAX_OTP_PER_PHONE_HOUR:
            return False, "Too many OTP requests for this phone number. Try again in an hour."
        
        # Check IP rate limit
        if ip_address:
            ip_limit = self.db.query(OTPRateLimit).filter(
                OTPRateLimit.identifier == ip_address,
                OTPRateLimit.identifier_type == "ip",
                OTPRateLimit.window_start > hour_ago
            ).first()
            
            if ip_limit and ip_limit.request_count >= self.MAX_OTP_PER_IP_HOUR:
                return False, "Too many OTP requests from this IP. Try again in an hour."
        
        return True, "OK"
    
    def update_rate_limit(self, phone: str, ip_address: Optional[str] = None):
        """Update rate limit counters after sending OTP."""
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        
        # Update phone rate limit
        phone_limit = self.db.query(OTPRateLimit).filter(
            OTPRateLimit.identifier == phone,
            OTPRateLimit.identifier_type == "phone"
        ).first()
        
        if phone_limit:
            if phone_limit.is_window_expired():
                phone_limit.reset_window()
            else:
                phone_limit.increment()
        else:
            phone_limit = OTPRateLimit(
                identifier=phone,
                identifier_type="phone",
                request_count=1,
                window_start=now
            )
            self.db.add(phone_limit)
        
        # Update IP rate limit
        if ip_address:
            ip_limit = self.db.query(OTPRateLimit).filter(
                OTPRateLimit.identifier == ip_address,
                OTPRateLimit.identifier_type == "ip"
            ).first()
            
            if ip_limit:
                if ip_limit.is_window_expired():
                    ip_limit.reset_window()
                else:
                    ip_limit.increment()
            else:
                ip_limit = OTPRateLimit(
                    identifier=ip_address,
                    identifier_type="ip",
                    request_count=1,
                    window_start=now
                )
                self.db.add(ip_limit)
        
        self.db.commit()
    
    async def send_otp(
        self, 
        phone: str, 
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send OTP to phone number.
        
        Uses MSG91 as primary, Fast2SMS as fallback.
        
        Returns:
            Dict with success status and verification_id
        """
        try:
            normalized_phone = self.normalize_phone(phone)
        except ValueError as e:
            return {"success": False, "error": str(e)}
        
        # Check rate limits
        allowed, message = self.check_rate_limit(normalized_phone, ip_address)
        if not allowed:
            return {"success": False, "error": message}
        
        # Generate OTP
        otp = self.generate_otp()
        otp_hash = self.hash_otp(otp)
        
        # Invalidate any existing OTPs for this phone
        self.db.query(PhoneVerification).filter(
            PhoneVerification.phone_number == normalized_phone,
            PhoneVerification.verified == False
        ).delete()
        
        # Create verification record
        verification = PhoneVerification(
            phone_number=normalized_phone,
            otp_hash=otp_hash,
            expires_at=PhoneVerification.new_expiry(self.OTP_EXPIRY_MINUTES),
            ip_address=ip_address
        )
        self.db.add(verification)
        self.db.commit()
        self.db.refresh(verification)
        
        # Try to send OTP via providers
        sent = await self._send_via_msg91(normalized_phone, otp)
        
        if not sent:
            sent = await self._send_via_fast2sms(normalized_phone, otp)
        
        if sent:
            self.update_rate_limit(normalized_phone, ip_address)
            return {
                "success": True,
                "verification_id": verification.id,
                "phone": normalized_phone,
                "expires_in": self.OTP_EXPIRY_MINUTES * 60  # seconds
            }
        else:
            # Cleanup failed verification
            self.db.delete(verification)
            self.db.commit()
            return {"success": False, "error": "Failed to send OTP. Please try again."}
    
    async def _send_via_msg91(self, phone: str, otp: str) -> bool:
        """Send OTP via MSG91."""
        auth_key = getattr(settings, 'MSG91_AUTH_KEY', None)
        template_id = getattr(settings, 'MSG91_TEMPLATE_ID', None)
        
        if not auth_key or not template_id:
            logger.warning("MSG91 not configured")
            return False
        
        try:
            # Remove +91 prefix for MSG91
            mobile = phone.replace('+91', '')
            
            url = "https://api.msg91.com/api/v5/otp"
            payload = {
                "template_id": template_id,
                "mobile": mobile,
                "otp": otp
            }
            headers = {"authkey": auth_key}
            
            response = await self.http_client.post(url, json=payload, headers=headers)
            result = response.json()
            
            if result.get("type") == "success":
                logger.info(f"OTP sent via MSG91 to {phone[:6]}****")
                return True
            else:
                logger.warning(f"MSG91 failed: {result}")
                return False
                
        except Exception as e:
            logger.error(f"MSG91 error: {e}")
            return False
    
    async def _send_via_fast2sms(self, phone: str, otp: str) -> bool:
        """Send OTP via Fast2SMS (fallback)."""
        api_key = getattr(settings, 'FAST2SMS_API_KEY', None)
        
        if not api_key:
            logger.warning("Fast2SMS not configured")
            return False
        
        try:
            # Remove +91 prefix for Fast2SMS
            mobile = phone.replace('+91', '')
            
            url = "https://www.fast2sms.com/dev/bulkV2"
            payload = {
                "route": "otp",
                "variables_values": otp,
                "numbers": mobile
            }
            headers = {"authorization": api_key}
            
            response = await self.http_client.post(url, data=payload, headers=headers)
            result = response.json()
            
            if result.get("return") == True:
                logger.info(f"OTP sent via Fast2SMS to {phone[:6]}****")
                return True
            else:
                logger.warning(f"Fast2SMS failed: {result}")
                return False
                
        except Exception as e:
            logger.error(f"Fast2SMS error: {e}")
            return False
    
    def verify_otp(
        self, 
        verification_id: int, 
        otp: str,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Verify OTP and link phone to user.
        
        Returns:
            Dict with success status and phone number
        """
        verification = self.db.query(PhoneVerification).filter(
            PhoneVerification.id == verification_id
        ).first()
        
        if not verification:
            return {"success": False, "error": "Verification not found"}
        
        if verification.verified:
            return {"success": False, "error": "OTP already used"}
        
        if verification.is_expired():
            return {"success": False, "error": "OTP has expired"}
        
        if verification.is_locked():
            return {"success": False, "error": "Too many failed attempts"}
        
        # Verify OTP
        if not self.verify_otp_hash(otp, verification.otp_hash):
            verification.increment_attempts()
            self.db.commit()
            remaining = verification.max_attempts - verification.attempts
            return {
                "success": False, 
                "error": f"Invalid OTP. {remaining} attempts remaining."
            }
        
        # Check if phone is already linked to another user
        from app.models.user import User
        existing_user = self.db.query(User).filter(
            User.phone_number == verification.phone_number,
            User.id != user_id
        ).first()
        
        if existing_user:
            return {
                "success": False,
                "error": "This phone number is already linked to another account"
            }
        
        # Mark as verified
        verification.verified = True
        verification.verified_at = datetime.utcnow()
        verification.user_id = user_id
        
        # Update user's phone
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.phone_number = verification.phone_number
            user.phone_verified = True
        
        self.db.commit()
        
        logger.info(f"Phone {verification.phone_number[:6]}**** verified for user {user_id}")
        
        return {
            "success": True,
            "phone": verification.phone_number
        }
    
    def check_phone_exists(self, phone: str) -> Dict[str, Any]:
        """Check if phone is already registered."""
        try:
            normalized = self.normalize_phone(phone)
        except ValueError as e:
            return {"exists": False, "error": str(e)}
        
        from app.models.user import User
        exists = self.db.query(User).filter(
            User.phone_number == normalized,
            User.phone_verified == True
        ).first() is not None
        
        return {"exists": exists, "phone": normalized}


def get_otp_service(db: Session) -> OTPService:
    """Get OTP service instance."""
    return OTPService(db)
