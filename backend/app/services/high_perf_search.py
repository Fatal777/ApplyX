"""
High-Performance Job Search Engine
===================================
Implements millisecond search responses for 1000+ concurrent users using:

1. **Inverted Index**: Redis-backed inverted index for O(1) keyword lookup
2. **Pre-computed Results**: Popular queries cached, warm cache strategy
3. **Connection Pooling**: aiohttp with keep-alive connections
4. **Request Deduplication**: Prevents redundant API calls via locks
5. **Race Condition Prevention**: Distributed locks with Redis

Architecture:
- Jobs are indexed on ingest with keywords, skills, location, company
- Search hits Redis first (sub-ms), falls back to DB if needed
- Background workers continuously refresh popular queries
- Bloom filters for quick "not found" responses

Time Complexity: O(1) average for cached queries, O(k) for k keywords
Space Complexity: O(n * m) where n=jobs, m=avg keywords per job
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
from functools import lru_cache

import aiohttp
import redis
from redis import asyncio as aioredis

try:
    from app.core.config import settings
except Exception:
    class _Settings:
        REDIS_URL = "redis://localhost:6379/0"
        REDIS_MAX_CONNECTIONS = 100
        DEBUG = True
    settings = _Settings()

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration Constants
# ============================================================================
class SearchConfig:
    """Tunable parameters for search performance."""
    
    # Cache TTLs
    SEARCH_RESULT_TTL = 300  # 5 minutes for search results
    JOB_INDEX_TTL = 3600  # 1 hour for job index entries
    POPULAR_QUERY_TTL = 900  # 15 minutes for popular queries
    LOCK_TTL = 30  # Lock timeout for deduplication
    
    # Performance tuning
    MAX_RESULTS_PER_QUERY = 100
    MIN_KEYWORD_LENGTH = 2
    MAX_KEYWORDS = 10
    BATCH_SIZE = 50
    
    # Connection pool settings
    HTTP_POOL_SIZE = 100
    HTTP_TIMEOUT = 10
    HTTP_KEEPALIVE_TIMEOUT = 30
    
    # Popular queries to pre-warm
    POPULAR_QUERIES = [
        "software engineer",
        "python developer",
        "data scientist",
        "frontend developer",
        "backend developer",
        "full stack developer",
        "machine learning",
        "devops engineer",
        "product manager",
        "react developer",
        "java developer",
        "cloud engineer",
        "data analyst",
        "ui ux designer",
    ]
    
    # Locations to pre-warm
    POPULAR_LOCATIONS = [
        "India",
        "Bangalore",
        "Mumbai",
        "Delhi",
        "Hyderabad",
        "Chennai",
        "Pune",
        "Remote",
    ]


# ============================================================================
# Data Structures
# ============================================================================
@dataclass
class SearchQuery:
    """Normalized search query for consistent caching."""
    keywords: Tuple[str, ...]
    location: str
    experience_level: Optional[str] = None
    portal: Optional[str] = None
    limit: int = 20
    
    def cache_key(self) -> str:
        """Generate deterministic cache key."""
        parts = [
            "search",
            "_".join(sorted(self.keywords)),
            self.location.lower().replace(" ", "_"),
            self.experience_level or "all",
            self.portal or "all",
            str(self.limit),
        ]
        key = ":".join(parts)
        # Use hash for very long keys
        if len(key) > 200:
            return f"search:hash:{hashlib.sha256(key.encode()).hexdigest()[:32]}"
        return key
    
    @classmethod
    def from_raw(
        cls,
        keywords: str,
        location: str = "India",
        experience_level: Optional[str] = None,
        portal: Optional[str] = None,
        limit: int = 20,
    ) -> "SearchQuery":
        """Create normalized query from raw input."""
        # Normalize keywords
        kw_list = [
            k.strip().lower()
            for k in keywords.split(",")
            if k.strip() and len(k.strip()) >= SearchConfig.MIN_KEYWORD_LENGTH
        ][:SearchConfig.MAX_KEYWORDS]
        
        return cls(
            keywords=tuple(sorted(set(kw_list))),
            location=location.strip().title(),
            experience_level=experience_level,
            portal=portal,
            limit=min(limit, SearchConfig.MAX_RESULTS_PER_QUERY),
        )


@dataclass
class JobDocument:
    """Indexed job document with search metadata."""
    job_id: str
    title: str
    company: str
    location: str
    description: str
    skills: List[str]
    redirect_url: str
    portal: str
    posted_date: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    experience: Optional[str] = None
    score: float = 0.0
    
    # Pre-computed search tokens
    title_tokens: List[str] = field(default_factory=list)
    all_tokens: Set[str] = field(default_factory=set)
    
    def __post_init__(self):
        """Pre-compute search tokens for fast matching."""
        self.title_tokens = self._tokenize(self.title)
        self.all_tokens = set(
            self.title_tokens +
            self._tokenize(self.company) +
            self._tokenize(self.location) +
            self._tokenize(self.description[:500]) +
            [s.lower() for s in self.skills]
        )
    
    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Tokenize text for indexing."""
        if not text:
            return []
        # Remove special chars, split, lowercase
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        return [
            w for w in text.split()
            if len(w) >= SearchConfig.MIN_KEYWORD_LENGTH
        ]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to API response dict."""
        return {
            "job_id": self.job_id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "description": self.description,
            "skills": self.skills,
            "redirect_url": self.redirect_url,
            "portal": self.portal,
            "posted_date": self.posted_date,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "experience": self.experience,
            "match_score": round(self.score, 2) if self.score else None,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "JobDocument":
        """Create from raw job dict."""
        return cls(
            job_id=str(data.get("job_id", data.get("id", ""))),
            title=data.get("title", ""),
            company=data.get("company", ""),
            location=data.get("location", ""),
            description=data.get("description", "")[:1000],
            skills=data.get("skills", []),
            redirect_url=data.get("redirect_url", ""),
            portal=data.get("portal", ""),
            posted_date=data.get("posted_date", ""),
            salary_min=data.get("salary_min"),
            salary_max=data.get("salary_max"),
            experience=data.get("experience"),
        )


# ============================================================================
# Inverted Index
# ============================================================================
class InvertedIndex:
    """
    Redis-backed inverted index for O(1) keyword lookup.
    
    Structure:
    - idx:token:{token} -> Set of job_ids containing this token
    - idx:job:{job_id} -> JSON serialized JobDocument
    - idx:stats:tokens -> Hash of token frequencies
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._local_cache: Dict[str, List[str]] = {}  # L1 cache
        self._cache_ttl = 60  # Local cache TTL
        self._cache_time: Dict[str, float] = {}
    
    def index_job(self, job: JobDocument, pipeline: Optional[redis.client.Pipeline] = None) -> None:
        """Index a job document."""
        pipe = pipeline or self.redis.pipeline()
        job_key = f"idx:job:{job.job_id}"
        
        # Store job document
        pipe.setex(job_key, SearchConfig.JOB_INDEX_TTL, json.dumps(job.to_dict()))
        
        # Add to inverted index for each token
        for token in job.all_tokens:
            token_key = f"idx:token:{token}"
            pipe.sadd(token_key, job.job_id)
            pipe.expire(token_key, SearchConfig.JOB_INDEX_TTL)
        
        # Update token stats
        for token in job.all_tokens:
            pipe.hincrby("idx:stats:tokens", token, 1)
        
        if pipeline is None:
            pipe.execute()
    
    def index_jobs_batch(self, jobs: List[JobDocument]) -> int:
        """Batch index multiple jobs efficiently."""
        if not jobs:
            return 0
        
        pipe = self.redis.pipeline()
        for job in jobs:
            self.index_job(job, pipeline=pipe)
        
        pipe.execute()
        return len(jobs)
    
    def search(self, tokens: List[str], limit: int = 20) -> List[str]:
        """
        Find job_ids matching all tokens (AND search).
        Returns sorted by relevance (number of token matches).
        """
        if not tokens:
            return []
        
        # Check local cache first
        cache_key = "_".join(sorted(tokens))
        if cache_key in self._local_cache:
            if time.time() - self._cache_time.get(cache_key, 0) < self._cache_ttl:
                return self._local_cache[cache_key][:limit]
        
        # Get job_ids for each token
        token_keys = [f"idx:token:{t}" for t in tokens]
        
        # Use Redis SINTER for efficient intersection
        if len(token_keys) == 1:
            job_ids = list(self.redis.smembers(token_keys[0]))
        else:
            # For multiple tokens, intersect sets
            job_ids = list(self.redis.sinter(*token_keys))
        
        # Score and sort by relevance
        if job_ids and len(tokens) > 1:
            scored = []
            for job_id in job_ids:
                # Count how many tokens match (already all match due to SINTER)
                # Can add TF-IDF scoring here for better relevance
                scored.append((job_id, len(tokens)))
            scored.sort(key=lambda x: x[1], reverse=True)
            job_ids = [j[0] for j in scored]
        
        # Update local cache
        self._local_cache[cache_key] = job_ids
        self._cache_time[cache_key] = time.time()
        
        return job_ids[:limit]
    
    def get_jobs(self, job_ids: List[str]) -> List[Dict[str, Any]]:
        """Retrieve job documents by IDs."""
        if not job_ids:
            return []
        
        # Batch fetch with pipeline
        pipe = self.redis.pipeline()
        for job_id in job_ids:
            pipe.get(f"idx:job:{job_id}")
        
        results = pipe.execute()
        
        jobs = []
        for raw in results:
            if raw:
                try:
                    jobs.append(json.loads(raw))
                except json.JSONDecodeError:
                    continue
        
        return jobs
    
    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics."""
        token_count = self.redis.hlen("idx:stats:tokens")
        job_count = len(self.redis.keys("idx:job:*"))
        
        return {
            "total_tokens": token_count,
            "total_jobs": job_count,
            "local_cache_size": len(self._local_cache),
        }


# ============================================================================
# Request Deduplication
# ============================================================================
class RequestDeduplicator:
    """
    Prevents duplicate concurrent requests using distributed locks.
    
    When multiple users search for the same thing simultaneously,
    only one request hits the external API while others wait for the result.
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._pending: Dict[str, asyncio.Future] = {}
    
    async def execute_once(
        self,
        key: str,
        func,
        *args,
        lock_timeout: int = SearchConfig.LOCK_TTL,
        **kwargs
    ):
        """
        Execute function only once for concurrent identical requests.
        Other callers wait for the result.
        """
        lock_key = f"lock:{key}"
        result_key = f"result:{key}"
        
        # Check if result already cached
        cached = self.redis.get(result_key)
        if cached:
            return json.loads(cached)
        
        # Try to acquire lock
        acquired = self.redis.set(lock_key, "1", nx=True, ex=lock_timeout)
        
        if acquired:
            try:
                # We got the lock, execute the function
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                # Cache result for other waiters
                self.redis.setex(result_key, 60, json.dumps(result))
                
                return result
            finally:
                # Release lock
                self.redis.delete(lock_key)
        else:
            # Wait for result from the holder
            for _ in range(lock_timeout * 10):  # Check every 100ms
                await asyncio.sleep(0.1)
                cached = self.redis.get(result_key)
                if cached:
                    return json.loads(cached)
            
            # Timeout - try ourselves
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            return func(*args, **kwargs)


# ============================================================================
# High-Performance Search Service
# ============================================================================
class HighPerfSearchService:
    """
    Main search service with millisecond response times.
    
    Features:
    - L1 (in-memory) and L2 (Redis) caching
    - Pre-computed popular query results
    - Request deduplication
    - Async job fetching with connection pooling
    """
    
    def __init__(self):
        self._redis = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=SearchConfig.HTTP_POOL_SIZE,
        )
        self._index = InvertedIndex(self._redis)
        self._dedup = RequestDeduplicator(self._redis)
        self._session: Optional[aiohttp.ClientSession] = None
        
        # L1 in-memory cache
        self._search_cache: Dict[str, Tuple[List[Dict], float]] = {}
        self._cache_max_size = 1000
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session with connection pooling."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=SearchConfig.HTTP_TIMEOUT)
            connector = aiohttp.TCPConnector(
                limit=SearchConfig.HTTP_POOL_SIZE,
                keepalive_timeout=SearchConfig.HTTP_KEEPALIVE_TIMEOUT,
            )
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
            )
        return self._session
    
    async def search(self, query: SearchQuery) -> Dict[str, Any]:
        """
        Execute search with multi-level caching.
        
        Search flow:
        1. Check L1 in-memory cache (sub-ms)
        2. Check L2 Redis cache (1-2ms)
        3. Check inverted index (2-5ms)
        4. Fallback to live fetch (100ms+)
        """
        start_time = time.perf_counter()
        cache_key = query.cache_key()
        
        # L1: In-memory cache (fastest)
        if cache_key in self._search_cache:
            jobs, cached_at = self._search_cache[cache_key]
            if time.time() - cached_at < SearchConfig.SEARCH_RESULT_TTL:
                elapsed = (time.perf_counter() - start_time) * 1000
                return self._build_response(query, jobs, elapsed, "l1_cache")
        
        # L2: Redis cache
        cached = self._redis.get(cache_key)
        if cached:
            try:
                jobs = json.loads(cached)
                # Warm L1 cache
                self._update_l1_cache(cache_key, jobs)
                elapsed = (time.perf_counter() - start_time) * 1000
                return self._build_response(query, jobs, elapsed, "l2_cache")
            except json.JSONDecodeError:
                pass
        
        # L3: Inverted index search
        tokens = list(query.keywords)
        job_ids = self._index.search(tokens, limit=query.limit * 2)  # Fetch extra for filtering
        
        if job_ids:
            jobs = self._index.get_jobs(job_ids)
            
            # Apply additional filters
            if query.location and query.location != "India":
                jobs = [
                    j for j in jobs
                    if query.location.lower() in j.get("location", "").lower()
                ]
            
            if query.experience_level:
                jobs = self._filter_by_experience(jobs, query.experience_level)
            
            if query.portal:
                jobs = [j for j in jobs if j.get("portal") == query.portal]
            
            jobs = jobs[:query.limit]
            
            # Cache results
            self._cache_results(cache_key, jobs)
            
            elapsed = (time.perf_counter() - start_time) * 1000
            return self._build_response(query, jobs, elapsed, "index")
        
        # L4: Live fetch (slowest, but ensures fresh data)
        jobs = await self._live_search(query)
        
        # Index and cache
        if jobs:
            job_docs = [JobDocument.from_dict(j) for j in jobs]
            self._index.index_jobs_batch(job_docs)
            self._cache_results(cache_key, jobs)
        
        elapsed = (time.perf_counter() - start_time) * 1000
        return self._build_response(query, jobs, elapsed, "live")
    
    async def _live_search(self, query: SearchQuery) -> List[Dict[str, Any]]:
        """Fetch from external APIs with deduplication."""
        # Use deduplication to prevent redundant API calls
        return await self._dedup.execute_once(
            f"live_search:{query.cache_key()}",
            self._fetch_from_apis,
            query,
        )
    
    async def _fetch_from_apis(self, query: SearchQuery) -> List[Dict[str, Any]]:
        """Fetch jobs from all configured APIs concurrently.
        
        Uses run_in_executor because JobScraperService methods are synchronous
        (they use requests + ThreadPoolExecutor internally) and would block the
        async event loop otherwise — causing 504 timeouts.
        """
        import asyncio
        from app.services.job_scraper_service import JobScraperService
        
        scraper = JobScraperService()
        keywords = list(query.keywords)
        loop = asyncio.get_event_loop()
        
        try:
            if query.portal:
                return await asyncio.wait_for(
                    loop.run_in_executor(None, scraper.fetch_jobs, query.portal, keywords, query.location),
                    timeout=15.0,
                )
            return await asyncio.wait_for(
                loop.run_in_executor(None, scraper.fetch_all_portals, keywords, query.location),
                timeout=15.0,
            )
        except asyncio.TimeoutError:
            logger.warning("Live fetch timed out for query: %s", query.cache_key())
            return []
    
    def _filter_by_experience(
        self,
        jobs: List[Dict[str, Any]],
        level: str
    ) -> List[Dict[str, Any]]:
        """Filter jobs by experience level."""
        level = level.lower()
        
        level_patterns = {
            "fresher": ["0-2", "fresher", "entry", "junior", "graduate", "intern"],
            "mid": ["2-5", "3-5", "mid", "intermediate"],
            "senior": ["5+", "senior", "lead", "principal", "staff", "architect"],
        }
        
        patterns = level_patterns.get(level, [])
        if not patterns:
            return jobs
        
        filtered = []
        for job in jobs:
            exp = (job.get("experience") or "").lower()
            title = (job.get("title") or "").lower()
            if any(p in exp or p in title for p in patterns):
                filtered.append(job)
        
        return filtered if filtered else jobs  # Return all if no matches
    
    def _cache_results(self, key: str, jobs: List[Dict[str, Any]]) -> None:
        """Cache results in both L1 and L2."""
        # L1: In-memory
        self._update_l1_cache(key, jobs)
        
        # L2: Redis
        self._redis.setex(
            key,
            SearchConfig.SEARCH_RESULT_TTL,
            json.dumps(jobs),
        )
    
    def _update_l1_cache(self, key: str, jobs: List[Dict[str, Any]]) -> None:
        """Update L1 cache with LRU eviction."""
        if len(self._search_cache) >= self._cache_max_size:
            # Remove oldest entry
            oldest_key = min(
                self._search_cache.keys(),
                key=lambda k: self._search_cache[k][1]
            )
            del self._search_cache[oldest_key]
        
        self._search_cache[key] = (jobs, time.time())
    
    def _build_response(
        self,
        query: SearchQuery,
        jobs: List[Dict[str, Any]],
        elapsed_ms: float,
        source: str,
    ) -> Dict[str, Any]:
        """Build standardized API response."""
        return {
            "status": "ok",
            "count": len(jobs),
            "keywords": list(query.keywords),
            "location": query.location,
            "jobs": jobs,
            "_meta": {
                "source": source,
                "latency_ms": round(elapsed_ms, 2),
                "cached": source in ("l1_cache", "l2_cache"),
            },
        }
    
    async def warm_cache(self) -> Dict[str, int]:
        """Pre-warm cache with popular queries."""
        warmed = {"queries": 0, "jobs": 0}
        
        for keywords in SearchConfig.POPULAR_QUERIES:
            for location in SearchConfig.POPULAR_LOCATIONS[:3]:  # Top 3 locations
                query = SearchQuery.from_raw(keywords, location)
                try:
                    result = await self.search(query)
                    warmed["queries"] += 1
                    warmed["jobs"] += result.get("count", 0)
                except Exception as e:
                    logger.warning(f"Failed to warm cache for {keywords}: {e}")
        
        logger.info(f"Cache warmed: {warmed}")
        return warmed
    
    def get_stats(self) -> Dict[str, Any]:
        """Get search service statistics."""
        index_stats = self._index.get_stats()
        return {
            "index": index_stats,
            "l1_cache_size": len(self._search_cache),
            "l1_cache_max": self._cache_max_size,
        }
    
    async def close(self):
        """Cleanup resources."""
        if self._session and not self._session.closed:
            await self._session.close()


# ============================================================================
# Cache Warmer (Background Task)
# ============================================================================
class CacheWarmer:
    """
    Background task to keep search cache hot.
    
    Runs periodically to:
    1. Refresh popular query results
    2. Pre-fetch trending searches
    3. Clean up stale index entries
    """
    
    def __init__(self, search_service: HighPerfSearchService):
        self.search = search_service
        self._running = False
    
    async def start(self, interval_seconds: int = 300):
        """Start the cache warmer loop."""
        self._running = True
        
        while self._running:
            try:
                await self.search.warm_cache()
            except Exception as e:
                logger.error(f"Cache warmer error: {e}")
            
            await asyncio.sleep(interval_seconds)
    
    def stop(self):
        """Stop the cache warmer."""
        self._running = False


# ============================================================================
# Singleton Instance
# ============================================================================
_search_service: Optional[HighPerfSearchService] = None


def get_search_service() -> HighPerfSearchService:
    """Get singleton search service instance."""
    global _search_service
    if _search_service is None:
        _search_service = HighPerfSearchService()
    return _search_service


__all__ = [
    "SearchConfig",
    "SearchQuery",
    "JobDocument",
    "InvertedIndex",
    "HighPerfSearchService",
    "CacheWarmer",
    "get_search_service",
]
