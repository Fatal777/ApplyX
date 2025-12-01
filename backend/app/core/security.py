"""Security utilities for authentication, encryption, and validation"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError
from passlib.context import CryptContext
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import base64
import hashlib
import requests
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

logger = logging.getLogger(__name__)


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Password validation rules
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets security requirements.
    Returns: (is_valid, error_message)
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    
    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Password must be less than {MAX_PASSWORD_LENGTH} characters"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    special_chars = set("!@#$%^&*()_+-=[]{}|;:,.<>?")
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)"
    
    # Check for common weak patterns
    weak_patterns = ['password', '123456', 'qwerty', 'letmein', 'admin', 'welcome']
    password_lower = password.lower()
    for pattern in weak_patterns:
        if pattern in password_lower:
            return False, "Password contains a common weak pattern"
    
    return True, ""


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


security = HTTPBearer()

def get_supabase_public_key() -> str:
    """Fetch Supabase JWT public key"""
    if not settings.SUPABASE_PROJECT_REF:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase is not configured"
        )
    jwks_url = f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co/auth/v1/.well-known/jwks.json"
    try:
        response = requests.get(jwks_url)
        response.raise_for_status()
        jwks = response.json()
        return jwks["keys"][0]["x5c"][0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch Supabase public key: {str(e)}"
        )

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT token from Supabase"""
    try:
        logger.debug(f"Decoding token with algorithm: {settings.JWT_ALGORITHM}")
        
        # Check if Supabase is configured
        if settings.SUPABASE_JWT_SECRET and settings.SUPABASE_PROJECT_REF:
            logger.debug(f"Expected issuer: https://{settings.SUPABASE_PROJECT_REF}.supabase.co/auth/v1")
            # Supabase JWT verification
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM],
                audience="authenticated",
                options={
                    "verify_aud": True,
                    "verify_iss": True,
                    "verify_iat": True,
                    "verify_exp": True,
                    "verify_nbf": False
                },
                issuer=f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co/auth/v1"
            )
        else:
            # Fallback to basic JWT verification without Supabase
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
        logger.debug(f"Token decoded successfully. User email: {payload.get('email')}")
        return payload
    except ExpiredSignatureError as e:
        logger.error(f"Token expired: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTClaimsError as e:
        logger.error(f"Invalid token claims: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token claims: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user_from_token(token: str) -> Dict[str, Any]:
    """Get user payload from JWT token"""
    try:
        payload = decode_token(token)
        return payload
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


class AESCipher:
    """AES encryption/decryption for sensitive data"""
    
    def __init__(self, key: str):
        self.key = hashlib.sha256(key.encode()).digest()
    
    def encrypt(self, data: str) -> str:
        """Encrypt data using AES-256"""
        cipher = AES.new(self.key, AES.MODE_CBC)
        ct_bytes = cipher.encrypt(pad(data.encode(), AES.block_size))
        iv = base64.b64encode(cipher.iv).decode('utf-8')
        ct = base64.b64encode(ct_bytes).decode('utf-8')
        return f"{iv}::{ct}"
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt AES-256 encrypted data"""
        try:
            iv, ct = encrypted_data.split("::")
            iv = base64.b64decode(iv)
            ct = base64.b64decode(ct)
            cipher = AES.new(self.key, AES.MODE_CBC, iv)
            pt = unpad(cipher.decrypt(ct), AES.block_size)
            return pt.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")


# Initialize cipher with encryption key
cipher = AESCipher(settings.ENCRYPTION_KEY)


def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data like PII"""
    return cipher.encrypt(data)


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data"""
    return cipher.decrypt(encrypted_data)


def validate_file_type(filename: str, content: bytes) -> bool:
    """Validate file type by extension and magic bytes"""
    import magic
    
    # Check extension
    extension = filename.rsplit('.', 1)[-1].lower()
    if extension not in settings.ALLOWED_EXTENSIONS:
        return False
    
    # Check magic bytes
    try:
        mime = magic.from_buffer(content, mime=True)
        valid_mimes = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'txt': 'text/plain'
        }
        
        return mime == valid_mimes.get(extension)
    except Exception:
        return False


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal attacks"""
    import re
    import os
    
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove dangerous characters
    filename = re.sub(r'[^\w\s\-\.]', '', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:250] + ext
    
    return filename


def sanitize_string_input(value: str, max_length: int = 10000) -> str:
    """
    Sanitize string input to prevent XSS and injection attacks.
    Use for user-provided text that will be stored/displayed.
    """
    import re
    import html
    
    if not value:
        return value
    
    # Truncate to max length
    value = value[:max_length]
    
    # HTML encode to prevent XSS
    value = html.escape(value)
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Remove other control characters except newlines and tabs
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)
    
    return value.strip()


def generate_secure_filename(original_filename: str) -> str:
    """Generate a secure unique filename"""
    import uuid
    from datetime import datetime
    
    sanitized = sanitize_filename(original_filename)
    extension = sanitized.rsplit('.', 1)[-1] if '.' in sanitized else ''
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    
    return f"{timestamp}_{unique_id}.{extension}" if extension else f"{timestamp}_{unique_id}"
