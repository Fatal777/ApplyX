"""
Performance Metrics Middleware
Track latency, throughput, and system performance
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
import asyncio

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class PerformanceMetrics:
    """In-memory performance metrics storage"""
    
    def __init__(self, window_minutes: int = 5):
        self.window_minutes = window_minutes
        
        # Request counters
        self.request_count = 0
        self.error_count = 0
        
        # Latency tracking (last N requests)
        self.latencies = deque(maxlen=1000)
        
        # Endpoint-specific metrics
        self.endpoint_metrics = defaultdict(lambda: {
            "count": 0,
            "total_latency_ms": 0,
            "errors": 0,
            "last_accessed": None
        })
        
        # Time-series data (for graphs)
        self.request_history = deque(maxlen=300)  # Last 5 minutes (1 entry/second)
        
        # Service-specific latencies
        self.service_latencies = {
            "deepgram": deque(maxlen=100),
            "gemini": deque(maxlen=100),
            "edge_tts": deque(maxlen=100),
            "database": deque(maxlen=100)
        }
    
    def record_request(self, method: str, path: str, status_code: int, latency_ms: float):
        """Record a request"""
        self.request_count += 1
        
        if status_code >= 400:
            self.error_count += 1
        
        # Record latency
        self.latencies.append(latency_ms)
        
        # Update endpoint metrics
        endpoint_key = f"{method} {path}"
        metrics = self.endpoint_metrics[endpoint_key]
        metrics["count"] += 1
        metrics["total_latency_ms"] += latency_ms
        metrics["last_accessed"] = datetime.now()
        
        if status_code >= 400:
            metrics["errors"] += 1
        
        # Add to time-series
        self.request_history.append({
            "timestamp": datetime.now(),
            "latency_ms": latency_ms,
            "status_code": status_code
        })
    
    def record_service_latency(self, service: str, latency_ms: float):
        """Record external service latency"""
        if service in self.service_latencies:
            self.service_latencies[service].append({
                "timestamp": datetime.now(),
                "latency_ms": latency_ms
            })
    
    def get_summary(self):
        """Get performance summary"""
        # Calculate percentiles
        if self.latencies:
            sorted_latencies = sorted(self.latencies)
            p50 = sorted_latencies[len(sorted_latencies) // 2]
            p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
            p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]
            avg = sum(self.latencies) / len(self.latencies)
        else:
            p50 = p95 = p99 = avg = 0
        
        # Calculate requests per minute (last 5 min)
        now = datetime.now()
        recent_requests = [
            r for r in self.request_history
            if (now - r["timestamp"]) < timedelta(minutes=self.window_minutes)
        ]
        rpm = len(recent_requests) / self.window_minutes if recent_requests else 0
        
        # Top endpoints
        top_endpoints = sorted(
            [
                {
                    "endpoint": endpoint,
                    "count": data["count"],
                    "avg_latency_ms": data["total_latency_ms"] / data["count"] if data["count"] > 0 else 0,
                    "error_rate": (data["errors"] / data["count"] * 100) if data["count"] > 0 else 0
                }
                for endpoint, data in self.endpoint_metrics.items()
            ],
            key=lambda x: x["count"],
            reverse=True
        )[:10]
        
        # Service latencies
        service_stats = {}
        for service, latencies in self.service_latencies.items():
            if latencies:
                recent_latencies = [
                    l["latency_ms"] for l in latencies
                    if (now - l["timestamp"]) < timedelta(minutes=self.window_minutes)
                ]
                if recent_latencies:
                    service_stats[service] = {
                        "avg_ms": round(sum(recent_latencies) / len(recent_latencies), 2),
                        "p95_ms": round(sorted(recent_latencies)[int(len(recent_latencies) * 0.95)], 2),
                        "sample_count": len(recent_latencies)
                    }
        
        return {
            "overview": {
                "total_requests": self.request_count,
                "total_errors": self.error_count,
                "error_rate_percent": (self.error_count / self.request_count * 100) if self.request_count > 0 else 0,
                "requests_per_minute": round(rpm, 2)
            },
            "latency": {
                "p50_ms": round(p50, 2),
                "p95_ms": round(p95, 2),
                "p99_ms": round(p99, 2),
                "avg_ms": round(avg, 2),
                "sample_size": len(self.latencies)
            },
            "top_endpoints": top_endpoints,
            "service_latencies": service_stats,
            "window_minutes": self.window_minutes
        }


# Global metrics instance
metrics = PerformanceMetrics()


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to track request performance"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip metrics for health checks to avoid noise
        if request.url.path.startswith("/health"):
            return await call_next(request)
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            latency_ms = (time.time() - start_time) * 1000
            
            # Record metrics
            metrics.record_request(
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                latency_ms=latency_ms
            )
            
            # Log slow requests
            if latency_ms > 5000:  # > 5 seconds
                logger.warning(
                    "Slow request detected",
                    method=request.method,
                    path=request.url.path,
                    latency_ms=latency_ms,
                    status_code=response.status_code
                )
            
            # Add performance header
            response.headers["X-Response-Time"] = f"{latency_ms:.2f}ms"
            
            return response
            
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            
            # Record error
            metrics.record_request(
                method=request.method,
                path=request.url.path,
                status_code=500,
                latency_ms=latency_ms
            )
            
            logger.error(
                f"Request failed: {str(e)}",
                method=request.method,
                path=request.url.path,
                latency_ms=latency_ms,
                exc_info=True
            )
            
            raise
