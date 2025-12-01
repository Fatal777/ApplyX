"""
Optimized Security Middleware for Production
Target: Sub-10ms overhead per request
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import time
from typing import Callable, Set, FrozenSet
from functools import lru_cache
from collections import defaultdict
from datetime import datetime, timedelta
import hashlib
import re

logger = logging.getLogger(__name__)

# =============================================================================
# RATE LIMITING - Using Redis backend for distributed systems
# =============================================================================

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000/minute"],  # High default for production
    storage_uri="memory://",  # Switch to redis:// in production cluster
)

# =============================================================================
# COMPILE PATTERNS ONCE AT MODULE LOAD (huge perf gain)
# =============================================================================

# Pre-compiled regex patterns for O(1) lookup
_SUSPICIOUS_PATTERNS: FrozenSet[str] = frozenset([
    '..', '<script', 'javascript:', 'onerror=', 'onload=',
    'eval(', 'exec(', 'union select', 'drop table', '1=1',
    '../', '..\\', '%2e%2e', '%252e', 'etc/passwd', 'cmd.exe',
    '${', '#{', '{{', '<%', '<?php'
])

# Pre-compiled bot detection pattern (single regex, much faster)
_BOT_PATTERN = re.compile(
    r'bot|crawler|spider|scraper|curl|wget|python-requests|'
    r'httpx|aiohttp|go-http-client|java/|libwww|scanner|'
    r'nuclei|nikto|sqlmap|nmap|masscan|zgrab|dirbuster|'
    r'gobuster|ffuf|wfuzz|burp|zap|acunetix',
    re.IGNORECASE
)

_ALLOWED_BOT_PATTERN = re.compile(
    r'googlebot|bingbot|yandexbot|duckduckbot|slurp',
    re.IGNORECASE
)

# Excluded paths as frozenset for O(1) lookup
_EXCLUDED_PATHS: FrozenSet[str] = frozenset([
    "/health", "/", "/docs", "/openapi.json", "/redoc"
])

# =============================================================================
# LRU CACHED FUNCTIONS - Avoid repeated computation
# =============================================================================

@lru_cache(maxsize=10000)
def is_suspicious_path(path: str) -> bool:
    """Cache suspicious path checks - most paths are clean."""
    path_lower = path.lower()
    return any(p in path_lower for p in _SUSPICIOUS_PATTERNS)


@lru_cache(maxsize=5000)
def check_user_agent(user_agent: str) -> tuple:
    """
    Cache user agent checks.
    Returns: (is_bot, is_allowed_bot)
    """
    if not user_agent:
        return True, False
    
    if _ALLOWED_BOT_PATTERN.search(user_agent):
        return True, True
    
    if _BOT_PATTERN.search(user_agent):
        return True, False
    
    return False, False


@lru_cache(maxsize=1000)
def get_client_fingerprint_cached(ip: str, ua: str, lang: str) -> str:
    """Cached fingerprint generation."""
    return hashlib.md5(f"{ip}|{ua}|{lang}".encode()).hexdigest()[:12]


# =============================================================================
# LIGHTWEIGHT RATE TRACKING (In-memory with TTL)
# =============================================================================

class RateBucket:
    """Simple sliding window rate limiter with minimal overhead."""
    __slots__ = ['count', 'window_start']
    
    def __init__(self):
        self.count = 0
        self.window_start = time.monotonic()


# Global rate tracking with automatic cleanup
_rate_buckets: dict = {}
_blocked_ips: Set[str] = set()
_last_cleanup = time.monotonic()

RATE_WINDOW = 1.0  # 1 second window
RATE_LIMIT = 50    # 50 requests per second per IP
CLEANUP_INTERVAL = 60  # Cleanup every 60 seconds


def check_rate_limit(ip: str) -> bool:
    """
    Ultra-fast rate limiting check.
    Returns True if allowed, False if rate limited.
    """
    global _last_cleanup
    now = time.monotonic()
    
    # Periodic cleanup (non-blocking)
    if now - _last_cleanup > CLEANUP_INTERVAL:
        _rate_buckets.clear()
        _blocked_ips.clear()
        _last_cleanup = now
    
    # Check blocked IPs first (O(1))
    if ip in _blocked_ips:
        return False
    
    # Get or create bucket
    bucket = _rate_buckets.get(ip)
    if bucket is None:
        bucket = RateBucket()
        _rate_buckets[ip] = bucket
    
    # Reset window if expired
    if now - bucket.window_start > RATE_WINDOW:
        bucket.count = 1
        bucket.window_start = now
        return True
    
    # Increment and check
    bucket.count += 1
    if bucket.count > RATE_LIMIT:
        _blocked_ips.add(ip)
        logger.warning(f"Rate limit exceeded for {ip}")
        return False
    
    return True


# =============================================================================
# COMBINED OPTIMIZED MIDDLEWARE
# =============================================================================

class OptimizedSecurityMiddleware(BaseHTTPMiddleware):
    """
    Single combined middleware for all security checks.
    Target: <5ms overhead per request.
    
    Order of checks (fastest first):
    1. Path exclusion check (O(1) set lookup)
    2. Rate limiting (O(1) dict lookup)
    3. Bot detection (cached)
    4. Path validation (cached)
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        
        path = request.url.path
        method = request.method
        
        # 1. Skip excluded paths immediately (O(1))
        if path in _EXCLUDED_PATHS or method == "OPTIONS":
            response = await call_next(request)
            return self._add_headers(response, start_time)
        
        # 2. Fast rate limit check
        client_ip = self._get_ip(request)
        if not check_rate_limit(client_ip):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded"},
                headers={"Retry-After": "1"}
            )
        
        # 3. Bot detection (cached)
        user_agent = request.headers.get("user-agent", "")
        is_bot, is_allowed = check_user_agent(user_agent)
        if is_bot and not is_allowed:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Access denied"}
            )
        
        # 4. Path validation (cached)
        if is_suspicious_path(path):
            logger.warning(f"Blocked suspicious request: {path}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "Invalid request"}
            )
        
        # 5. Query string validation (only if present)
        if request.url.query and is_suspicious_path(request.url.query):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "Invalid request"}
            )
        
        # Process request
        response = await call_next(request)
        return self._add_headers(response, start_time)
    
    def _get_ip(self, request: Request) -> str:
        """Get client IP with X-Forwarded-For support."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _add_headers(self, response: Response, start_time: float) -> Response:
        """Add security and timing headers."""
        process_time = (time.perf_counter() - start_time) * 1000
        
        # Essential headers only
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        return response


# =============================================================================
# RATE LIMIT HANDLER
# =============================================================================

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Handle slowapi rate limit exceeded."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Rate limit exceeded", "retry_after": "60"},
        headers={"Retry-After": "60"}
    )


# =============================================================================
# LEGACY EXPORTS (for backward compatibility)
# =============================================================================

# These are no-op for backward compatibility during migration
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        return await call_next(request)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        return await call_next(request)

class RequestValidationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        return await call_next(request)

class DDoSProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        return await call_next(request)
