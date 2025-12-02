"""
Base classes for job sources.
"""

from __future__ import annotations

import asyncio
import hashlib
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import aiohttp
import redis

try:
    from app.core.config import settings
except Exception:
    class _Settings:
        REDIS_URL = "redis://localhost:6379/0"
    settings = _Settings()


@dataclass
class JobResult:
    """Standardized job result from any source."""
    
    job_id: str
    title: str
    company: str
    location: str
    description: str
    redirect_url: str
    portal: str
    posted_date: str
    skills: List[str] = field(default_factory=list)
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    experience: Optional[str] = None
    job_type: Optional[str] = None  # full-time, part-time, contract
    remote: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to API-compatible dict."""
        return {
            "job_id": self.job_id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "description": self.description,
            "redirect_url": self.redirect_url,
            "portal": self.portal,
            "posted_date": self.posted_date,
            "skills": self.skills,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "experience": self.experience,
            "job_type": self.job_type,
            "remote": self.remote,
        }
    
    @classmethod
    def generate_id(cls, source: str, external_id: str) -> str:
        """Generate unique job ID from source and external ID."""
        return f"{source}:{external_id}"


class RateLimiter:
    """
    Distributed rate limiter using Redis.
    Prevents exceeding API rate limits across multiple workers.
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        key_prefix: str,
        max_requests: int,
        window_seconds: int,
    ):
        self.redis = redis_client
        self.key_prefix = key_prefix
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def _get_key(self) -> str:
        """Get rate limit key for current window."""
        window = int(time.time()) // self.window_seconds
        return f"ratelimit:{self.key_prefix}:{window}"
    
    def is_allowed(self) -> bool:
        """Check if request is allowed under rate limit."""
        key = self._get_key()
        current = self.redis.incr(key)
        
        if current == 1:
            self.redis.expire(key, self.window_seconds)
        
        return current <= self.max_requests
    
    def get_remaining(self) -> int:
        """Get remaining requests in current window."""
        key = self._get_key()
        current = int(self.redis.get(key) or 0)
        return max(0, self.max_requests - current)
    
    async def wait_if_needed(self) -> bool:
        """Wait if rate limited, return True if can proceed."""
        while not self.is_allowed():
            # Wait until next window
            await asyncio.sleep(1)
        return True


class JobSource(ABC):
    """
    Abstract base class for job sources.
    
    Each job source must implement:
    - search(): Search for jobs matching keywords
    - fetch_by_id(): Fetch a specific job by ID
    """
    
    # Source configuration
    name: str = "base"
    base_url: str = ""
    rate_limit: int = 10  # requests per minute
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self._redis = redis_client or redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
        self._rate_limiter = RateLimiter(
            self._redis,
            self.name,
            self.rate_limit,
            60,  # 1 minute window
        )
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=10)
            connector = aiohttp.TCPConnector(limit=20, keepalive_timeout=30)
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers=self._get_headers(),
            )
        return self._session
    
    def _get_headers(self) -> Dict[str, str]:
        """Get default headers for requests."""
        return {
            "User-Agent": "ApplyX/1.0 (Job Aggregator)",
            "Accept": "application/json",
        }
    
    @abstractmethod
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """
        Search for jobs matching keywords.
        
        Args:
            keywords: List of search keywords
            location: Location filter
            page: Page number (1-indexed)
            limit: Results per page
        
        Returns:
            List of JobResult objects
        """
        pass
    
    @abstractmethod
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """
        Fetch a specific job by ID.
        
        Args:
            job_id: The job ID from this source
        
        Returns:
            JobResult if found, None otherwise
        """
        pass
    
    async def search_with_ratelimit(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[JobResult], Dict[str, Any]]:
        """Search with rate limiting and metadata."""
        await self._rate_limiter.wait_if_needed()
        
        start_time = time.perf_counter()
        jobs = await self.search(keywords, location, page, limit)
        elapsed = (time.perf_counter() - start_time) * 1000
        
        meta = {
            "source": self.name,
            "count": len(jobs),
            "latency_ms": round(elapsed, 2),
            "rate_limit_remaining": self._rate_limiter.get_remaining(),
        }
        
        return jobs, meta
    
    async def close(self):
        """Close the session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    def __del__(self):
        """Cleanup on deletion."""
        if self._session and not self._session.closed:
            asyncio.create_task(self._session.close())


class AggregatedJobSource:
    """
    Aggregates multiple job sources for parallel fetching.
    """
    
    def __init__(self, sources: List[JobSource]):
        self.sources = sources
    
    async def search_all(
        self,
        keywords: List[str],
        location: str = "India",
        limit_per_source: int = 20,
    ) -> Dict[str, List[JobResult]]:
        """Search all sources in parallel."""
        tasks = [
            source.search_with_ratelimit(keywords, location, 1, limit_per_source)
            for source in self.sources
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        aggregated = {}
        for source, result in zip(self.sources, results):
            if isinstance(result, Exception):
                aggregated[source.name] = []
            else:
                jobs, meta = result
                aggregated[source.name] = jobs
        
        return aggregated
    
    async def search_merged(
        self,
        keywords: List[str],
        location: str = "India",
        limit: int = 50,
    ) -> List[JobResult]:
        """Search all sources and merge results."""
        results = await self.search_all(keywords, location, limit)
        
        # Merge and deduplicate
        all_jobs = []
        seen_titles = set()
        
        for source_jobs in results.values():
            for job in source_jobs:
                # Simple dedup by title + company
                key = f"{job.title.lower()}:{job.company.lower()}"
                if key not in seen_titles:
                    seen_titles.add(key)
                    all_jobs.append(job)
        
        # Sort by freshness (most recent first)
        all_jobs.sort(
            key=lambda j: j.posted_date or "",
            reverse=True,
        )
        
        return all_jobs[:limit]
    
    async def close(self):
        """Close all sources."""
        for source in self.sources:
            await source.close()
