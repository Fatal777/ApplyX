"""
Metrics API Endpoints
Expose performance metrics for monitoring
"""

from fastapi import APIRouter
from app.middleware.performance import metrics

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/performance")
def get_performance_metrics():
    """
    Get current performance metrics
    Includes latency percentiles, throughput, and error rates
    """
    return metrics.get_summary()


@router.get("/prometheus")
def get_prometheus_metrics():
    """
    Prometheus-compatible metrics endpoint
    Format: metric_name{labels} value
    """
    summary = metrics.get_summary()
    
    prometheus_metrics = []
    
    # Request metrics
    prometheus_metrics.append(f"applyx_requests_total {summary['overview']['total_requests']}")
    prometheus_metrics.append(f"applyx_errors_total {summary['overview']['total_errors']}")
    prometheus_metrics.append(f"applyx_requests_per_minute {summary['overview']['requests_per_minute']}")
    prometheus_metrics.append(f"applyx_error_rate_percent {summary['overview']['error_rate_percent']}")
    
    # Latency metrics
    prometheus_metrics.append(f"applyx_latency_p50_ms {summary['latency']['p50_ms']}")
    prometheus_metrics.append(f"applyx_latency_p95_ms {summary['latency']['p95_ms']}")
    prometheus_metrics.append(f"applyx_latency_p99_ms {summary['latency']['p99_ms']}")
    prometheus_metrics.append(f"applyx_latency_avg_ms {summary['latency']['avg_ms']}")
    
    # Service latencies
    for service, stats in summary.get('service_latencies', {}).items():
        prometheus_metrics.append(f'applyx_service_latency_avg_ms{{service="{service}"}} {stats["avg_ms"]}')
        prometheus_metrics.append(f'applyx_service_latency_p95_ms{{service="{service}"}} {stats["p95_ms"]}')
    
    return "\n".join(prometheus_metrics)
