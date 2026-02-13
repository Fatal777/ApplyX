"""Security middleware for request validation and protection"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import time
import re
import hashlib
from typing import Callable, Dict, Set
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)

# =============================================================================
# RATE LIMITING CONFIGURATION
# =============================================================================

limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations per endpoint type
RATE_LIMITS = {
    "default": "60/minute",
    "auth": "5/minute",           # Strict for login/register
    "upload": "10/minute",        # File uploads
    "ai": "20/minute",            # AI-powered endpoints
    "search": "30/minute",        # Search endpoints
}

# =============================================================================
# BRUTE FORCE PROTECTION
# =============================================================================

_login_attempts: dict = {}
LOGIN_ATTEMPT_LIMIT = 5
LOCKOUT_DURATION_MINUTES = 15


def check_brute_force(ip_address: str) -> bool:
    """Check if IP is locked out due to too many failed attempts."""
    if ip_address not in _login_attempts:
        return True
    
    attempt_data = _login_attempts[ip_address]
    
    if attempt_data.get("locked_until"):
        if datetime.utcnow() > attempt_data["locked_until"]:
            del _login_attempts[ip_address]
            return True
        return False
    
    return attempt_data.get("count", 0) < LOGIN_ATTEMPT_LIMIT


def record_failed_login(ip_address: str):
    """Record a failed login attempt."""
    if ip_address not in _login_attempts:
        _login_attempts[ip_address] = {"count": 0, "locked_until": None}
    
    _login_attempts[ip_address]["count"] += 1
    
    if _login_attempts[ip_address]["count"] >= LOGIN_ATTEMPT_LIMIT:
        _login_attempts[ip_address]["locked_until"] = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        logger.warning(f"IP {ip_address} locked out for {LOCKOUT_DURATION_MINUTES} minutes")


def clear_login_attempts(ip_address: str):
    """Clear login attempts after successful login."""
    if ip_address in _login_attempts:
        del _login_attempts[ip_address]


# =============================================================================
# BOT DETECTION & PROTECTION
# =============================================================================

# Known bot user agents (lowercase for matching)
BOT_USER_AGENTS = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
    'httpx', 'aiohttp', 'go-http-client', 'java/', 'libwww', 'lwp-trivial',
    'scanner', 'nuclei', 'nikto', 'sqlmap', 'nmap', 'masscan', 'zgrab',
    'dirbuster', 'gobuster', 'ffuf', 'wfuzz', 'burp', 'zap', 'acunetix'
]

# Allowed good bots (search engines)
ALLOWED_BOTS = ['googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp']

# Request pattern tracking for behavioral analysis
_request_patterns: Dict[str, Dict] = defaultdict(lambda: {
    "requests": [],
    "endpoints": set(),
    "suspicious_score": 0,
    "last_cleanup": datetime.utcnow()
})

# Thresholds (more lenient to avoid false positives)
REQUESTS_PER_SECOND_THRESHOLD = 30  # Max requests per second from single IP
ENDPOINT_DIVERSITY_THRESHOLD = 100  # Hitting too many different endpoints quickly
SUSPICIOUS_SCORE_THRESHOLD = 200    # Block when score exceeds this
PATTERN_WINDOW_SECONDS = 60         # Time window for pattern analysis


def is_bot_user_agent(user_agent: str) -> tuple[bool, bool]:
    """
    Check if user agent indicates a bot.
    Returns: (is_bot, is_allowed_bot)
    """
    if not user_agent:
        return True, False  # No UA = suspicious
    
    ua_lower = user_agent.lower()
    
    # Check allowed bots first
    for allowed in ALLOWED_BOTS:
        if allowed in ua_lower:
            return True, True
    
    # Check malicious bots
    for bot in BOT_USER_AGENTS:
        if bot in ua_lower:
            return True, False
    
    return False, False


def analyze_request_pattern(ip: str, path: str, method: str) -> int:
    """
    Analyze request patterns to detect bot behavior.
    Returns suspicious score increment.
    """
    now = datetime.utcnow()
    pattern = _request_patterns[ip]
    
    # Cleanup old data periodically
    if (now - pattern["last_cleanup"]).total_seconds() > PATTERN_WINDOW_SECONDS:
        pattern["requests"] = [r for r in pattern["requests"] 
                              if (now - r).total_seconds() < PATTERN_WINDOW_SECONDS]
        pattern["endpoints"] = set()
        pattern["last_cleanup"] = now
    
    # Record this request
    pattern["requests"].append(now)
    pattern["endpoints"].add(f"{method}:{path}")
    
    score_increment = 0
    
    # Check requests per second (recent 1 second)
    recent_requests = [r for r in pattern["requests"] if (now - r).total_seconds() < 1]
    if len(recent_requests) > REQUESTS_PER_SECOND_THRESHOLD:
        score_increment += 30
        logger.warning(f"High request rate from {ip}: {len(recent_requests)}/s")
    
    # Check endpoint diversity (hitting many different endpoints)
    if len(pattern["endpoints"]) > ENDPOINT_DIVERSITY_THRESHOLD:
        score_increment += 20
        logger.warning(f"High endpoint diversity from {ip}: {len(pattern['endpoints'])} endpoints")
    
    # Check for scanning patterns (sequential IDs, common vuln paths)
    scanning_patterns = [
        r'/api/v1/\w+/\d+',  # Sequential ID enumeration
        r'\.\./',            # Path traversal
        r'(admin|backup|config|\.git|\.env|wp-)',  # Common scan targets
    ]
    for scan_pattern in scanning_patterns:
        if re.search(scan_pattern, path, re.IGNORECASE):
            score_increment += 15
    
    pattern["suspicious_score"] += score_increment
    return pattern["suspicious_score"]


def is_ip_blocked(ip: str) -> bool:
    """Check if IP should be blocked based on suspicious behavior."""
    if ip in _request_patterns:
        return _request_patterns[ip]["suspicious_score"] >= SUSPICIOUS_SCORE_THRESHOLD
    return False


def get_client_fingerprint(request: Request) -> str:
    """Generate a fingerprint for the client based on multiple factors."""
    components = [
        get_remote_address(request),
        request.headers.get("user-agent", ""),
        request.headers.get("accept-language", ""),
        request.headers.get("accept-encoding", ""),
    ]
    fingerprint = hashlib.sha256("|".join(components).encode()).hexdigest()[:16]
    return fingerprint


# =============================================================================
# DDOS PROTECTION MIDDLEWARE
# =============================================================================

class DDoSProtectionMiddleware(BaseHTTPMiddleware):
    """
    DDoS and bot protection middleware.
    
    Features:
    - Request rate analysis per IP
    - Bot user agent detection
    - Behavioral pattern analysis
    - Automatic IP blocking for suspicious activity
    """
    
    # Paths to exclude from strict checking (health checks, public APIs, etc.)
    EXCLUDED_PATHS = [
        "/health", "/", "/docs", "/openapi.json",
        "/api/v1/livekit/status",
        "/api/v1/jobs/search", "/api/v1/jobs/fast-search",
        "/api/v1/jobs/sources", "/api/v1/auth/login", "/api/v1/auth/register"
    ]
    
    # Paths with relaxed checking (still monitored but with higher tolerance)
    RELAXED_PATHS = ["/api/v1/jobs", "/api/v1/resumes", "/api/v1/interviews"]
    
    async def dispatch(self, request: Request, call_next: Callable):
        path = request.url.path
        
        # Skip protection for excluded paths (exact match or prefix match)
        if path in self.EXCLUDED_PATHS or any(path.startswith(p) for p in self.RELAXED_PATHS):
            return await call_next(request)
        
        # Skip for OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        client_ip = get_remote_address(request)
        user_agent = request.headers.get("user-agent", "")
        
        # 1. Check if IP is already blocked
        if is_ip_blocked(client_ip):
            logger.warning(f"Blocked request from suspicious IP: {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Access denied due to suspicious activity"}
            )
        
        # 2. Bot detection
        is_bot, is_allowed = is_bot_user_agent(user_agent)
        if is_bot and not is_allowed:
            logger.warning(f"Blocked bot request from {client_ip}: {user_agent[:50]}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Automated requests are not allowed"}
            )
        
        # 3. Analyze request patterns
        suspicious_score = analyze_request_pattern(
            client_ip, 
            request.url.path, 
            request.method
        )
        
        if suspicious_score >= SUSPICIOUS_SCORE_THRESHOLD:
            logger.error(f"IP {client_ip} blocked - suspicious score: {suspicious_score}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please slow down."}
            )
        
        # 4. Add fingerprint header for tracking
        response = await call_next(request)
        
        return response


# =============================================================================
# SECURITY HEADERS MIDDLEWARE
# =============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response
            
        response = await call_next(request)
        
        # Essential security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(self), camera=(self)"
        
        # HSTS for production
        if not request.url.hostname or not request.url.hostname.startswith(("localhost", "127.0.0.1")):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        
        return response


# =============================================================================
# REQUEST LOGGING MIDDLEWARE
# =============================================================================

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all incoming requests with sanitized data"""
    
    SENSITIVE_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"]
    
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        
        path = request.url.path
        if any(sensitive in path for sensitive in self.SENSITIVE_PATHS):
            log_path = path
        else:
            log_path = path
        
        logger.info(f"Request: {request.method} {log_path}")
        
        try:
            response = await call_next(request)
            
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            logger.info(
                f"Response: {request.method} {request.url.path} "
                f"Status: {response.status_code} Time: {process_time:.3f}s"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Request failed: {request.method} {request.url.path} Error: {str(e)}")
            raise


# =============================================================================
# REQUEST VALIDATION MIDDLEWARE
# =============================================================================

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Validate and sanitize incoming requests"""
    
    # Expanded suspicious patterns
    SUSPICIOUS_PATTERNS = [
        '..', '<script', 'javascript:', 'onerror=', 'onload=',
        'eval(', 'exec(', 'union select', 'drop table', '1=1',
        '../', '..\\', '%2e%2e', '%252e', 'etc/passwd', 'cmd.exe',
        '${', '#{', '{{', '<%', '<?php'
    ]
    
    async def dispatch(self, request: Request, call_next: Callable):
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Check URL path
        url_path = str(request.url.path).lower()
        query_string = str(request.url.query).lower() if request.url.query else ""
        
        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern in url_path or pattern in query_string:
                client_ip = get_remote_address(request)
                logger.warning(f"Blocked suspicious request from {client_ip}: {pattern} in {request.url}")
                
                # Increase suspicious score for this IP
                if client_ip in _request_patterns:
                    _request_patterns[client_ip]["suspicious_score"] += 50
                
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid request"}
                )
        
        # Validate content type
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            if not any(ct in content_type for ct in ["application/json", "multipart/form-data"]):
                if request.url.path not in ["/docs", "/openapi.json"]:
                    logger.warning(f"Invalid content type: {content_type}")
        
        # Check request size (basic protection against large payload attacks)
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                # 10MB max for any request
                if size > 10 * 1024 * 1024:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": "Request too large"}
                    )
            except ValueError:
                pass
        
        return await call_next(request)


# =============================================================================
# RATE LIMIT HANDLER
# =============================================================================

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded errors"""
    client_ip = get_remote_address(request)
    logger.warning(f"Rate limit exceeded for {client_ip}")
    
    # Increase suspicious score
    if client_ip in _request_patterns:
        _request_patterns[client_ip]["suspicious_score"] += 10
    
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "retry_after": exc.detail
        }
    )


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_blocked_ips() -> list:
    """Get list of currently blocked IPs (for monitoring)."""
    return [ip for ip, data in _request_patterns.items() 
            if data["suspicious_score"] >= SUSPICIOUS_SCORE_THRESHOLD]


def unblock_ip(ip: str):
    """Manually unblock an IP address."""
    if ip in _request_patterns:
        _request_patterns[ip]["suspicious_score"] = 0
        logger.info(f"IP {ip} manually unblocked")


def cleanup_old_patterns():
    """Cleanup old pattern data (call periodically)."""
    now = datetime.utcnow()
    expired = []
    
    for ip, data in _request_patterns.items():
        if (now - data["last_cleanup"]).total_seconds() > 3600:  # 1 hour
            expired.append(ip)
    
    for ip in expired:
        del _request_patterns[ip]
    
    if expired:
        logger.info(f"Cleaned up pattern data for {len(expired)} IPs")
