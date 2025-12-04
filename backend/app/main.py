"""Main FastAPI application"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
import logging
from logging.handlers import RotatingFileHandler
import os

# Import Sentry SDK
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

from app.core.config import settings
from app.core.resilience import (
    configure_structured_logging,
    get_logger,
    set_request_context,
    clear_request_context,
    check_circuit_breakers,
)
from app.core.telemetry import (
    setup_telemetry,
    metrics_endpoint,
    record_request_metrics,
    REQUEST_IN_PROGRESS,
)
from app.api.routes import auth, resumes, pdf_edit, jobs, interview, profile, applications, ats
from app.api.routes import interview_ws  # WebSocket routes
from app.middleware.security import (
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
    RequestValidationMiddleware,
    DDoSProtectionMiddleware,
    limiter,
    rate_limit_exceeded_handler
)
from app.middleware.timeout import TimeoutMiddleware
from app.db.database import engine, Base, async_engine

# ============================================================================
# SENTRY INITIALIZATION - Must be before FastAPI app creation
# ============================================================================

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release=f"applyx-backend@{settings.APP_VERSION}",
        
        # Performance Monitoring
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,
        
        # Integrations
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
            LoggingIntegration(level=logging.WARNING, event_level=logging.ERROR),
        ],
        
        # Privacy - Don't send PII
        send_default_pii=False,
        
        # Filter out health checks from performance monitoring
        before_send_transaction=lambda event, hint: (
            None if event.get("transaction") in ["/health", "/health/deep", "/"] 
            else event
        ),
        
        # Add tags
        _experiments={
            "profiles_sample_rate": settings.SENTRY_PROFILES_SAMPLE_RATE,
        },
    )
    
    # Set default tags
    sentry_sdk.set_tag("service", "applyx-backend")
    sentry_sdk.set_tag("environment", settings.SENTRY_ENVIRONMENT)

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

os.makedirs("logs", exist_ok=True)

# Configure structured logging
configure_structured_logging(
    log_level=settings.LOG_LEVEL,
    json_format=settings.LOG_JSON_FORMAT and settings.ENVIRONMENT == "production",
    service_name="applyx-backend",
)

# Also keep traditional logging for compatibility
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            settings.LOG_FILE,
            maxBytes=10485760,  # 10MB
            backupCount=5
        ),
        logging.StreamHandler()
    ]
)

logger = get_logger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# ============================================================================
# GRACEFUL SHUTDOWN
# ============================================================================

shutdown_event = asyncio.Event()


async def graceful_shutdown():
    """Handle graceful shutdown - close connections properly"""
    logger.info("Starting graceful shutdown...")
    
    # Wait for in-flight requests (max 10 seconds)
    logger.info("Waiting for in-flight requests to complete...")
    await asyncio.sleep(2)  # Give requests time to complete
    
    # Close async database connections
    if async_engine is not None:
        try:
            await async_engine.dispose()
            logger.info("Async database connections closed")
        except Exception as e:
            logger.error("Error closing async database", error=str(e))
    
    # Close sync database connections
    try:
        engine.dispose()
        logger.info("Sync database connections closed")
    except Exception as e:
        logger.error("Error closing sync database", error=str(e))
    
    # Close Redis connections
    try:
        from app.services.cache import close_redis
        await close_redis()
        logger.info("Redis connections closed")
    except Exception as e:
        logger.error("Error closing Redis", error=str(e))
    
    # Flush Sentry events
    if settings.SENTRY_DSN:
        sentry_sdk.flush(timeout=5.0)
        logger.info("Sentry events flushed")
    
    logger.info("Graceful shutdown complete")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with graceful shutdown"""
    
    # Startup
    logger.info(
        "Application starting",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        debug=settings.DEBUG,
        sentry_enabled=bool(settings.SENTRY_DSN),
        otel_enabled=settings.OTEL_ENABLED,
    )
    
    # Setup OpenTelemetry after app is created
    if settings.OTEL_ENABLED:
        setup_telemetry(app=app, db_engine=engine)
        logger.info("OpenTelemetry instrumentation enabled")
    
    yield
    
    # Shutdown
    await graceful_shutdown()


# ============================================================================
# FASTAPI APP CREATION
# ============================================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Secure backend API for resume analysis and feedback",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Add rate limiter state
app.state.limiter = limiter

# CORS middleware
# Convert comma-separated string to list of origins
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
logger.info(f"CORS Origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)
logger.info("CORS middleware configured with all methods including OPTIONS")

# Security middleware (order matters - DDoS first, then validation, then logging, then headers)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestValidationMiddleware)
app.add_middleware(DDoSProtectionMiddleware)  # First line of defense
app.add_middleware(TimeoutMiddleware, default_timeout=60)  # Global request timeout

# Exception handlers
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return rate_limit_exceeded_handler(request, exc)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Request validation failed"
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception",
        error=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True,
    )
    
    # Report to Sentry
    if settings.SENTRY_DSN:
        sentry_sdk.capture_exception(exc)
    
    # Never expose internal error details in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal error occurred. Please try again later."
        }
    )


# ============================================================================
# REQUEST CONTEXT MIDDLEWARE
# ============================================================================

@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Add request ID, context, and metrics to all requests"""
    import time
    
    # Get or generate request ID
    request_id = request.headers.get("X-Request-ID") or None
    request_id = set_request_context(request_id=request_id)
    
    # Add user context if available
    if hasattr(request.state, "user") and request.state.user:
        sentry_sdk.set_user({"id": str(request.state.user.id)})
    
    # Track request metrics
    endpoint = request.url.path
    method = request.method
    
    # Track in-progress requests
    REQUEST_IN_PROGRESS.labels(method=method, endpoint=endpoint).inc()
    start_time = time.perf_counter()
    
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        # Record metrics
        duration = time.perf_counter() - start_time
        record_request_metrics(method, endpoint, response.status_code, duration)
        
        return response
    except Exception as e:
        # Record error metrics
        duration = time.perf_counter() - start_time
        record_request_metrics(method, endpoint, 500, duration)
        raise
    finally:
        REQUEST_IN_PROGRESS.labels(method=method, endpoint=endpoint).dec()
        clear_request_context()
        sentry_sdk.set_user(None)


# Health check endpoint - Basic
@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


# Health check endpoint - Deep (with dependencies)
@app.get("/health/deep", tags=["Health"])
async def deep_health_check():
    """
    Deep health check - verifies all dependencies.
    Use this for Kubernetes readiness probes.
    """
    from app.core.resilience import check_database_health, check_redis_health
    from app.services.cache_service import get_async_redis
    
    health = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": {},
    }
    
    # Check database
    if async_engine is not None:
        try:
            db_health = await check_database_health(async_engine)
            health["checks"]["database"] = db_health
            if db_health["status"] != "healthy":
                health["status"] = "degraded"
        except Exception as e:
            health["checks"]["database"] = {"status": "unhealthy", "error": str(e)}
            health["status"] = "unhealthy"
    else:
        health["checks"]["database"] = {"status": "sync_only", "message": "Async engine not available"}
    
    # Check Redis
    try:
        from app.services.cache import get_redis
        redis = await get_redis()
        redis_health = await check_redis_health(redis)
        health["checks"]["redis"] = redis_health
        if redis_health["status"] != "healthy":
            health["status"] = "degraded"
    except Exception as e:
        health["checks"]["redis"] = {"status": "unhealthy", "error": str(e)}
        health["status"] = "degraded"  # Redis is optional, degrade but don't fail
    
    # Check circuit breakers
    health["checks"]["circuit_breakers"] = check_circuit_breakers()
    
    return health


# Prometheus metrics endpoint
@app.get("/metrics", tags=["Monitoring"], include_in_schema=False)
async def prometheus_metrics():
    """Prometheus metrics endpoint for scraping"""
    if not settings.PROMETHEUS_ENABLED:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "Metrics disabled"}
        )
    
    from fastapi.responses import Response
    metrics, content_type = await metrics_endpoint()
    return Response(content=metrics, media_type=content_type)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.DEBUG else "Documentation disabled in production"
    }


# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(resumes.router, prefix="/api/v1")
app.include_router(pdf_edit.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(interview_ws.router, prefix="/api/v1")  # WebSocket routes
app.include_router(profile.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1/applications", tags=["Applications"])
app.include_router(ats.router, prefix="/api/v1", tags=["ATS Scoring"])


# Startup event (deprecated but kept for compatibility)
@app.on_event("startup")
async def startup_event():
    logger.info(
        "Application started",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
    )


# Shutdown event (deprecated but kept for compatibility)
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown event triggered")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
