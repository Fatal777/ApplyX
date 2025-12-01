"""Celery tasks for job aggregation and recommendation.

These tasks orchestrate:
1. Periodic fetching of jobs from supported portals:
   - Adzuna (free tier, supports India)
   - JSearch (RapidAPI, aggregates LinkedIn/Indeed/Glassdoor)
   - Remotive (free, remote tech jobs)
2. Matching jobs to a specific resume after processing completes

Design Notes:
- Job listings cached in Redis (NOT persisted to DB)
- Recommendations cached per resume (24h TTL)
- Tasks are idempotent and safe to re-run
"""
from __future__ import annotations

import logging
from typing import List, Dict, Any, Optional

try:
    from app.tasks.celery_app import celery_app  # existing celery instance
except Exception:  # pragma: no cover
    from celery import Celery
    celery_app = Celery(__name__, broker="redis://localhost:6379/0")  # fallback for minimal env

from app.services.job_scraper_service import JobScraperService
from app.services.job_matching_service import JobMatchingService
from app.services.job_cache_service import JobCacheService

# Type-only imports for static analysis
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.db.database import SessionLocal as SessionLocalType
    from app.models.resume import Resume as ResumeType

try:
    from app.db.database import SessionLocal
    from app.models.resume import Resume
except Exception:  # pragma: no cover
    SessionLocal = None  # type: ignore
    Resume = None  # type: ignore

logger = logging.getLogger(__name__)

# Active job portals (must match keys in JobScraperService._RATE_LIMITS)
_PORTALS = ["adzuna", "jsearch", "remotive"]


@celery_app.task(name="fetch_jobs_from_portals", bind=True, max_retries=3, default_retry_delay=300)
def fetch_jobs_from_portals(self, keywords: Optional[List[str]] = None, location: str = "India") -> Dict[str, Any]:
    """Fetch jobs from all configured portals (stubbed) and cache them.

    This task is intended to be scheduled periodically (e.g., every 4 hours)
    via Celery Beat. Keywords help narrow down generalized queries.
    """
    scraper = JobScraperService()
    cache = JobCacheService()

    total = 0
    portal_counts: Dict[str, int] = {}

    for portal in _PORTALS:
        try:
            jobs = scraper.fetch_jobs(portal, keywords or ["python", "developer"], location)
            cache.cache_job_listings(portal, 1, jobs)
            count = len(jobs)
            portal_counts[portal] = count
            total += count
            logger.info("Fetched %d jobs from %s", count, portal)
        except Exception as e:  # pragma: no cover
            logger.error("Error fetching jobs portal=%s error=%s", portal, e)
            portal_counts[portal] = 0

    return {"total_jobs": total, "portal_counts": portal_counts}


@celery_app.task(name="match_jobs_to_resume", bind=True, max_retries=2, default_retry_delay=120)
def match_jobs_to_resume(self, resume_id: int, top_n: int = 20) -> Dict[str, Any]:
    """Match cached jobs to a resume and store recommendations in Redis.

    If the resume or cached jobs are missing, the task will attempt to trigger
    a fetch first (simple strategy) and instruct caller to retry later.
    """
    cache = JobCacheService()
    scraper = JobScraperService()
    matcher = JobMatchingService()

    if SessionLocal is None or Resume is None:  # pragma: no cover
        logger.error("Database components not available; cannot match jobs")
        return {"status": "error", "detail": "DB unavailable"}

    db = SessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            return {"status": "error", "detail": "Resume not found"}

        # Gather cached jobs across portals
        all_jobs: List[Dict[str, Any]] = []
        for portal in _PORTALS:
            cached = cache.get_cached_job_listings(portal, 1)
            if cached:
                all_jobs.extend(cached)
        if not all_jobs:
            # Trigger background fetch and instruct caller to retry later
            fetch_jobs_from_portals.delay(resume.keywords[:5] if resume.keywords else None)
            return {"status": "pending_fetch", "detail": "No cached jobs; fetch triggered"}

        # Infer experience level from resume if available
        experience_years = getattr(resume, 'experience_years', None)
        experience_level = getattr(resume, 'experience_level', None)

        matched = matcher.match_jobs(
            resume_keywords=resume.keywords or [],
            resume_skills=resume.skills or [],
            job_listings=all_jobs,
            top_n=top_n,
            experience_years=experience_years,
            experience_level=experience_level,
        )
        cache.cache_recommendations(resume_id, matched)
        logger.info("Matched %d jobs for resume_id=%d", len(matched), resume_id)
        return {"status": "ok", "count": len(matched)}
    finally:
        db.close()


# (Optional) Example periodic schedule (to be placed where Celery beat config is defined)
# celery_app.conf.beat_schedule.update({
#     'fetch-jobs-every-4-hours': {
#         'task': 'fetch_jobs_from_portals',
#         'schedule': 4 * 60 * 60,  # 4 hours in seconds
#         'args': (['python', 'developer', 'software engineer'], 'India')
#     }
# })
#
# To run Celery Beat: celery -A app.tasks.celery_app beat --loglevel=info

__all__ = ["fetch_jobs_from_portals", "match_jobs_to_resume"]
