"""Celery tasks for job aggregation and recommendation.

These tasks orchestrate:
1. Periodic fetching of jobs from supported portals:
   - Adzuna (free tier, supports India)
   - JSearch (RapidAPI, aggregates LinkedIn/Indeed/Glassdoor)
   - Remotive (free, remote tech jobs)
   - Enhanced sources: Greenhouse, Lever, Workday, SmartRecruiters, Ashby
2. Matching jobs to a specific resume after processing completes
3. Cache warming for popular queries
4. Index maintenance for fast search

Design Notes:
- Job listings cached in Redis (NOT persisted to DB)
- Recommendations cached per resume (24h TTL)
- Tasks are idempotent and safe to re-run
- Cache warming runs every 5 minutes for popular queries
"""
from __future__ import annotations

import asyncio
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

# Enhanced portals for new sources
_ENHANCED_PORTALS = ["greenhouse", "lever", "workday", "smartrecruiters", "ashby"]

# Popular queries to pre-warm
_POPULAR_QUERIES = [
    ("software engineer", "India"),
    ("python developer", "India"),
    ("python developer", "Bangalore"),
    ("data scientist", "India"),
    ("frontend developer", "India"),
    ("backend developer", "India"),
    ("full stack developer", "India"),
    ("machine learning", "India"),
    ("devops engineer", "India"),
    ("react developer", "India"),
    ("java developer", "India"),
    ("cloud engineer", "India"),
    ("software engineer", "Bangalore"),
    ("software engineer", "Mumbai"),
    ("software engineer", "Remote"),
]


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


@celery_app.task(name="warm_search_cache", bind=True, max_retries=1)
def warm_search_cache(self) -> Dict[str, Any]:
    """
    Pre-warm the search cache with popular queries.
    
    This task should run every 5 minutes via Celery Beat to ensure
    popular searches return in milliseconds.
    """
    try:
        from app.services.high_perf_search import get_search_service, SearchQuery
    except ImportError:
        logger.warning("High-perf search not available; skipping cache warm")
        return {"status": "skipped", "reason": "import_error"}
    
    search_service = get_search_service()
    warmed = 0
    errors = 0
    
    for keywords, location in _POPULAR_QUERIES:
        try:
            query = SearchQuery.from_raw(keywords, location)
            # Run async in sync context
            loop = asyncio.new_event_loop()
            try:
                loop.run_until_complete(search_service.search(query))
                warmed += 1
            finally:
                loop.close()
        except Exception as e:
            logger.warning("Failed to warm cache for %s: %s", keywords, e)
            errors += 1
    
    logger.info("Cache warm completed: warmed=%d, errors=%d", warmed, errors)
    return {"status": "ok", "queries_warmed": warmed, "errors": errors}


@celery_app.task(name="fetch_enhanced_jobs", bind=True, max_retries=2, default_retry_delay=180)
def fetch_enhanced_jobs(
    self,
    keywords: Optional[List[str]] = None,
    location: str = "India",
) -> Dict[str, Any]:
    """
    Fetch jobs from enhanced sources (Greenhouse, Lever, etc.).
    
    These sources provide jobs from top tech companies directly
    from their ATS systems.
    """
    try:
        from app.services.enhanced_job_scraper import get_sync_job_scraper
    except ImportError:
        logger.warning("Enhanced scraper not available")
        return {"status": "error", "detail": "import_error"}
    
    scraper = get_sync_job_scraper()
    kw_list = keywords or ["software engineer", "python", "developer"]
    
    try:
        jobs = scraper.fetch_jobs(kw_list, location)
        logger.info("Fetched %d jobs from enhanced sources", len(jobs))
        return {
            "status": "ok",
            "total_jobs": len(jobs),
            "keywords": kw_list,
            "location": location,
        }
    except Exception as e:
        logger.error("Error fetching enhanced jobs: %s", e)
        return {"status": "error", "detail": str(e)}


@celery_app.task(name="index_jobs_for_fast_search", bind=True, max_retries=1)
def index_jobs_for_fast_search(self, jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Index a batch of jobs into the inverted index for fast search.
    
    This enables millisecond search responses by pre-indexing jobs.
    """
    try:
        from app.services.high_perf_search import (
            get_search_service,
            JobDocument,
        )
    except ImportError:
        logger.warning("High-perf search not available")
        return {"status": "error", "detail": "import_error"}
    
    if not jobs:
        return {"status": "ok", "indexed": 0}
    
    search_service = get_search_service()
    
    # Convert to JobDocument and index
    job_docs = [JobDocument.from_dict(j) for j in jobs]
    indexed = search_service._index.index_jobs_batch(job_docs)
    
    logger.info("Indexed %d jobs for fast search", indexed)
    return {"status": "ok", "indexed": indexed}


# Celery Beat schedule for automated tasks
celery_app.conf.beat_schedule = celery_app.conf.beat_schedule or {}
celery_app.conf.beat_schedule.update({
    'warm-search-cache-every-5-min': {
        'task': 'warm_search_cache',
        'schedule': 5 * 60,  # 5 minutes
    },
    'fetch-jobs-every-4-hours': {
        'task': 'fetch_jobs_from_portals',
        'schedule': 4 * 60 * 60,  # 4 hours
        'args': (['python', 'developer', 'software engineer'], 'India'),
    },
    'fetch-enhanced-jobs-every-2-hours': {
        'task': 'fetch_enhanced_jobs',
        'schedule': 2 * 60 * 60,  # 2 hours
        'args': (['software engineer', 'python', 'developer'], 'India'),
    },
})

# To run Celery Beat: celery -A app.tasks.celery_app beat --loglevel=info

__all__ = [
    "fetch_jobs_from_portals",
    "match_jobs_to_resume",
    "warm_search_cache",
    "fetch_enhanced_jobs",
    "index_jobs_for_fast_search",
]
