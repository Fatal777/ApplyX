"""Job recommendation API routes.

Endpoints:
GET /api/v1/jobs/recommendations/{resume_id}      -> Initiate / retrieve recommendations
GET /api/v1/jobs/recommendations/{resume_id}/status -> Poll for recommendation readiness
POST /api/v1/jobs/recommendations/{resume_id}/refresh -> Force refresh recommendations
GET /api/v1/jobs/search -> Search available jobs directly (bypasses resume matching)
GET /api/v1/jobs/fast-search -> Millisecond search using inverted index
GET /api/v1/jobs/sources -> List available job sources

Notes:
- Uses Redis cache for recommendations (24h TTL)
- Triggers Celery matching task if not cached
- Authentication dependency is optional fallback if not present in minimal env
- New fast-search endpoint uses inverted index for sub-100ms responses
"""
from __future__ import annotations

import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from typing import Optional, List
from pydantic import BaseModel

from app.services.job_cache_service import JobCacheService
from app.services.job_scraper_service import JobScraperService
from app.services.job_matching_service import JobMatchingService
from app.services.high_perf_search import (
    SearchQuery,
    get_search_service,
    HighPerfSearchService,
)
from app.services.enhanced_job_scraper import (
    get_enhanced_job_scraper,
    EnhancedJobScraperService,
)
from app.tasks.job_tasks import match_jobs_to_resume, fetch_jobs_from_portals
from app.middleware.security import limiter

# Type-only imports for static analysis
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User as UserType

# Attempt to import auth dependencies; fallback for minimal environment
try:  # pragma: no cover
    from app.api.dependencies import get_current_active_user
    from app.models.user import User
except Exception:  # pragma: no cover
    def get_current_active_user():  # type: ignore
        return {"id": 0, "role": "anonymous"}

    class User:  # type: ignore
        """Fallback User class for minimal environment."""
        pass

router = APIRouter(prefix="/jobs", tags=["Jobs"])
_cache = JobCacheService()


# Response models for better API documentation
class JobResponse(BaseModel):
    title: str
    company: str
    location: str
    description: str
    skills: List[str] = []
    redirect_url: str
    portal: str
    posted_date: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    experience: Optional[str] = None
    match_score: Optional[float] = None
    skill_matches: List[str] = []

    class Config:
        extra = "allow"  # Allow extra fields from different portals


class RecommendationsResponse(BaseModel):
    status: str
    count: int = 0
    jobs: List[dict] = []
    task_id: Optional[str] = None
    message: Optional[str] = None


@router.get("/recommendations/{resume_id}")
async def get_job_recommendations(
    resume_id: int,
    refresh: bool = Query(False, description="Force re-match ignoring cached recommendations"),
    top_n: int = Query(20, ge=1, le=50, description="Number of jobs to return"),
    current_user: User = Depends(get_current_active_user),
) -> RecommendationsResponse:
    """Retrieve or initiate job recommendations for a resume.

    Logic:
    1. If cached and not refresh -> return cached set
    2. Else trigger Celery matching task and return processing status
    """
    if not refresh:
        cached = _cache.get_cached_recommendations(resume_id)
        if cached:
            return RecommendationsResponse(
                status="cached",
                count=len(cached[:top_n]),
                jobs=cached[:top_n],
            )

    # Trigger async matching task
    task_result = match_jobs_to_resume.delay(resume_id, top_n)
    return RecommendationsResponse(
        status="processing",
        task_id=task_result.id,
        message="Matching started; poll status endpoint",
    )


@router.get("/recommendations/{resume_id}/status")
async def get_job_recommendations_status(
    resume_id: int,
    current_user: User = Depends(get_current_active_user),
) -> RecommendationsResponse:
    """Poll recommendation status; returns ready data if cached."""
    cached = _cache.get_cached_recommendations(resume_id)
    if cached:
        return RecommendationsResponse(
            status="ready",
            count=len(cached),
            jobs=cached,
        )
    return RecommendationsResponse(status="processing")


@router.post("/recommendations/{resume_id}/refresh")
@limiter.limit("5/minute")  # Rate limit refresh requests
async def refresh_job_recommendations(
    request: Request,
    resume_id: int,
    current_user: User = Depends(get_current_active_user),
) -> RecommendationsResponse:
    """Force refresh job recommendations for a resume."""
    task_result = match_jobs_to_resume.delay(resume_id)
    return RecommendationsResponse(
        status="processing",
        task_id=task_result.id,
        message="Refresh triggered; poll status endpoint",
    )


@router.get("/search")
@limiter.limit("30/minute")  # Increased rate limit for optimized search
async def search_jobs(
    request: Request,
    keywords: str = Query(..., description="Comma-separated keywords to search"),
    location: str = Query("India", description="Location to search in"),
    portal: Optional[str] = Query(None, description="Specific portal: adzuna, jsearch, remotive, greenhouse, lever, workday, smartrecruiters, ashby"),
    experience_level: Optional[str] = Query(None, description="Filter by level: fresher, mid, senior"),
    limit: int = Query(20, ge=1, le=50, description="Max results to return"),
):
    # Public endpoint - no authentication required
    """Search for jobs directly without resume matching.
    
    This endpoint fetches fresh jobs from portals based on keywords.
    Results are not cached (to provide fresh data).
    """
    keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]
    
    if not keyword_list:
        raise HTTPException(status_code=400, detail="At least one keyword required")
    
    scraper = JobScraperService()
    matcher = JobMatchingService()
    
    all_jobs = []
    
    if portal:
        # Fetch from specific portal
        jobs = scraper.fetch_jobs(portal, keyword_list, location)
        all_jobs.extend(jobs)
    else:
        # Fetch from all portals
        all_jobs = scraper.fetch_all_portals(keyword_list, location)
    
    # Apply experience filtering if requested
    if experience_level and all_jobs:
        filtered_jobs = matcher.match_jobs(
            resume_keywords=keyword_list,
            resume_skills=[],
            job_listings=all_jobs,
            top_n=limit,
            experience_level=experience_level,
        )
        all_jobs = filtered_jobs
    
    return {
        "status": "ok",
        "count": len(all_jobs[:limit]),
        "keywords": keyword_list,
        "location": location,
        "jobs": all_jobs[:limit],
    }


@router.get("/fast-search")
@limiter.limit("100/minute")  # High rate limit for cached responses
async def fast_search_jobs(
    request: Request,
    background_tasks: BackgroundTasks,
    keywords: str = Query(..., description="Comma-separated keywords to search"),
    location: str = Query("India", description="Location to search in"),
    portal: Optional[str] = Query(None, description="Specific portal filter"),
    experience_level: Optional[str] = Query(None, description="Filter by level: fresher, mid, senior"),
    limit: int = Query(20, ge=1, le=100, description="Max results to return"),
):
    """
    High-performance job search with millisecond response times.
    
    Uses multi-level caching:
    - L1: In-memory cache (sub-ms)
    - L2: Redis cache (1-2ms)
    - L3: Inverted index (2-5ms)
    - L4: Live fetch (fallback, 100ms+)
    
    Optimized for 1000+ concurrent users.
    """
    # Create normalized search query
    query = SearchQuery.from_raw(
        keywords=keywords,
        location=location,
        experience_level=experience_level,
        portal=portal,
        limit=limit,
    )
    
    if not query.keywords:
        raise HTTPException(status_code=400, detail="At least one keyword required")
    
    # Get search service
    search_service = get_search_service()
    
    # Execute search
    result = await search_service.search(query)
    
    # Trigger background cache warming for related queries
    if result.get("_meta", {}).get("source") == "live":
        # Warm cache for similar queries in background
        background_tasks.add_task(
            _warm_related_queries,
            list(query.keywords),
            query.location,
        )
    
    return result


@router.get("/enhanced-search")
@limiter.limit("50/minute")
async def enhanced_search_jobs(
    request: Request,
    keywords: str = Query(..., description="Comma-separated keywords to search"),
    location: str = Query("India", description="Location to search in"),
    sources: Optional[str] = Query(None, description="Comma-separated sources: greenhouse, lever, workday, smartrecruiters, ashby"),
    limit: int = Query(50, ge=1, le=100, description="Max results to return"),
):
    """
    Search across new job sources (Greenhouse, Lever, Workday, etc.).
    
    Aggregates from multiple ATS platforms used by top tech companies.
    """
    keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]
    
    if not keyword_list:
        raise HTTPException(status_code=400, detail="At least one keyword required")
    
    source_list = None
    if sources:
        source_list = [s.strip().lower() for s in sources.split(",") if s.strip()]
    
    scraper = get_enhanced_job_scraper()
    jobs, stats = await scraper.fetch_jobs(
        keywords=keyword_list,
        location=location,
        sources=source_list,
        limit=limit,
    )
    
    return {
        "status": "ok",
        "count": len(jobs),
        "keywords": keyword_list,
        "location": location,
        "jobs": jobs,
        "_meta": {
            "sources_queried": stats.sources_queried,
            "sources_succeeded": stats.sources_succeeded,
            "latency_ms": round(stats.latency_ms, 2),
            "cache_hit": stats.cache_hit,
            "duplicates_removed": stats.deduped_count,
        },
    }


@router.get("/sources")
async def list_job_sources():
    """
    List available job sources and their status.
    """
    # Classic sources
    classic_sources = [
        {"name": "adzuna", "type": "aggregator", "status": "active"},
        {"name": "jsearch", "type": "aggregator", "status": "active"},
        {"name": "remotive", "type": "remote_jobs", "status": "active"},
    ]
    
    # Enhanced sources
    enhanced_sources = [
        {"name": "greenhouse", "type": "ats", "companies": 30, "status": "active"},
        {"name": "lever", "type": "ats", "companies": 30, "status": "active"},
        {"name": "workday", "type": "ats", "companies": 20, "status": "active"},
        {"name": "smartrecruiters", "type": "ats", "companies": 20, "status": "active"},
        {"name": "ashby", "type": "ats", "companies": 20, "status": "active"},
    ]
    
    try:
        scraper = get_enhanced_job_scraper()
        stats = await scraper.get_source_stats()
    except Exception:
        stats = {"sources": [], "total_active": 0}
    
    return {
        "classic_sources": classic_sources,
        "enhanced_sources": enhanced_sources,
        "stats": stats,
    }


async def _warm_related_queries(keywords: List[str], location: str):
    """Background task to warm cache for related queries."""
    try:
        search_service = get_search_service()
        
        # Warm cache for top locations
        top_locations = ["Bangalore", "Mumbai", "Delhi", "Remote"]
        for loc in top_locations:
            if loc != location:
                query = SearchQuery.from_raw(",".join(keywords), loc)
                await search_service.search(query)
    except Exception:
        pass  # Silently fail background tasks


@router.post("/fetch")
@limiter.limit("3/minute")  # Rate limit job fetch requests (expensive operation)
async def trigger_job_fetch(
    request: Request,
    keywords: Optional[str] = Query(None, description="Comma-separated keywords"),
    location: str = Query("India", description="Location"),
    current_user: User = Depends(get_current_active_user),
):
    """Trigger background job fetch from all portals.
    
    This populates the cache with fresh job listings.
    Useful before generating recommendations.
    """
    keyword_list = [k.strip() for k in keywords.split(",")] if keywords else ["python", "developer"]
    
    task_result = fetch_jobs_from_portals.delay(keyword_list, location)
    
    return {
        "status": "processing",
        "task_id": task_result.id,
        "message": "Job fetch triggered; jobs will be cached once complete",
    }


@router.get("/scraped-jobs")
@limiter.limit("60/minute")
async def get_scraped_jobs(
    request: Request,
    keywords: Optional[str] = Query(None, description="Comma-separated keywords to filter"),
    location: Optional[str] = Query(None, description="Location to filter"),
    source: Optional[str] = Query(None, description="Source filter: linkedin, indeed, naukri"),
    limit: int = Query(50, ge=1, le=100, description="Max results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    Get jobs scraped from LinkedIn, Indeed, Naukri via Zyte Cloud.
    
    These are stored in the database after being scraped by our Celery workers.
    """
    from app.db.database import SessionLocal
    from app.models.job import Job
    from sqlalchemy import or_
    
    db = SessionLocal()
    try:
        query = db.query(Job).filter(Job.is_active == True)
        
        # Filter by source if specified
        if source:
            query = query.filter(Job.source == source.lower())
        else:
            # By default, get jobs from our scrapers (not external APIs)
            query = query.filter(Job.source.in_(["linkedin", "indeed", "naukri"]))
        
        # Filter by keywords if specified
        if keywords:
            keyword_list = [k.strip().lower() for k in keywords.split(",") if k.strip()]
            keyword_filters = []
            for kw in keyword_list:
                keyword_filters.append(Job.title.ilike(f"%{kw}%"))
                keyword_filters.append(Job.description.ilike(f"%{kw}%"))
            query = query.filter(or_(*keyword_filters))
        
        # Filter by location if specified
        if location:
            query = query.filter(
                or_(
                    Job.location.ilike(f"%{location}%"),
                    Job.city.ilike(f"%{location}%"),
                    Job.state.ilike(f"%{location}%"),
                )
            )
        
        # Get total count
        total = query.count()
        
        # Order by scraped date (newest first) and paginate
        jobs = query.order_by(Job.scraped_at.desc()).offset(offset).limit(limit).all()
        
        # Convert to response format
        job_list = []
        for job in jobs:
            job_dict = job.to_dict()
            # Add redirect_url for frontend compatibility
            job_dict["redirect_url"] = job.apply_url or job.source_url
            job_dict["portal"] = job.source
            job_dict["skills"] = job.skills_required or []
            job_list.append(job_dict)
        
        return {
            "status": "ok",
            "count": len(job_list),
            "total": total,
            "offset": offset,
            "limit": limit,
            "jobs": job_list,
            "sources": ["linkedin", "indeed", "naukri"],
        }
    finally:
        db.close()


__all__ = ["router"]
