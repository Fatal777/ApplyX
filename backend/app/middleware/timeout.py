"""
Request Timeout Middleware
==========================

Adds a global timeout to all requests to prevent:
1. Hanging requests from exhausting worker pool
2. Slow external API calls from blocking the server
3. Runaway database queries

The timeout is configurable via REQUEST_TIMEOUT_SECONDS setting.
"""

import asyncio
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.resilience import get_logger

logger = get_logger(__name__)

# Default timeout in seconds
DEFAULT_TIMEOUT = 60

# Endpoints that need longer timeouts
EXTENDED_TIMEOUT_PATHS = {
    "/api/v1/resumes/analyze": 120,  # Resume analysis with AI
    "/api/v1/resumes/generate-pdf": 90,  # PDF generation
    "/api/v1/interview": 300,  # Interview sessions
    "/api/v1/jobs/match": 60,  # Job matching
    "/api/v1/ats/score": 60,  # ATS scoring with AI
}


def get_timeout_for_path(path: str) -> int:
    """Get appropriate timeout for a given path"""
    for pattern, timeout in EXTENDED_TIMEOUT_PATHS.items():
        if path.startswith(pattern):
            return timeout
    return DEFAULT_TIMEOUT


class TimeoutMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds timeout to all requests.
    
    Features:
    - Configurable default timeout
    - Per-endpoint timeout overrides
    - Graceful timeout handling with proper error response
    - Logging for timeout events
    """
    
    def __init__(self, app, default_timeout: int = DEFAULT_TIMEOUT):
        super().__init__(app)
        self.default_timeout = default_timeout
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip timeout for certain paths
        if request.url.path in ["/health", "/health/deep", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Get timeout for this path
        timeout = get_timeout_for_path(request.url.path)
        
        try:
            # Run the request with timeout
            response = await asyncio.wait_for(
                call_next(request),
                timeout=timeout
            )
            return response
            
        except asyncio.TimeoutError:
            logger.error(
                "Request timed out",
                path=request.url.path,
                method=request.method,
                timeout_seconds=timeout,
            )
            
            return JSONResponse(
                status_code=504,
                content={
                    "detail": "Request timed out. Please try again.",
                    "timeout_seconds": timeout,
                }
            )
