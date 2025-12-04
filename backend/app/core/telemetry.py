"""
OpenTelemetry & Prometheus Observability Configuration
Distributed tracing, metrics collection, and instrumentation
"""

import logging
from typing import Optional
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.trace import Status, StatusCode

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Info,
    generate_latest,
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    multiprocess,
    REGISTRY,
)
import time

from app.core.config import settings

logger = logging.getLogger(__name__)

# ============== Prometheus Metrics ==============

# Create a custom registry for multiprocess environments
def get_prometheus_registry():
    """Get the appropriate registry for the environment"""
    try:
        # Check if running in multiprocess mode
        import os
        if "prometheus_multiproc_dir" in os.environ:
            registry = CollectorRegistry()
            multiprocess.MultiProcessCollector(registry)
            return registry
    except Exception:
        pass
    return REGISTRY


# Request metrics
REQUEST_COUNT = Counter(
    "applyx_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "applyx_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

REQUEST_IN_PROGRESS = Gauge(
    "applyx_http_requests_in_progress",
    "Number of HTTP requests in progress",
    ["method", "endpoint"]
)

# Database metrics
DB_QUERY_LATENCY = Histogram(
    "applyx_db_query_duration_seconds",
    "Database query latency in seconds",
    ["operation", "table"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

DB_CONNECTION_POOL = Gauge(
    "applyx_db_connection_pool_size",
    "Database connection pool size",
    ["status"]  # active, idle, overflow
)

# Redis metrics
REDIS_OPERATION_LATENCY = Histogram(
    "applyx_redis_operation_duration_seconds",
    "Redis operation latency in seconds",
    ["operation"],
    buckets=[0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1]
)

CACHE_HIT_RATIO = Counter(
    "applyx_cache_operations_total",
    "Cache operations",
    ["result"]  # hit, miss
)

# AI Service metrics
AI_REQUEST_LATENCY = Histogram(
    "applyx_ai_request_duration_seconds",
    "AI service request latency in seconds",
    ["provider", "operation"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]
)

AI_REQUEST_COUNT = Counter(
    "applyx_ai_requests_total",
    "Total AI service requests",
    ["provider", "operation", "status"]
)

AI_TOKEN_USAGE = Counter(
    "applyx_ai_tokens_total",
    "Total AI tokens used",
    ["provider", "type"]  # input, output
)

# Interview metrics
INTERVIEW_SESSION_COUNT = Counter(
    "applyx_interview_sessions_total",
    "Total interview sessions",
    ["type", "status"]
)

INTERVIEW_DURATION = Histogram(
    "applyx_interview_duration_seconds",
    "Interview session duration in seconds",
    ["type"],
    buckets=[60, 120, 300, 600, 900, 1200, 1800, 3600]
)

INTERVIEW_SCORE = Histogram(
    "applyx_interview_score",
    "Interview scores distribution",
    ["type"],
    buckets=[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
)

# Resume processing metrics
RESUME_PROCESSING_LATENCY = Histogram(
    "applyx_resume_processing_duration_seconds",
    "Resume processing latency in seconds",
    ["operation"],  # upload, parse, analyze, score
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]
)

RESUME_COUNT = Counter(
    "applyx_resumes_processed_total",
    "Total resumes processed",
    ["status"]
)

# Celery task metrics
CELERY_TASK_LATENCY = Histogram(
    "applyx_celery_task_duration_seconds",
    "Celery task execution time in seconds",
    ["task_name", "status"],
    buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 300.0]
)

CELERY_TASK_COUNT = Counter(
    "applyx_celery_tasks_total",
    "Total Celery tasks",
    ["task_name", "status"]
)

# System info
APP_INFO = Info("applyx_app", "Application information")
APP_INFO.info({
    "version": settings.APP_VERSION,
    "environment": settings.ENVIRONMENT,
    "app_name": settings.APP_NAME
})


# ============== OpenTelemetry Setup ==============

def setup_telemetry(app=None, db_engine=None):
    """
    Initialize OpenTelemetry tracing and instrumentation.
    
    Args:
        app: FastAPI application instance
        db_engine: SQLAlchemy engine instance
    """
    # Skip if telemetry is disabled
    if not getattr(settings, 'OTEL_ENABLED', True):
        logger.info("OpenTelemetry is disabled")
        return
    
    try:
        # Create resource with service info
        resource = Resource.create({
            SERVICE_NAME: settings.APP_NAME,
            SERVICE_VERSION: settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "service.namespace": "applyx",
        })
        
        # Create tracer provider
        provider = TracerProvider(resource=resource)
        
        # Configure exporter based on environment
        otel_endpoint = getattr(settings, 'OTEL_EXPORTER_OTLP_ENDPOINT', None)
        
        if otel_endpoint:
            # Production: Send to OTLP collector (Jaeger, Tempo, etc.)
            otlp_exporter = OTLPSpanExporter(
                endpoint=otel_endpoint,
                insecure=getattr(settings, 'OTEL_EXPORTER_INSECURE', True)
            )
            provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            logger.info(f"OpenTelemetry OTLP exporter configured: {otel_endpoint}")
        elif settings.DEBUG:
            # Development: Console output for debugging
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
            logger.info("OpenTelemetry Console exporter configured (debug mode)")
        
        # Set global tracer provider
        trace.set_tracer_provider(provider)
        
        # Set B3 propagator for distributed tracing compatibility
        set_global_textmap(B3MultiFormat())
        
        # Instrument FastAPI
        if app:
            FastAPIInstrumentor.instrument_app(
                app,
                excluded_urls="health,metrics,favicon.ico",
                tracer_provider=provider
            )
            logger.info("FastAPI instrumented with OpenTelemetry")
        
        # Instrument SQLAlchemy
        if db_engine:
            SQLAlchemyInstrumentor().instrument(
                engine=db_engine,
                tracer_provider=provider
            )
            logger.info("SQLAlchemy instrumented with OpenTelemetry")
        
        # Instrument Redis
        RedisInstrumentor().instrument(tracer_provider=provider)
        logger.info("Redis instrumented with OpenTelemetry")
        
        # Instrument HTTP clients
        RequestsInstrumentor().instrument(tracer_provider=provider)
        HTTPXClientInstrumentor().instrument(tracer_provider=provider)
        logger.info("HTTP clients instrumented with OpenTelemetry")
        
        logger.info("OpenTelemetry setup completed successfully")
        
    except Exception as e:
        logger.error(f"Failed to setup OpenTelemetry: {e}")
        # Don't crash the app if telemetry fails


def get_tracer(name: str = "applyx"):
    """Get a tracer instance for manual span creation."""
    return trace.get_tracer(name)


@contextmanager
def create_span(name: str, attributes: Optional[dict] = None):
    """
    Create a traced span for custom operations.
    
    Usage:
        with create_span("my_operation", {"key": "value"}) as span:
            # do work
            span.set_attribute("result", "success")
    """
    tracer = get_tracer()
    with tracer.start_as_current_span(name) as span:
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)
        try:
            yield span
            span.set_status(Status(StatusCode.OK))
        except Exception as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            raise


# ============== Metrics Collection Helpers ==============

class MetricsTimer:
    """Context manager for timing operations and recording to Prometheus."""
    
    def __init__(self, histogram: Histogram, labels: dict):
        self.histogram = histogram
        self.labels = labels
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.perf_counter()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.perf_counter() - self.start_time
        self.histogram.labels(**self.labels).observe(duration)


def record_request_metrics(method: str, endpoint: str, status_code: int, duration: float):
    """Record HTTP request metrics."""
    REQUEST_COUNT.labels(
        method=method,
        endpoint=endpoint,
        status_code=str(status_code)
    ).inc()
    REQUEST_LATENCY.labels(
        method=method,
        endpoint=endpoint
    ).observe(duration)


def record_db_metrics(operation: str, table: str, duration: float):
    """Record database operation metrics."""
    DB_QUERY_LATENCY.labels(
        operation=operation,
        table=table
    ).observe(duration)


def record_cache_hit(hit: bool):
    """Record cache hit/miss."""
    result = "hit" if hit else "miss"
    CACHE_HIT_RATIO.labels(result=result).inc()


def record_ai_request(provider: str, operation: str, status: str, duration: float, 
                      input_tokens: int = 0, output_tokens: int = 0):
    """Record AI service request metrics."""
    AI_REQUEST_COUNT.labels(
        provider=provider,
        operation=operation,
        status=status
    ).inc()
    AI_REQUEST_LATENCY.labels(
        provider=provider,
        operation=operation
    ).observe(duration)
    
    if input_tokens > 0:
        AI_TOKEN_USAGE.labels(provider=provider, type="input").inc(input_tokens)
    if output_tokens > 0:
        AI_TOKEN_USAGE.labels(provider=provider, type="output").inc(output_tokens)


def record_interview_session(interview_type: str, status: str, duration: float = None, score: float = None):
    """Record interview session metrics."""
    INTERVIEW_SESSION_COUNT.labels(type=interview_type, status=status).inc()
    
    if duration is not None:
        INTERVIEW_DURATION.labels(type=interview_type).observe(duration)
    
    if score is not None:
        INTERVIEW_SCORE.labels(type=interview_type).observe(score)


def record_resume_processing(operation: str, status: str, duration: float):
    """Record resume processing metrics."""
    RESUME_PROCESSING_LATENCY.labels(operation=operation).observe(duration)
    RESUME_COUNT.labels(status=status).inc()


def record_celery_task(task_name: str, status: str, duration: float):
    """Record Celery task metrics."""
    CELERY_TASK_COUNT.labels(task_name=task_name, status=status).inc()
    CELERY_TASK_LATENCY.labels(task_name=task_name, status=status).observe(duration)


# ============== Prometheus Endpoint ==============

async def metrics_endpoint():
    """
    Generate Prometheus metrics for scraping.
    Returns metrics in Prometheus text format.
    """
    registry = get_prometheus_registry()
    metrics = generate_latest(registry)
    return metrics, CONTENT_TYPE_LATEST
