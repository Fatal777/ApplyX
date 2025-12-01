"""Redis-backed caching service for job listings and recommendations.

This module provides a thin abstraction over Redis for:
- Caching raw job listings fetched from external portals (short TTL)
- Caching matched job recommendations for a resume (longer TTL)

All data is stored as JSON strings for portability. We intentionally avoid
persisting jobs in PostgreSQL to keep the system lightweight and avoid
storage / compliance issues.
"""
from __future__ import annotations

import json
import logging
from typing import List, Dict, Any, Optional

import redis

try:
    from app.core.config import settings  # type: ignore
except Exception:  # pragma: no cover
    # Fallback for minimal environment where settings may not exist
    class _Settings:  # type: ignore
        REDIS_URL = "redis://localhost:6379/0"
        REDIS_MAX_CONNECTIONS = 50

    settings = _Settings()  # type: ignore

logger = logging.getLogger(__name__)


class JobCacheService:
    """Encapsulates Redis caching logic for jobs & recommendations.

    Key Strategy:
    jobs:portal:{portal}:page:{page}        -> Raw listings (TTL: 4h)
    job_recs:{resume_id}                    -> Recommendations (TTL: 24h)
    profile:{user_id}                       -> Optional cached profile (TTL: 7d)
    ratelimit:{portal}:{minute_epoch}       -> Per-minute portal rate limit counter
    """

    JOB_LISTINGS_TTL_SECONDS = 4 * 60 * 60  # 4 hours
    RECOMMENDATIONS_TTL_SECONDS = 24 * 60 * 60  # 24 hours
    PROFILE_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days

    def __init__(self) -> None:
        self._redis = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=getattr(settings, "REDIS_MAX_CONNECTIONS", 50),
        )

    # ---------------------- Job Listings ----------------------
    def cache_job_listings(self, portal: str, page: int, jobs: List[Dict[str, Any]]) -> None:
        key = f"jobs:portal:{portal}:page:{page}"
        self._redis.setex(key, self.JOB_LISTINGS_TTL_SECONDS, json.dumps(jobs))
        logger.debug("Cached %d jobs for portal=%s page=%d", len(jobs), portal, page)

    def get_cached_job_listings(self, portal: str, page: int) -> Optional[List[Dict[str, Any]]]:
        key = f"jobs:portal:{portal}:page:{page}"
        raw = self._redis.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Corrupted job listings cache for key=%s", key)
            return None

    # ------------------ Job Recommendations -------------------
    def cache_recommendations(self, resume_id: int, jobs: List[Dict[str, Any]]) -> None:
        key = f"job_recs:{resume_id}"
        self._redis.setex(key, self.RECOMMENDATIONS_TTL_SECONDS, json.dumps(jobs))
        logger.debug("Cached %d recommendations for resume_id=%d", len(jobs), resume_id)

    def get_cached_recommendations(self, resume_id: int) -> Optional[List[Dict[str, Any]]]:
        key = f"job_recs:{resume_id}"
        raw = self._redis.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Corrupted recommendations cache for key=%s", key)
            return None

    # ------------------ User Profile Cache --------------------
    def cache_user_profile(self, user_id: int, profile: Dict[str, Any]) -> None:
        key = f"profile:{user_id}"
        self._redis.setex(key, self.PROFILE_TTL_SECONDS, json.dumps(profile))
        logger.debug("Cached profile for user_id=%d", user_id)

    def get_cached_user_profile(self, user_id: int) -> Optional[Dict[str, Any]]:
        key = f"profile:{user_id}"
        raw = self._redis.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Corrupted profile cache for key=%s", key)
            return None

    # ------------------ Rate Limiting Helpers -----------------
    def increment_rate_limit(self, portal: str, minute_epoch: int) -> int:
        key = f"ratelimit:{portal}:{minute_epoch}"
        count = self._redis.incr(key)
        # Ensure key expires after 60 seconds (one minute bucket)
        if count == 1:
            self._redis.expire(key, 60)
        return count

    def get_rate_limit_count(self, portal: str, minute_epoch: int) -> int:
        key = f"ratelimit:{portal}:{minute_epoch}"
        raw = self._redis.get(key)
        return int(raw) if raw else 0

__all__ = ["JobCacheService"]
