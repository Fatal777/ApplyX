"""
Production-Optimized FastAPI Application
Target: Single-digit millisecond latency for API responses
"""

import sys
import asyncio

# Windows-specific event loop fix for psycopg3
if sys.platform == "win32":
    import selectors
    # Use SelectorEventLoop instead of ProactorEventLoop for psycopg3 compatibility
    selector = selectors.SelectSelector()
    loop = asyncio.SelectorEventLoop(selector)
    asyncio.set_event_loop(loop)

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, ORJSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import logging
from logging.handlers import RotatingFileHandler
import os

from app.core.config import settings
from app.api.routes import auth, resumes, pdf_edit, jobs, interview, profile
from app.middleware.optimized_security import (
    OptimizedSecurityMiddleware,
    limiter,
    rate_limit_exceeded_handler
)
from app.db.async_database import init_db, close_db
from app.services.cache import warm_cache, close_redis

# =============================================================================
# LOGGING SETUP - Async-safe logging
# =============================================================================

os.makedirs("logs", exist_ok=True)

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            settings.LOG_FILE,
            maxBytes=10485760,
            backupCount=5
        ),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


# =============================================================================
# LIFESPAN - Async startup/shutdown
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Async lifespan manager for startup/shutdown."""
    # Startup
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} starting...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    # Initialize async database
    await init_db()
    logger.info("Database initialized")
    
    # Warm up cache
    await warm_cache()
    logger.info("Cache warmed up")
    
    yield
    
    # Shutdown
    logger.info(f"{settings.APP_NAME} shutting down...")
    await close_db()
    await close_redis()


# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="High-performance resume analysis API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
    # Performance optimizations
    default_response_class=ORJSONResponse,  # Faster JSON serialization
)

# Add rate limiter state
app.state.limiter = limiter


# =============================================================================
# MIDDLEWARE STACK (Order matters - first added = last executed)
# =============================================================================

# 1. GZip compression (outermost - compresses responses)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. CORS (must handle OPTIONS quickly)
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=86400,  # Cache preflight for 24 hours
)

# 3. Combined security middleware (single middleware for all security)
app.add_middleware(OptimizedSecurityMiddleware)


# =============================================================================
# EXCEPTION HANDLERS
# =============================================================================

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return rate_limit_exceeded_handler(request, exc)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return ORJSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Validation failed"}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return ORJSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# =============================================================================
# HEALTH CHECK - Ultra-fast response
# =============================================================================

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check - sub-1ms response."""
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {"message": f"Welcome to {settings.APP_NAME}", "version": settings.APP_VERSION}


# =============================================================================
# ROUTES
# =============================================================================

app.include_router(auth.router, prefix="/api/v1")
app.include_router(resumes.router, prefix="/api/v1")
app.include_router(pdf_edit.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")


# =============================================================================
# UVICORN RUNNER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    import sys
    
    # uvloop only available on Linux/macOS
    loop_type = "uvloop" if sys.platform != "win32" else "auto"
    
    uvicorn.run(
        "app.main_optimized:app",
        host="0.0.0.0",
        port=8000,
        workers=4,  # Multiple workers for production
        loop=loop_type,  # uvloop on Linux, default on Windows
        http="httptools",  # Faster HTTP parser
        log_level="warning",  # Reduce log overhead
        access_log=False,  # Disable access log for speed
        reload=settings.DEBUG,
    )
