"""Job recommendation API routes.

Endpoints:
GET /api/v1/jobs/recommendations/{resume_id}      -> Initiate / retrieve recommendations
GET /api/v1/jobs/recommendations/{resume_id}/status -> Poll for recommendation readiness
POST /api/v1/jobs/recommendations/{resume_id}/refresh -> Force refresh recommendations
GET /api/v1/jobs/search -> Search available jobs directly (bypasses resume matching)

Notes:
- Uses Redis cache for recommendations (24h TTL)
- Triggers Celery matching task if not cached
- Authentication dependency is optional fallback if not present in minimal env
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, List
from pydantic import BaseModel

from app.services.job_cache_service import JobCacheService
from app.services.job_scraper_service import JobScraperService
from app.services.job_matching_service import JobMatchingService
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
@limiter.limit("20/minute")  # Rate limit job searches
async def search_jobs(
    request: Request,
    keywords: str = Query(..., description="Comma-separated keywords to search"),
    location: str = Query("India", description="Location to search in"),
    portal: Optional[str] = Query(None, description="Specific portal: adzuna, jsearch, remotive"),
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


__all__ = ["router"]
