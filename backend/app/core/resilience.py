"""
Production Resilience Module
=============================

Implements production-grade resilience patterns:
1. Circuit Breaker - Prevents cascading failures
2. Retry with Backoff - Handles transient failures
3. Structured Logging - JSON logs with correlation IDs
4. Request Context - Track requests across services

Usage:
    from app.core.resilience import (
        get_circuit_breaker,
        with_retry,
        get_logger,
        request_context
    )
"""

import asyncio
import functools
import logging
import time
import uuid
from contextvars import ContextVar
from datetime import datetime
from typing import Any, Callable, Dict, Optional, TypeVar

import pybreaker
import structlog
from structlog.contextvars import bind_contextvars, clear_contextvars

# Type variable for generic functions
T = TypeVar("T")

# ============================================================================
# REQUEST CONTEXT - Track requests across async boundaries
# ============================================================================

# Context variables for request tracking
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[Optional[str]] = ContextVar("user_id", default=None)
start_time_var: ContextVar[float] = ContextVar("start_time", default=0.0)


def generate_request_id() -> str:
    """Generate a unique request ID"""
    return str(uuid.uuid4())[:8]


def set_request_context(
    request_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> str:
    """Set request context for logging and tracing"""
    rid = request_id or generate_request_id()
    request_id_var.set(rid)
    start_time_var.set(time.time())
    
    if user_id:
        user_id_var.set(user_id)
    
    # Bind to structlog context
    bind_contextvars(
        request_id=rid,
        user_id=user_id,
    )
    
    return rid


def clear_request_context():
    """Clear request context after request completes"""
    clear_contextvars()
    request_id_var.set("")
    user_id_var.set(None)
    start_time_var.set(0.0)


def get_request_duration() -> float:
    """Get duration of current request in milliseconds"""
    start = start_time_var.get()
    if start:
        return (time.time() - start) * 1000
    return 0.0


# ============================================================================
# STRUCTURED LOGGING - JSON logs with context
# ============================================================================

def configure_structured_logging(
    log_level: str = "INFO",
    json_format: bool = True,
    service_name: str = "applyx-backend"
):
    """
    Configure structured logging with structlog.
    
    In production:
    - JSON format for log aggregation (ELK, Datadog, etc.)
    - Request ID correlation
    - Automatic context binding
    
    In development:
    - Pretty console output
    - Colors for readability
    """
    
    # Common processors for all environments
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]
    
    if json_format:
        # Production: JSON output
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ]
    else:
        # Development: Pretty console output
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Configure stdlib logging to route through structlog
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, log_level.upper()),
    )


def get_logger(name: str = None) -> structlog.BoundLogger:
    """
    Get a structured logger with automatic context.
    
    Example:
        logger = get_logger(__name__)
        logger.info("Processing request", endpoint="/api/v1/resumes", user_id="123")
        
    Output (JSON):
        {
            "event": "Processing request",
            "endpoint": "/api/v1/resumes",
            "user_id": "123",
            "request_id": "abc123",
            "timestamp": "2024-01-15T10:30:00Z",
            "level": "info"
        }
    """
    logger = structlog.get_logger(name)
    return logger


# ============================================================================
# CIRCUIT BREAKER - Prevent cascading failures
# ============================================================================

# Circuit breakers for different external services
_circuit_breakers: Dict[str, pybreaker.CircuitBreaker] = {}


class CircuitBreakerListener(pybreaker.CircuitBreakerListener):
    """Listener to log circuit breaker state changes"""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = get_logger(f"circuit_breaker.{name}")
    
    def state_change(self, cb: pybreaker.CircuitBreaker, old_state, new_state):
        self.logger.warning(
            "Circuit breaker state changed",
            breaker=self.name,
            old_state=str(old_state),
            new_state=str(new_state),
            fail_counter=cb.fail_counter,
        )
    
    def failure(self, cb: pybreaker.CircuitBreaker, exc: Exception):
        self.logger.error(
            "Circuit breaker recorded failure",
            breaker=self.name,
            error=str(exc),
            fail_counter=cb.fail_counter,
        )
    
    def success(self, cb: pybreaker.CircuitBreaker):
        pass  # Don't log every success


def get_circuit_breaker(
    name: str,
    fail_max: int = 5,
    reset_timeout: int = 30,
    exclude: tuple = None
) -> pybreaker.CircuitBreaker:
    """
    Get or create a circuit breaker for a service.
    
    Circuit breakers prevent cascading failures by:
    1. Tracking failures to an external service
    2. Opening the circuit after fail_max failures
    3. Rejecting requests immediately while open
    4. Allowing a test request after reset_timeout seconds
    5. Closing if test succeeds, reopening if it fails
    
    Args:
        name: Unique identifier for the service (e.g., "openai", "rapidapi")
        fail_max: Number of failures before opening circuit
        reset_timeout: Seconds to wait before allowing test request
        exclude: Exception types that should NOT trigger circuit opening
        
    Usage:
        breaker = get_circuit_breaker("openai", fail_max=3, reset_timeout=60)
        
        @breaker
        async def call_openai(prompt: str):
            return await openai.chat.completions.create(...)
            
        # Or manual:
        try:
            with breaker:
                result = await call_openai(prompt)
        except pybreaker.CircuitBreakerError:
            # Circuit is open, use fallback
            return get_cached_response()
    """
    if name not in _circuit_breakers:
        listener = CircuitBreakerListener(name)
        
        _circuit_breakers[name] = pybreaker.CircuitBreaker(
            name=name,
            fail_max=fail_max,
            reset_timeout=reset_timeout,
            exclude=exclude or (),
            listeners=[listener],
        )
    
    return _circuit_breakers[name]


def reset_all_circuit_breakers():
    """Reset all circuit breakers (useful for testing)"""
    for cb in _circuit_breakers.values():
        cb.close()


# Pre-configured circuit breakers for common services
openai_breaker = get_circuit_breaker("openai", fail_max=5, reset_timeout=60)
rapidapi_breaker = get_circuit_breaker("rapidapi", fail_max=5, reset_timeout=30)
elevenlabs_breaker = get_circuit_breaker("elevenlabs", fail_max=3, reset_timeout=30)
supabase_breaker = get_circuit_breaker("supabase", fail_max=5, reset_timeout=30)


# ============================================================================
# RETRY WITH BACKOFF - Handle transient failures
# ============================================================================

class RetryError(Exception):
    """Raised when all retry attempts have failed"""
    
    def __init__(self, last_error: Exception, attempts: int):
        self.last_error = last_error
        self.attempts = attempts
        super().__init__(f"Failed after {attempts} attempts: {last_error}")


async def with_retry(
    func: Callable[..., T],
    *args,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: tuple = (Exception,),
    logger: structlog.BoundLogger = None,
    **kwargs
) -> T:
    """
    Retry an async function with exponential backoff and jitter.
    
    Args:
        func: The async function to retry
        max_attempts: Maximum number of attempts (default: 3)
        base_delay: Initial delay in seconds (default: 1.0)
        max_delay: Maximum delay in seconds (default: 30.0)
        exponential_base: Base for exponential backoff (default: 2.0)
        jitter: Add random jitter to prevent thundering herd (default: True)
        retryable_exceptions: Exception types that trigger retry
        
    Usage:
        result = await with_retry(
            call_openai,
            prompt="Hello",
            max_attempts=3,
            retryable_exceptions=(TimeoutError, ConnectionError),
        )
    """
    import random
    
    log = logger or get_logger("retry")
    last_error = None
    
    for attempt in range(1, max_attempts + 1):
        try:
            return await func(*args, **kwargs)
        
        except retryable_exceptions as e:
            last_error = e
            
            if attempt == max_attempts:
                log.error(
                    "All retry attempts failed",
                    function=func.__name__,
                    attempts=attempt,
                    error=str(e),
                )
                raise RetryError(e, attempt)
            
            # Calculate delay with exponential backoff
            delay = min(base_delay * (exponential_base ** (attempt - 1)), max_delay)
            
            # Add jitter (±25%)
            if jitter:
                delay = delay * (0.75 + random.random() * 0.5)
            
            log.warning(
                "Retrying after failure",
                function=func.__name__,
                attempt=attempt,
                max_attempts=max_attempts,
                error=str(e),
                delay_seconds=round(delay, 2),
            )
            
            await asyncio.sleep(delay)
    
    # Should never reach here, but just in case
    raise RetryError(last_error, max_attempts)


def retry_decorator(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    retryable_exceptions: tuple = (Exception,),
):
    """
    Decorator version of retry logic.
    
    Usage:
        @retry_decorator(max_attempts=3, retryable_exceptions=(TimeoutError,))
        async def call_external_api():
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            return await with_retry(
                func,
                *args,
                max_attempts=max_attempts,
                base_delay=base_delay,
                retryable_exceptions=retryable_exceptions,
                **kwargs
            )
        return wrapper
    return decorator


# ============================================================================
# HEALTH CHECK HELPERS
# ============================================================================

async def check_database_health(engine) -> Dict[str, Any]:
    """Check database connectivity"""
    from sqlalchemy import text
    
    start = time.time()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        
        return {
            "status": "healthy",
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "latency_ms": round((time.time() - start) * 1000, 2),
        }


async def check_redis_health(redis_client) -> Dict[str, Any]:
    """Check Redis connectivity"""
    start = time.time()
    try:
        await redis_client.ping()
        
        return {
            "status": "healthy",
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "latency_ms": round((time.time() - start) * 1000, 2),
        }


def check_circuit_breakers() -> Dict[str, Dict[str, Any]]:
    """Get status of all circuit breakers"""
    statuses = {}
    
    for name, cb in _circuit_breakers.items():
        statuses[name] = {
            "state": str(cb.current_state),
            "fail_counter": cb.fail_counter,
            "is_open": cb.current_state == pybreaker.STATE_OPEN,
        }
    
    return statuses


# ============================================================================
# TIMEOUT HELPERS
# ============================================================================

async def with_timeout(
    coro,
    timeout_seconds: float,
    timeout_message: str = "Operation timed out"
) -> Any:
    """
    Run a coroutine with a timeout.
    
    Usage:
        result = await with_timeout(
            call_slow_api(),
            timeout_seconds=30,
            timeout_message="API call timed out"
        )
    """
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise TimeoutError(timeout_message)
