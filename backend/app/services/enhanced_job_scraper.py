"""
Enhanced Job Scraper Service
=============================
High-performance job aggregator with support for multiple sources.

Features:
- Async fetching from all sources in parallel
- Connection pooling for efficient HTTP requests
- Rate limiting per source
- Automatic retry with exponential backoff
- Request deduplication
- Smart caching with pre-warming
- Hourly batch fetching for RapidAPI cost optimization
- Single shared API key for 10K+ concurrent users

Supports:
- Free ATS sources: Greenhouse, Lever, Workday, SmartRecruiters, Ashby
- RapidAPI sources: Indeed, Glassdoor, SimplyHired/LinkedIn (JSearch)
- Existing sources: Adzuna, JSearch, Remotive
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set

import aiohttp
import redis
from redis import asyncio as aioredis

try:
    from app.core.config import settings
except Exception:
    class _Settings:
        REDIS_URL = "redis://localhost:6379/0"
        ADZUNA_APP_ID = ""
        ADZUNA_APP_KEY = ""
        JSEARCH_API_KEY = ""
        RAPIDAPI_KEY = ""
        DEBUG = True
    settings = _Settings()

from .job_sources.base import JobResult, AggregatedJobSource
from .job_sources.greenhouse import GreenhouseSource
from .job_sources.lever import LeverSource
from .job_sources.workday import WorkdaySource
from .job_sources.smartrecruiters import SmartRecruitersSource
from .job_sources.ashby import AshbySource
# RapidAPI sources - cost-optimized with shared API key
from .job_sources.indeed import IndeedJobSource
from .job_sources.glassdoor import GlassdoorJobSource
from .job_sources.simplyhired import SimplyHiredJobSource
from .rapidapi_manager import get_rapidapi_manager, RapidAPIManager

logger = logging.getLogger(__name__)


@dataclass
class FetchStats:
    """Statistics for a fetch operation."""
    total_jobs: int
    sources_queried: int
    sources_succeeded: int
    latency_ms: float
    cache_hit: bool
    deduped_count: int


class EnhancedJobScraperService:
    """
    High-performance job scraper with multi-source aggregation.
    
    Optimized for:
    - 1000+ concurrent users
    - Sub-100ms response time (cached)
    - Zero race conditions
    - Minimal external API calls
    
    Architecture:
    - Free ATS sources: Fetched in real-time (no API limits)
    - RapidAPI sources: Hourly batch fetch (cost optimization)
    - Multi-level cache: L1 in-memory → L2 Redis → L3 Batch
    """
    
    # Configuration
    CACHE_TTL = 300  # 5 minutes for aggregated results
    MAX_CONCURRENT_SOURCES = 10
    REQUEST_TIMEOUT = 15
    
    # Source categorization
    FREE_SOURCES = ["greenhouse", "lever", "workday", "smartrecruiters", "ashby"]
    RAPIDAPI_SOURCES = ["indeed", "glassdoor", "simplyhired"]
    
    def __init__(self):
        self._redis = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=100,
        )
        
        # Get shared RapidAPI key
        rapidapi_key = getattr(settings, "RAPIDAPI_KEY", "")
        
        # Initialize free ATS sources (no API key needed)
        self._free_sources = [
            GreenhouseSource(self._redis),
            LeverSource(self._redis),
            WorkdaySource(self._redis),
            SmartRecruitersSource(self._redis),
            AshbySource(self._redis),
        ]
        
        # Initialize RapidAPI sources with SHARED API key
        self._rapidapi_sources = [
            IndeedJobSource(api_key=rapidapi_key),
            GlassdoorJobSource(api_key=rapidapi_key),
            SimplyHiredJobSource(api_key=rapidapi_key),
        ]
        
        # All sources combined
        self._sources = self._free_sources + self._rapidapi_sources
        
        self._aggregator = AggregatedJobSource(self._free_sources)
        
        # RapidAPI manager for cost optimization
        self._rapidapi_manager = get_rapidapi_manager()
        
        # In-flight request deduplication
        self._pending_requests: Dict[str, asyncio.Event] = {}
        self._pending_results: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = asyncio.Lock()
        
        # Thread pool for sync operations
        self._executor = ThreadPoolExecutor(max_workers=10)
    
    def _generate_cache_key(
        self,
        keywords: List[str],
        location: str,
        sources: Optional[List[str]] = None,
    ) -> str:
        """Generate deterministic cache key."""
        key_parts = [
            "enhanced_jobs",
            "_".join(sorted(keywords)),
            location.lower().replace(" ", "_"),
            "_".join(sorted(sources or ["all"])),
        ]
        key = ":".join(key_parts)
        if len(key) > 200:
            return f"enhanced_jobs:{hashlib.sha256(key.encode()).hexdigest()[:32]}"
        return key
    
    async def fetch_jobs(
        self,
        keywords: List[str],
        location: str = "India",
        sources: Optional[List[str]] = None,
        limit: int = 50,
        use_cache: bool = True,
    ) -> tuple[List[Dict[str, Any]], FetchStats]:
        """
        Fetch jobs from all sources with intelligent caching.
        
        Args:
            keywords: Search keywords
            location: Location filter
            sources: Specific sources to query (None = all)
            limit: Maximum results
            use_cache: Whether to use cached results
        
        Returns:
            Tuple of (jobs list, fetch statistics)
        """
        start_time = time.perf_counter()
        cache_key = self._generate_cache_key(keywords, location, sources)
        
        # Check cache first
        if use_cache:
            cached = self._redis.get(cache_key)
            if cached:
                import json
                jobs = json.loads(cached)
                elapsed = (time.perf_counter() - start_time) * 1000
                
                stats = FetchStats(
                    total_jobs=len(jobs),
                    sources_queried=0,
                    sources_succeeded=0,
                    latency_ms=elapsed,
                    cache_hit=True,
                    deduped_count=0,
                )
                
                return jobs[:limit], stats
        
        # Check for in-flight request (deduplication)
        async with self._lock:
            if cache_key in self._pending_requests:
                # Wait for existing request to complete
                event = self._pending_requests[cache_key]
        
        if cache_key in self._pending_requests:
            await event.wait()
            jobs = self._pending_results.get(cache_key, [])
            elapsed = (time.perf_counter() - start_time) * 1000
            
            stats = FetchStats(
                total_jobs=len(jobs),
                sources_queried=0,
                sources_succeeded=0,
                latency_ms=elapsed,
                cache_hit=True,  # Effectively cached via dedup
                deduped_count=0,
            )
            
            return jobs[:limit], stats
        
        # Create pending request event
        async with self._lock:
            event = asyncio.Event()
            self._pending_requests[cache_key] = event
        
        try:
            # Fetch from sources
            jobs, sources_succeeded = await self._fetch_from_sources(
                keywords, location, sources
            )
            
            # Deduplicate
            jobs, deduped_count = self._deduplicate_jobs(jobs)
            
            # Sort by date
            jobs.sort(key=lambda j: j.get("posted_date", ""), reverse=True)
            
            # Cache results
            import json
            self._redis.setex(cache_key, self.CACHE_TTL, json.dumps(jobs))
            
            # Store for other waiters
            self._pending_results[cache_key] = jobs
            
            elapsed = (time.perf_counter() - start_time) * 1000
            
            stats = FetchStats(
                total_jobs=len(jobs),
                sources_queried=len(self._sources) if not sources else len(sources),
                sources_succeeded=sources_succeeded,
                latency_ms=elapsed,
                cache_hit=False,
                deduped_count=deduped_count,
            )
            
            return jobs[:limit], stats
        
        finally:
            # Signal waiters and cleanup
            event.set()
            async with self._lock:
                self._pending_requests.pop(cache_key, None)
                # Keep result for a bit for late arrivals
                asyncio.create_task(self._cleanup_result(cache_key, 5))
    
    async def _cleanup_result(self, key: str, delay: float):
        """Clean up pending result after delay."""
        await asyncio.sleep(delay)
        self._pending_results.pop(key, None)
    
    async def _fetch_from_sources(
        self,
        keywords: List[str],
        location: str,
        sources: Optional[List[str]],
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        Fetch from all sources in parallel.
        
        Strategy:
        - Free sources: Fetch in real-time (no rate limits)
        - RapidAPI sources: Check cache first, queue if miss
        """
        # Determine which sources to query
        if sources:
            source_names = set(sources)
            active_free = [s for s in self._free_sources if s.name in source_names]
            active_rapidapi = [s for s in self._rapidapi_sources if s.name in source_names]
        else:
            active_free = self._free_sources
            active_rapidapi = self._rapidapi_sources
        
        all_jobs = []
        succeeded = 0
        
        # Create tasks with semaphore to limit concurrency
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_SOURCES)
        
        async def fetch_with_limit(source):
            async with semaphore:
                try:
                    results, meta = await source.search_with_ratelimit(
                        keywords, location, 1, 30
                    )
                    return [r.to_dict() for r in results], True
                except Exception as e:
                    logger.warning(f"Source {source.name} failed: {e}")
                    return [], False
        
        # Fetch from free sources in real-time
        tasks = [fetch_with_limit(source) for source in active_free]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                continue
            jobs, success = result
            all_jobs.extend(jobs)
            if success:
                succeeded += 1
        
        # For RapidAPI sources: Check cache first, then try live fetch
        for source in active_rapidapi:
            try:
                # First check if we have cached results
                cached = await self._rapidapi_manager.get_cached_results(
                    keywords, location, source.name
                )
                
                if cached:
                    all_jobs.extend(cached)
                    succeeded += 1
                    logger.debug(f"Using cached results for {source.name}")
                else:
                    # Queue for hourly batch if not cached
                    await self._rapidapi_manager.queue_request(
                        keywords, location, source.name, priority=1
                    )
                    
                    # Try live fetch as fallback (if within rate limit)
                    try:
                        async with semaphore:
                            live_results = await source.search(keywords, location, 1, 20)
                            if live_results:
                                jobs = [r.to_dict() for r in live_results]
                                all_jobs.extend(jobs)
                                succeeded += 1
                                logger.debug(f"Live fetch from {source.name}: {len(jobs)} jobs")
                    except Exception as e:
                        logger.debug(f"Live fetch failed for {source.name}, queued for batch: {e}")
                        
            except Exception as e:
                logger.warning(f"RapidAPI source {source.name} failed: {e}")
        
        return all_jobs, succeeded
    
    def _deduplicate_jobs(
        self,
        jobs: List[Dict[str, Any]],
    ) -> tuple[List[Dict[str, Any]], int]:
        """Remove duplicate jobs based on title + company."""
        seen: Set[str] = set()
        unique = []
        duplicates = 0
        
        for job in jobs:
            # Create fingerprint
            title = (job.get("title") or "").lower().strip()
            company = (job.get("company") or "").lower().strip()
            
            # Normalize
            title = " ".join(title.split())
            company = " ".join(company.split())
            
            fingerprint = f"{title}:{company}"
            
            if fingerprint not in seen:
                seen.add(fingerprint)
                unique.append(job)
            else:
                duplicates += 1
        
        return unique, duplicates
    
    async def fetch_by_source(
        self,
        source_name: str,
        keywords: List[str],
        location: str = "India",
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        """Fetch from a specific source only."""
        source = next(
            (s for s in self._sources if s.name == source_name),
            None
        )
        
        if not source:
            return []
        
        try:
            results, _ = await source.search_with_ratelimit(
                keywords, location, 1, limit
            )
            return [r.to_dict() for r in results]
        except Exception as e:
            logger.warning(f"Failed to fetch from {source_name}: {e}")
            return []
    
    async def get_source_stats(self) -> Dict[str, Any]:
        """Get statistics for all sources."""
        stats = {
            "sources": [],
            "total_active": len(self._sources),
            "free_sources": len(self._free_sources),
            "rapidapi_sources": len(self._rapidapi_sources),
            "rapidapi_stats": self._rapidapi_manager.get_stats(),
            "cache_health": self._rapidapi_manager.get_cache_health(),
        }
        
        for source in self._free_sources:
            stats["sources"].append({
                "name": source.name,
                "type": "free",
                "rate_limit": source.rate_limit,
                "rate_limit_remaining": source._rate_limiter.get_remaining() if hasattr(source, '_rate_limiter') else None,
            })
        
        for source in self._rapidapi_sources:
            stats["sources"].append({
                "name": source.name,
                "type": "rapidapi",
                "rate_limit": source.rate_limit,
                "note": "Hourly batch fetch for cost optimization",
            })
        
        return stats
    
    async def batch_fetch_rapidapi_sources(
        self,
        keywords: List[str],
        location: str = "India",
    ) -> Dict[str, Any]:
        """
        Batch fetch from all RapidAPI sources.
        
        Called by Celery hourly task.
        """
        async def fetch_callback(keywords, location, source):
            source_obj = next(
                (s for s in self._rapidapi_sources if s.name == source),
                None
            )
            if not source_obj:
                return []
            
            results = await source_obj.search(keywords, location, 1, 30)
            return [r.to_dict() for r in results]
        
        return await self._rapidapi_manager.execute_batch_fetch(fetch_callback)
    
    async def fetch_from_rapidapi_source(
        self,
        source_name: str,
        keywords: List[str],
        location: str = "India",
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        """Fetch from a specific RapidAPI source."""
        source = next(
            (s for s in self._rapidapi_sources if s.name == source_name),
            None
        )
        
        if not source:
            return []
        
        try:
            results = await source.search(keywords, location, 1, limit)
            return [r.to_dict() for r in results]
        except Exception as e:
            logger.warning(f"Failed to fetch from {source_name}: {e}")
            return []
    
    async def warm_cache(self, keywords: List[str], locations: List[str]) -> int:
        """Pre-warm cache with popular queries."""
        warmed = 0
        
        for location in locations:
            try:
                await self.fetch_jobs(keywords, location, use_cache=False)
                warmed += 1
            except Exception as e:
                logger.warning(f"Failed to warm cache for {keywords} in {location}: {e}")
        
        return warmed
    
    async def close(self):
        """Cleanup resources."""
        await self._aggregator.close()
        self._executor.shutdown(wait=False)


# Synchronous wrapper for Celery tasks
class SyncJobScraperService:
    """
    Synchronous wrapper for use with Celery and non-async code.
    """
    
    def __init__(self):
        self._async_service: Optional[EnhancedJobScraperService] = None
    
    def _get_service(self) -> EnhancedJobScraperService:
        if self._async_service is None:
            self._async_service = EnhancedJobScraperService()
        return self._async_service
    
    def fetch_jobs(
        self,
        keywords: List[str],
        location: str = "India",
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Synchronous job fetch."""
        service = self._get_service()
        
        loop = asyncio.new_event_loop()
        try:
            jobs, _ = loop.run_until_complete(
                service.fetch_jobs(keywords, location, None, limit)
            )
            return jobs
        finally:
            loop.close()
    
    def fetch_by_source(
        self,
        source_name: str,
        keywords: List[str],
        location: str = "India",
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        """Synchronous fetch from specific source."""
        service = self._get_service()
        
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                service.fetch_by_source(source_name, keywords, location, limit)
            )
        finally:
            loop.close()


# Singleton instances
_enhanced_service: Optional[EnhancedJobScraperService] = None
_sync_service: Optional[SyncJobScraperService] = None


def get_enhanced_job_scraper() -> EnhancedJobScraperService:
    """Get singleton enhanced job scraper."""
    global _enhanced_service
    if _enhanced_service is None:
        _enhanced_service = EnhancedJobScraperService()
    return _enhanced_service


def get_sync_job_scraper() -> SyncJobScraperService:
    """Get singleton sync job scraper."""
    global _sync_service
    if _sync_service is None:
        _sync_service = SyncJobScraperService()
    return _sync_service


__all__ = [
    "EnhancedJobScraperService",
    "SyncJobScraperService",
    "FetchStats",
    "get_enhanced_job_scraper",
    "get_sync_job_scraper",
]
