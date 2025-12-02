"""
Applications API Routes
========================
Endpoints for job application tracking, match scoring, and credits.

Features:
- Save/track job applications
- Update application status
- Get match scores
- Manage credits
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, asc

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.models.application import JobApplication, ApplicationStatus, CustomizedResume
from app.models.resume import Resume
from app.services.credits_service import get_credits_service
from app.services.job_match_scorer import get_job_match_scorer
from app.services.resume_customization_service import get_resume_customization_service


router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================

class JobApplicationCreate(BaseModel):
    """Schema for creating/saving a job application."""
    job_external_id: str = Field(..., description="External job ID from source")
    job_title: str = Field(..., max_length=500)
    company: str = Field(..., max_length=255)
    company_logo: Optional[str] = None
    location: Optional[str] = None
    job_url: str = Field(..., description="URL to apply")
    job_portal: str = Field(..., description="Source: indeed, glassdoor, etc.")
    job_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    is_remote: bool = False
    job_description: Optional[str] = None
    
    # Optional initial match data
    match_score: Optional[float] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None


class JobApplicationUpdate(BaseModel):
    """Schema for updating a job application."""
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    resume_id: Optional[int] = None


class ApplicationListResponse(BaseModel):
    """Response schema for application list."""
    applications: list
    total: int
    page: int
    limit: int
    has_more: bool


class CreditsResponse(BaseModel):
    """Response schema for credits info."""
    daily_remaining: int
    daily_max: int
    bonus_credits: int
    total_available: int
    tier: str
    tier_description: str
    can_customize: bool
    total_used: int
    resets_at: str


# ============================================================================
# Application Endpoints
# ============================================================================

@router.post("/save", response_model=dict)
async def save_job_application(
    application: JobApplicationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Save a job to user's application tracker.
    Creates with SAVED status if new, returns existing if already saved.
    """
    user_id = current_user.id
    
    # Check if already exists
    existing = db.query(JobApplication).filter(
        and_(
            JobApplication.user_id == user_id,
            JobApplication.job_external_id == application.job_external_id,
            JobApplication.job_portal == application.job_portal
        )
    ).first()
    
    if existing:
        return {
            "success": True,
            "message": "Job already saved",
            "application": existing.to_dict(),
            "is_new": False
        }
    
    # Create new application
    new_app = JobApplication(
        user_id=user_id,
        job_external_id=application.job_external_id,
        job_title=application.job_title,
        company=application.company,
        company_logo=application.company_logo,
        location=application.location,
        job_url=application.job_url,
        job_portal=application.job_portal,
        job_type=application.job_type,
        salary_min=application.salary_min,
        salary_max=application.salary_max,
        is_remote=application.is_remote,
        job_description=application.job_description,
        match_score=application.match_score,
        matched_skills=application.matched_skills,
        missing_skills=application.missing_skills,
        status=ApplicationStatus.SAVED,
    )
    
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    return {
        "success": True,
        "message": "Job saved successfully",
        "application": new_app.to_dict(),
        "is_new": True
    }


@router.post("/{application_id}/apply", response_model=dict)
async def mark_as_applied(
    application_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Mark a job application as APPLIED.
    This is when user clicks "Apply" and is redirected to external site.
    """
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    application.status = ApplicationStatus.APPLIED
    application.applied_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "message": "Marked as applied",
        "application": application.to_dict(),
        "redirect_url": application.job_url
    }


@router.patch("/{application_id}", response_model=dict)
async def update_application(
    application_id: int,
    updates: JobApplicationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update job application status, notes, or other fields."""
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Apply updates
    if updates.status is not None:
        application.status = updates.status
        if updates.status == ApplicationStatus.APPLIED and not application.applied_at:
            application.applied_at = datetime.utcnow()
    
    if updates.notes is not None:
        application.notes = updates.notes
    
    if updates.is_favorite is not None:
        application.is_favorite = updates.is_favorite
    
    if updates.resume_id is not None:
        application.resume_id = updates.resume_id
    
    db.commit()
    db.refresh(application)
    
    return {
        "success": True,
        "application": application.to_dict()
    }


@router.delete("/{application_id}", response_model=dict)
async def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a job application."""
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(application)
    db.commit()
    
    return {"success": True, "message": "Application deleted"}


@router.get("/list", response_model=ApplicationListResponse)
async def list_applications(
    status: Optional[ApplicationStatus] = Query(None, description="Filter by status"),
    is_favorite: Optional[bool] = Query(None, description="Filter favorites"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="asc or desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List user's job applications with filtering and pagination.
    
    Tabs:
    - All: no status filter
    - Saved: status=saved
    - Applied: status=applied
    - In Progress: status in [screening, interview]
    - Completed: status in [offer, rejected, withdrawn]
    """
    query = db.query(JobApplication).filter(JobApplication.user_id == current_user.id)
    
    # Apply filters
    if status:
        query = query.filter(JobApplication.status == status)
    
    if is_favorite is not None:
        query = query.filter(JobApplication.is_favorite == is_favorite)
    
    # Count total before pagination
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(JobApplication, sort_by, JobApplication.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))
    
    # Apply pagination
    offset = (page - 1) * limit
    applications = query.offset(offset).limit(limit).all()
    
    return {
        "applications": [app.to_dict() for app in applications],
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + len(applications) < total
    }


@router.get("/stats", response_model=dict)
async def get_application_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get application statistics for dashboard."""
    user_id = current_user.id
    
    # Get counts by status
    stats = {}
    for status in ApplicationStatus:
        count = db.query(JobApplication).filter(
            and_(
                JobApplication.user_id == user_id,
                JobApplication.status == status
            )
        ).count()
        stats[status.value] = count
    
    # Get totals
    total = db.query(JobApplication).filter(JobApplication.user_id == user_id).count()
    favorites = db.query(JobApplication).filter(
        and_(
            JobApplication.user_id == user_id,
            JobApplication.is_favorite == True
        )
    ).count()
    
    # Get recent activity
    recent = db.query(JobApplication).filter(
        JobApplication.user_id == user_id
    ).order_by(desc(JobApplication.updated_at)).limit(5).all()
    
    return {
        "total": total,
        "favorites": favorites,
        "by_status": stats,
        "recent": [app.to_dict() for app in recent]
    }


@router.get("/{application_id}", response_model=dict)
async def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get single application with full details."""
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Include customized resume if exists
    customized = None
    if application.customized_resume:
        customized = application.customized_resume.to_dict()
    
    return {
        "application": application.to_dict(),
        "customized_resume": customized
    }


# ============================================================================
# Credits Endpoints
# ============================================================================

@router.get("/credits/status", response_model=CreditsResponse)
async def get_credits_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get user's current credit balance and tier info."""
    service = get_credits_service(db)
    return service.get_available_credits(current_user.id)


@router.post("/credits/use", response_model=dict)
async def use_credit(
    application_id: Optional[int] = Body(None),
    action: str = Body("resume_customization"),
    description: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Use one credit for an action (e.g., resume customization)."""
    service = get_credits_service(db)
    result = service.use_credit(
        user_id=current_user.id,
        action=action,
        application_id=application_id,
        description=description
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=402,  # Payment Required
            detail={
                "error": result["error"],
                "upgrade_message": result.get("upgrade_message", ""),
                "tier": result["tier"]
            }
        )
    
    return result


@router.get("/credits/history", response_model=dict)
async def get_credits_history(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get credit usage history."""
    service = get_credits_service(db)
    history = service.get_usage_history(current_user.id, limit)
    return {"history": history, "total": len(history)}


# ============================================================================
# Bulk Operations
# ============================================================================

@router.post("/bulk-save", response_model=dict)
async def bulk_save_jobs(
    jobs: List[JobApplicationCreate],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Save multiple jobs at once."""
    saved = []
    skipped = []
    
    for job in jobs:
        # Check if already exists
        existing = db.query(JobApplication).filter(
            and_(
                JobApplication.user_id == current_user.id,
                JobApplication.job_external_id == job.job_external_id,
                JobApplication.job_portal == job.job_portal
            )
        ).first()
        
        if existing:
            skipped.append(job.job_external_id)
            continue
        
        new_app = JobApplication(
            user_id=current_user.id,
            job_external_id=job.job_external_id,
            job_title=job.job_title,
            company=job.company,
            company_logo=job.company_logo,
            location=job.location,
            job_url=job.job_url,
            job_portal=job.job_portal,
            job_type=job.job_type,
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            is_remote=job.is_remote,
            job_description=job.job_description,
            match_score=job.match_score,
            matched_skills=job.matched_skills,
            missing_skills=job.missing_skills,
            status=ApplicationStatus.SAVED,
        )
        db.add(new_app)
        saved.append(job.job_external_id)
    
    db.commit()
    
    return {
        "success": True,
        "saved_count": len(saved),
        "skipped_count": len(skipped),
        "saved_ids": saved,
        "skipped_ids": skipped
    }


@router.post("/bulk-status", response_model=dict)
async def bulk_update_status(
    application_ids: List[int] = Body(...),
    new_status: ApplicationStatus = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update status for multiple applications."""
    updated = 0
    
    for app_id in application_ids:
        application = db.query(JobApplication).filter(
            and_(
                JobApplication.id == app_id,
                JobApplication.user_id == current_user.id
            )
        ).first()
        
        if application:
            application.status = new_status
            if new_status == ApplicationStatus.APPLIED and not application.applied_at:
                application.applied_at = datetime.utcnow()
            updated += 1
    
    db.commit()
    
    return {
        "success": True,
        "updated_count": updated,
        "requested_count": len(application_ids)
    }


# ============================================================================
# Match Scoring Endpoints
# ============================================================================

class MatchScoreRequest(BaseModel):
    """Request for job match scoring."""
    job_description: str = Field(..., description="Full job description text")
    resume_id: Optional[int] = Field(None, description="Resume ID to score against (uses latest if not provided)")


class QuickMatchRequest(BaseModel):
    """Quick match scoring without saving."""
    job_description: str
    resume_text: Optional[str] = None  # If not provided, uses user's latest resume


@router.post("/match-score", response_model=dict)
async def calculate_match_score(
    request: MatchScoreRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Calculate match score between user's resume and job description.
    
    Returns detailed breakdown including:
    - Overall score (0-100)
    - Skills match percentage
    - Matched/missing skills
    - Keywords analysis
    - Improvement suggestions
    """
    # Get resume
    if request.resume_id:
        resume = db.query(Resume).filter(
            and_(
                Resume.id == request.resume_id,
                Resume.user_id == current_user.id
            )
        ).first()
    else:
        # Get latest resume
        resume = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(desc(Resume.created_at)).first()
    
    if not resume:
        raise HTTPException(
            status_code=404, 
            detail="No resume found. Please upload a resume first."
        )
    
    if not resume.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Resume text not available. Please re-upload your resume."
        )
    
    # Calculate match score
    scorer = get_job_match_scorer()
    breakdown = scorer.score_match(resume.extracted_text, request.job_description)
    
    return {
        "success": True,
        "resume_id": resume.id,
        "resume_name": resume.original_filename,
        **breakdown.to_dict()
    }


@router.post("/quick-match", response_model=dict)
async def quick_match_score(
    request: QuickMatchRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Quick match score calculation.
    Can accept resume text directly or use user's latest resume.
    """
    resume_text = request.resume_text
    
    if not resume_text:
        # Get latest resume
        resume = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(desc(Resume.created_at)).first()
        
        if not resume or not resume.extracted_text:
            raise HTTPException(
                status_code=404,
                detail="No resume found. Please provide resume text or upload a resume."
            )
        
        resume_text = resume.extracted_text
    
    # Calculate match score
    scorer = get_job_match_scorer()
    breakdown = scorer.score_match(resume_text, request.job_description)
    
    return breakdown.to_dict()


@router.post("/{application_id}/score", response_model=dict)
async def score_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Calculate and store match score for a saved application.
    Uses the stored job description and user's latest resume.
    """
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if not application.job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description not available for this application"
        )
    
    # Get user's resume
    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).order_by(desc(Resume.created_at)).first()
    
    if not resume or not resume.extracted_text:
        raise HTTPException(
            status_code=404,
            detail="No resume found. Please upload a resume first."
        )
    
    # Calculate score
    scorer = get_job_match_scorer()
    breakdown = scorer.score_match(resume.extracted_text, application.job_description)
    
    # Update application with score
    application.match_score = breakdown.overall_score
    application.match_breakdown = breakdown.to_dict()["breakdown"]
    application.matched_skills = breakdown.matched_skills
    application.missing_skills = breakdown.missing_skills
    application.resume_id = resume.id
    
    db.commit()
    db.refresh(application)
    
    return {
        "success": True,
        "application_id": application_id,
        **breakdown.to_dict()
    }


@router.post("/batch-score", response_model=dict)
async def batch_score_applications(
    application_ids: Optional[List[int]] = Body(None),
    score_all_unsored: bool = Body(False),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Batch calculate match scores for multiple applications.
    
    Args:
        application_ids: Specific applications to score
        score_all_unscored: If true, score all applications without a score
    """
    # Get user's resume
    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).order_by(desc(Resume.created_at)).first()
    
    if not resume or not resume.extracted_text:
        raise HTTPException(
            status_code=404,
            detail="No resume found. Please upload a resume first."
        )
    
    # Build query
    query = db.query(JobApplication).filter(
        and_(
            JobApplication.user_id == current_user.id,
            JobApplication.job_description.isnot(None)
        )
    )
    
    if application_ids:
        query = query.filter(JobApplication.id.in_(application_ids))
    elif score_all_unsored:
        query = query.filter(JobApplication.match_score.is_(None))
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide application_ids or set score_all_unscored=true"
        )
    
    applications = query.limit(50).all()  # Limit to 50 at a time
    
    scorer = get_job_match_scorer()
    scored = []
    failed = []
    
    for app in applications:
        try:
            breakdown = scorer.score_match(resume.extracted_text, app.job_description)
            
            app.match_score = breakdown.overall_score
            app.match_breakdown = breakdown.to_dict()["breakdown"]
            app.matched_skills = breakdown.matched_skills
            app.missing_skills = breakdown.missing_skills
            app.resume_id = resume.id
            
            scored.append({
                "id": app.id,
                "job_title": app.job_title,
                "score": breakdown.overall_score
            })
        except Exception as e:
            failed.append({
                "id": app.id,
                "error": str(e)
            })
    
    db.commit()
    
    return {
        "success": True,
        "scored_count": len(scored),
        "failed_count": len(failed),
        "scored": scored,
        "failed": failed
    }


# ============================================================================
# Resume Customization Endpoints
# ============================================================================

class CustomizeResumeRequest(BaseModel):
    """Request for resume customization."""
    resume_id: Optional[int] = Field(None, description="Resume ID (uses latest if not provided)")
    job_description: Optional[str] = Field(None, description="Job description (uses stored if not provided)")
    use_ai: bool = Field(True, description="Use AI optimization (costs 1 credit)")


@router.post("/{application_id}/customize", response_model=dict)
async def customize_resume_for_application(
    application_id: int,
    request: CustomizeResumeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create AI-customized resume for a specific job application.
    
    This creates a new resume version optimized for the job, including:
    - Skills alignment with job requirements
    - Keyword optimization
    - Content restructuring
    
    Costs 1 credit if use_ai=true.
    """
    # Get application
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Get resume
    if request.resume_id:
        resume = db.query(Resume).filter(
            and_(
                Resume.id == request.resume_id,
                Resume.user_id == current_user.id
            )
        ).first()
    else:
        resume = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(desc(Resume.created_at)).first()
    
    if not resume:
        raise HTTPException(
            status_code=404, 
            detail="No resume found. Please upload a resume first."
        )
    
    # Get job description
    job_description = request.job_description or application.job_description
    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description required. Please provide it or save it with the application."
        )
    
    # Customize resume
    service = get_resume_customization_service(db)
    result = await service.customize_resume_for_job(
        user_id=current_user.id,
        application_id=application_id,
        resume_id=resume.id,
        job_description=job_description,
        job_title=application.job_title,
        company_name=application.company,
        use_ai=request.use_ai,
    )
    
    if not result["success"]:
        if "credits" in result:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": result["error"],
                    "credits": result["credits"],
                    "upgrade_message": result.get("upgrade_message"),
                }
            )
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{application_id}/customized-versions", response_model=dict)
async def get_customized_versions(
    application_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all customized resume versions for an application."""
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    versions = db.query(CustomizedResume).filter(
        and_(
            CustomizedResume.application_id == application_id,
            CustomizedResume.user_id == current_user.id
        )
    ).order_by(desc(CustomizedResume.created_at)).all()
    
    return {
        "application_id": application_id,
        "job_title": application.job_title,
        "company": application.company,
        "versions": [
            {
                "id": v.id,
                "version_number": v.version_number,
                "target_job_title": v.target_job_title,
                "target_company": v.target_company,
                "changes_count": len(v.changes_made) if v.changes_made else 0,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ],
        "total": len(versions)
    }


@router.get("/download/{customized_resume_id}/{format}", response_model=None)
async def download_customized_resume(
    customized_resume_id: int,
    format: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Download customized resume as PDF or DOCX.
    
    Supported formats: pdf, docx
    """
    from fastapi.responses import Response
    
    if format not in ["pdf", "docx"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid format. Use 'pdf' or 'docx'"
        )
    
    service = get_resume_customization_service(db)
    
    if format == "pdf":
        file_bytes, error = service.generate_pdf(customized_resume_id, current_user.id)
        content_type = "application/pdf"
        extension = "pdf"
    else:
        file_bytes, error = service.generate_docx(customized_resume_id, current_user.id)
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        extension = "docx"
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    if not file_bytes:
        raise HTTPException(status_code=500, detail="Failed to generate file")
    
    # Get resume info for filename
    customized = db.query(CustomizedResume).filter(
        CustomizedResume.id == customized_resume_id
    ).first()
    
    filename = f"resume_v{customized.version_number}_{customized.target_company or 'customized'}.{extension}"
    
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


# ============================================================================
# Job Click/Redirect Tracking
# ============================================================================

class TrackClickRequest(BaseModel):
    """Request for tracking job click/redirect."""
    source_page: Optional[str] = Field(None, description="Page where click originated")
    user_agent: Optional[str] = Field(None, description="Browser user agent")


@router.post("/{application_id}/track-click", response_model=dict)
async def track_job_click(
    application_id: int,
    request: TrackClickRequest = Body(default=TrackClickRequest()),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Track when user clicks to apply on external job site.
    
    This endpoint:
    1. Logs the click for analytics
    2. Updates application status to APPLIED
    3. Returns the redirect URL
    
    Frontend should call this BEFORE redirecting user.
    """
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Track click metadata
    click_data = {
        "clicked_at": datetime.utcnow().isoformat(),
        "source_page": request.source_page,
        "previous_status": application.status.value,
    }
    
    # Update application
    if application.status == ApplicationStatus.SAVED:
        application.status = ApplicationStatus.APPLIED
        application.applied_at = datetime.utcnow()
    
    # Increment click count (stored in notes as JSON for now)
    # In production, you'd want a separate analytics table
    import json
    analytics = {}
    if application.notes:
        try:
            analytics = json.loads(application.notes)
        except:
            analytics = {"original_notes": application.notes}
    
    if "clicks" not in analytics:
        analytics["clicks"] = []
    
    analytics["clicks"].append(click_data)
    analytics["total_clicks"] = len(analytics["clicks"])
    analytics["last_click"] = click_data["clicked_at"]
    
    application.notes = json.dumps(analytics)
    
    db.commit()
    db.refresh(application)
    
    return {
        "success": True,
        "redirect_url": application.job_url,
        "application_status": application.status.value,
        "total_clicks": analytics["total_clicks"],
        "job_title": application.job_title,
        "company": application.company,
    }


@router.get("/{application_id}/analytics", response_model=dict)
async def get_application_analytics(
    application_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get analytics for a specific application."""
    application = db.query(JobApplication).filter(
        and_(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id
        )
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    import json
    analytics = {}
    if application.notes:
        try:
            analytics = json.loads(application.notes)
        except:
            analytics = {}
    
    return {
        "application_id": application_id,
        "job_title": application.job_title,
        "company": application.company,
        "status": application.status.value,
        "saved_at": application.created_at.isoformat() if application.created_at else None,
        "applied_at": application.applied_at.isoformat() if application.applied_at else None,
        "total_clicks": analytics.get("total_clicks", 0),
        "last_click": analytics.get("last_click"),
        "clicks": analytics.get("clicks", []),
        "match_score": application.match_score,
    }
