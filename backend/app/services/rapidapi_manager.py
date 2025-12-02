"""
RapidAPI Request Manager
=========================
Centralized management of RapidAPI requests for cost-effective scaling.

Features:
- Single shared API key for all users
- Request pooling to prevent duplicate fetches
- Hourly batch fetching instead of per-request
- Intelligent caching with pre-warming
- Rate limiting per API endpoint
- Request deduplication across users

Architecture for 10K+ Users:
-----------------------------
1. Users request jobs → Check L1/L2 cache
2. Cache miss → Queue request (don't fetch immediately)
3. Celery worker fetches batch every hour
4. Results cached in Redis for instant retrieval
5. Deduplication prevents multiple API calls for same query

Cost Optimization:
-------------------
- Free tier: 500 requests/month = ~16/day
- Pro tier: 10,000 requests/month = ~333/day
- Hourly batching: Max 24 requests/day per query type
- With caching: 1 API call serves 10K+ users
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set
from collections import defaultdict

import redis
from redis import asyncio as aioredis

try:
    from app.core.config import settings
except ImportError:
    class _Settings:
        REDIS_URL = "redis://localhost:6379/0"
        RAPIDAPI_KEY = ""
    settings = _Settings()

logger = logging.getLogger(__name__)


@dataclass
class APIStats:
    """Track API usage statistics."""
    total_requests: int = 0
    cached_responses: int = 0
    deduplicated_requests: int = 0
    api_calls_saved: int = 0
    avg_response_time_ms: float = 0.0
    hourly_requests: Dict[int, int] = field(default_factory=dict)


@dataclass
class QueuedRequest:
    """Represents a request waiting for batch processing."""
    query_hash: str
    keywords: List[str]
    location: str
    source: str
    requested_at: datetime
    priority: int = 0  # Higher = more urgent


class RapidAPIManager:
    """
    Centralized RapidAPI request management for cost-effective scaling.
    
    Key Features:
    - Shared API key across all users
    - Request pooling and deduplication
    - Hourly batch fetching
    - Multi-level caching
    - Rate limiting per endpoint
    
    Usage:
        manager = RapidAPIManager()
        
        # Queue a request (doesn't fetch immediately)
        await manager.queue_request(["python developer"], "india", "indeed")
        
        # Get cached results (returns immediately if cached)
        results = await manager.get_cached_results(["python developer"], "india")
        
        # Batch fetch (called by Celery hourly)
        await manager.execute_batch_fetch()
    """
    
    # Configuration
    CACHE_TTL = 3600  # 1 hour cache for job results
    BATCH_INTERVAL = 3600  # Fetch every hour
    MAX_BATCH_SIZE = 50  # Max queries per batch
    DEDUP_WINDOW = 300  # 5 min dedup window
    
    # Rate limits per source (requests per minute)
    SOURCE_RATE_LIMITS = {
        "indeed": 5,
        "glassdoor": 5,
        "simplyhired": 10,
        "jsearch": 30,
        "adzuna": 30,
    }
    
    def __init__(self, redis_url: str = None, api_key: str = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self.api_key = api_key or getattr(settings, "RAPIDAPI_KEY", "")
        
        self._sync_redis = redis.from_url(
            self.redis_url,
            decode_responses=True,
            max_connections=50,
        )
        
        # Request queue (in-memory, backed by Redis)
        self._request_queue: Dict[str, QueuedRequest] = {}
        self._lock = asyncio.Lock()
        
        # Statistics
        self._stats = APIStats()
        
        # Rate limiters per source
        self._rate_limiters: Dict[str, List[float]] = defaultdict(list)
    
    def _generate_query_hash(
        self,
        keywords: List[str],
        location: str,
        source: Optional[str] = None,
    ) -> str:
        """Generate unique hash for a query."""
        key = f"{sorted(keywords)}:{location.lower()}:{source or 'all'}"
        return hashlib.sha256(key.encode()).hexdigest()[:16]
    
    def _cache_key(self, query_hash: str) -> str:
        """Generate Redis cache key."""
        return f"rapidapi:jobs:{query_hash}"
    
    def _queue_key(self) -> str:
        """Redis key for request queue."""
        return "rapidapi:request_queue"
    
    def _stats_key(self) -> str:
        """Redis key for stats."""
        return "rapidapi:stats"
    
    async def get_cached_results(
        self,
        keywords: List[str],
        location: str,
        source: Optional[str] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached results for a query.
        
        Returns None if not cached (caller should queue request).
        """
        query_hash = self._generate_query_hash(keywords, location, source)
        cache_key = self._cache_key(query_hash)
        
        cached = self._sync_redis.get(cache_key)
        if cached:
            self._stats.cached_responses += 1
            self._update_stats_redis()
            return json.loads(cached)
        
        return None
    
    async def queue_request(
        self,
        keywords: List[str],
        location: str,
        source: str,
        priority: int = 0,
    ) -> str:
        """
        Queue a request for batch processing.
        
        Returns query hash for tracking.
        """
        query_hash = self._generate_query_hash(keywords, location, source)
        
        async with self._lock:
            # Check if already queued
            existing = self._sync_redis.hget(self._queue_key(), query_hash)
            if existing:
                self._stats.deduplicated_requests += 1
                return query_hash
            
            # Add to queue
            request = QueuedRequest(
                query_hash=query_hash,
                keywords=keywords,
                location=location,
                source=source,
                requested_at=datetime.utcnow(),
                priority=priority,
            )
            
            request_data = {
                "keywords": keywords,
                "location": location,
                "source": source,
                "requested_at": request.requested_at.isoformat(),
                "priority": priority,
            }
            
            self._sync_redis.hset(
                self._queue_key(),
                query_hash,
                json.dumps(request_data),
            )
            
            self._stats.total_requests += 1
        
        return query_hash
    
    def get_pending_requests(self) -> List[Dict[str, Any]]:
        """Get all pending requests in queue."""
        raw_queue = self._sync_redis.hgetall(self._queue_key())
        
        requests = []
        for query_hash, data in raw_queue.items():
            request = json.loads(data)
            request["query_hash"] = query_hash
            requests.append(request)
        
        # Sort by priority (highest first)
        requests.sort(key=lambda r: r.get("priority", 0), reverse=True)
        
        return requests
    
    async def execute_batch_fetch(
        self,
        fetch_callback,
        max_requests: int = None,
    ) -> Dict[str, Any]:
        """
        Execute batch fetch for all queued requests.
        
        Called by Celery hourly task.
        
        Args:
            fetch_callback: Async function to fetch jobs for a query
            max_requests: Maximum requests to process (for rate limiting)
        
        Returns:
            Summary of fetch operation
        """
        pending = self.get_pending_requests()
        
        if not pending:
            return {"processed": 0, "message": "No pending requests"}
        
        max_requests = max_requests or self.MAX_BATCH_SIZE
        to_process = pending[:max_requests]
        
        results = {
            "processed": 0,
            "success": 0,
            "failed": 0,
            "total_jobs": 0,
            "sources": {},
        }
        
        for request in to_process:
            query_hash = request["query_hash"]
            
            try:
                # Check rate limit
                source = request["source"]
                if not self._check_rate_limit(source):
                    logger.warning(f"Rate limited for source: {source}")
                    continue
                
                # Fetch jobs
                jobs = await fetch_callback(
                    keywords=request["keywords"],
                    location=request["location"],
                    source=source,
                )
                
                # Cache results
                cache_key = self._cache_key(query_hash)
                self._sync_redis.setex(
                    cache_key,
                    self.CACHE_TTL,
                    json.dumps(jobs),
                )
                
                # Remove from queue
                self._sync_redis.hdel(self._queue_key(), query_hash)
                
                # Update stats
                results["processed"] += 1
                results["success"] += 1
                results["total_jobs"] += len(jobs)
                results["sources"][source] = results["sources"].get(source, 0) + 1
                
                self._stats.api_calls_saved += max(0, self._stats.deduplicated_requests)
                
            except Exception as e:
                logger.error(f"Failed to fetch {query_hash}: {e}")
                results["failed"] += 1
        
        self._update_stats_redis()
        
        return results
    
    def _check_rate_limit(self, source: str) -> bool:
        """Check if source is within rate limit."""
        limit = self.SOURCE_RATE_LIMITS.get(source, 10)
        now = time.time()
        window = 60  # 1 minute window
        
        # Clean old entries
        self._rate_limiters[source] = [
            t for t in self._rate_limiters[source]
            if now - t < window
        ]
        
        if len(self._rate_limiters[source]) >= limit:
            return False
        
        self._rate_limiters[source].append(now)
        return True
    
    def _update_stats_redis(self):
        """Persist stats to Redis."""
        stats_data = {
            "total_requests": self._stats.total_requests,
            "cached_responses": self._stats.cached_responses,
            "deduplicated_requests": self._stats.deduplicated_requests,
            "api_calls_saved": self._stats.api_calls_saved,
            "updated_at": datetime.utcnow().isoformat(),
        }
        self._sync_redis.set(self._stats_key(), json.dumps(stats_data))
    
    def get_stats(self) -> Dict[str, Any]:
        """Get API usage statistics."""
        raw = self._sync_redis.get(self._stats_key())
        if raw:
            return json.loads(raw)
        
        return {
            "total_requests": 0,
            "cached_responses": 0,
            "deduplicated_requests": 0,
            "api_calls_saved": 0,
            "message": "No stats available yet",
        }
    
    def get_cache_health(self) -> Dict[str, Any]:
        """Get cache health metrics."""
        # Count cached queries
        pattern = "rapidapi:jobs:*"
        cached_count = 0
        
        for key in self._sync_redis.scan_iter(pattern, count=1000):
            cached_count += 1
        
        pending_count = self._sync_redis.hlen(self._queue_key())
        
        return {
            "cached_queries": cached_count,
            "pending_requests": pending_count,
            "cache_ttl_seconds": self.CACHE_TTL,
            "batch_interval_seconds": self.BATCH_INTERVAL,
        }
    
    async def warm_cache(
        self,
        popular_queries: List[Dict[str, Any]],
        fetch_callback,
    ) -> Dict[str, Any]:
        """
        Pre-warm cache with popular queries.
        
        Args:
            popular_queries: List of {"keywords": [...], "location": "..."}
            fetch_callback: Function to fetch jobs
        
        Returns:
            Summary of warming operation
        """
        results = {"warmed": 0, "failed": 0, "skipped": 0}
        
        for query in popular_queries:
            keywords = query.get("keywords", [])
            location = query.get("location", "India")
            source = query.get("source", "all")
            
            # Check if already cached
            cached = await self.get_cached_results(keywords, location, source)
            if cached:
                results["skipped"] += 1
                continue
            
            try:
                jobs = await fetch_callback(
                    keywords=keywords,
                    location=location,
                    source=source,
                )
                
                query_hash = self._generate_query_hash(keywords, location, source)
                cache_key = self._cache_key(query_hash)
                
                self._sync_redis.setex(
                    cache_key,
                    self.CACHE_TTL,
                    json.dumps(jobs),
                )
                
                results["warmed"] += 1
                
            except Exception as e:
                logger.error(f"Failed to warm cache for {keywords}: {e}")
                results["failed"] += 1
        
        return results
    
    def clear_cache(self, pattern: str = None) -> int:
        """Clear cached results (for testing/maintenance)."""
        if pattern:
            keys = list(self._sync_redis.scan_iter(f"rapidapi:jobs:{pattern}*"))
        else:
            keys = list(self._sync_redis.scan_iter("rapidapi:jobs:*"))
        
        if keys:
            return self._sync_redis.delete(*keys)
        return 0


# Popular queries for cache warming
POPULAR_QUERIES = [
    {"keywords": ["software", "engineer"], "location": "India"},
    {"keywords": ["python", "developer"], "location": "India"},
    {"keywords": ["data", "scientist"], "location": "India"},
    {"keywords": ["frontend", "developer"], "location": "India"},
    {"keywords": ["backend", "developer"], "location": "India"},
    {"keywords": ["fullstack", "developer"], "location": "India"},
    {"keywords": ["machine", "learning"], "location": "India"},
    {"keywords": ["devops", "engineer"], "location": "India"},
    {"keywords": ["cloud", "engineer"], "location": "India"},
    {"keywords": ["react", "developer"], "location": "India"},
    {"keywords": ["java", "developer"], "location": "India"},
    {"keywords": ["product", "manager"], "location": "India"},
    {"keywords": ["data", "analyst"], "location": "India"},
    {"keywords": ["business", "analyst"], "location": "India"},
    {"keywords": ["ui", "ux", "designer"], "location": "India"},
    {"keywords": ["software", "engineer"], "location": "Bangalore"},
    {"keywords": ["software", "engineer"], "location": "Hyderabad"},
    {"keywords": ["software", "engineer"], "location": "Mumbai"},
    {"keywords": ["software", "engineer"], "location": "Delhi"},
    {"keywords": ["software", "engineer"], "location": "Pune"},
    {"keywords": ["software", "engineer"], "location": "United States"},
    {"keywords": ["software", "engineer"], "location": "Remote"},
]


# Singleton instance
_manager: Optional[RapidAPIManager] = None


def get_rapidapi_manager() -> RapidAPIManager:
    """Get singleton RapidAPI manager."""
    global _manager
    if _manager is None:
        _manager = RapidAPIManager()
    return _manager


__all__ = [
    "RapidAPIManager",
    "get_rapidapi_manager",
    "POPULAR_QUERIES",
    "APIStats",
]
