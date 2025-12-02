"""
ATS Scoring API Routes
======================

Endpoints for ATS (Applicant Tracking System) resume scoring and analysis.
Implements scoring logic similar to Greenhouse, Workday, Lever, and Taleo.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging

from app.services.ats_scoring import get_ats_scoring_service, ATSScoreResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ats", tags=["ATS Scoring"])


# ============================================================================
# Request/Response Models
# ============================================================================

class ATSScoreRequest(BaseModel):
    """Request model for ATS scoring"""
    resume_text: str = Field(..., min_length=50, description="Full resume text content")
    job_description: Optional[str] = Field(None, description="Job description for targeted scoring")
    job_requirements: Optional[List[str]] = Field(None, description="List of specific job requirements")
    required_experience_years: Optional[int] = Field(None, ge=0, description="Required years of experience")
    required_education: Optional[str] = Field(None, description="Required education level")


class KeywordMatchResponse(BaseModel):
    keyword: str
    category: str
    importance: str
    context: Optional[str] = None


class ATSIssueResponse(BaseModel):
    category: str
    severity: str
    message: str
    suggestion: str
    impact_score: int


class ATSScoreResponse(BaseModel):
    """Response model for ATS scoring"""
    overall_score: int = Field(..., ge=0, le=100, description="Overall ATS score 0-100")
    category_scores: Dict[str, int] = Field(..., description="Scores by category")
    matched_keywords: List[KeywordMatchResponse] = Field(default_factory=list)
    missing_keywords: List[KeywordMatchResponse] = Field(default_factory=list)
    issues: List[ATSIssueResponse] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    job_match_percentage: Optional[int] = Field(None, description="Match percentage for specific job")
    parsing_confidence: float = Field(..., ge=0, le=1, description="Confidence ATS will parse correctly")
    
    class Config:
        json_schema_extra = {
            "example": {
                "overall_score": 78,
                "category_scores": {
                    "keywords": 85,
                    "format": 90,
                    "experience": 75,
                    "education": 80,
                    "completeness": 60
                },
                "matched_keywords": [
                    {"keyword": "Python", "category": "programming", "importance": "required", "context": "...5 years of Python experience..."}
                ],
                "missing_keywords": [
                    {"keyword": "Kubernetes", "category": "cloud", "importance": "required"}
                ],
                "issues": [
                    {"category": "format", "severity": "warning", "message": "Special characters found", "suggestion": "Replace with standard bullets", "impact_score": 10}
                ],
                "suggestions": ["Add missing required keywords: Kubernetes, Docker"],
                "job_match_percentage": 72,
                "parsing_confidence": 0.92
            }
        }


class QuickScoreRequest(BaseModel):
    """Lightweight request for quick ATS score check"""
    resume_text: str = Field(..., min_length=50)


class QuickScoreResponse(BaseModel):
    """Lightweight response for quick ATS score"""
    overall_score: int
    parsing_confidence: float
    top_issues: List[str]
    quick_wins: List[str]


class JobMatchRequest(BaseModel):
    """Request for job-specific match scoring"""
    resume_text: str = Field(..., min_length=50)
    job_id: Optional[str] = Field(None, description="Job ID from job board")
    job_title: str = Field(..., min_length=2)
    job_description: str = Field(..., min_length=50)
    job_requirements: Optional[List[str]] = Field(None)
    company_name: Optional[str] = Field(None)


class JobMatchResponse(BaseModel):
    """Response for job-specific match"""
    match_percentage: int = Field(..., ge=0, le=100)
    overall_ats_score: int
    keyword_coverage: float = Field(..., ge=0, le=1, description="Percentage of job keywords found")
    matched_keywords: List[str]
    missing_keywords: List[str]
    top_suggestions: List[str]
    match_breakdown: Dict[str, int]


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/score", response_model=ATSScoreResponse, status_code=status.HTTP_200_OK)
async def score_resume(request: ATSScoreRequest):
    """
    Comprehensive ATS scoring analysis.
    
    Analyzes resume against ATS parsing standards used by:
    - Greenhouse
    - Workday
    - Lever
    - Taleo
    
    Returns detailed breakdown with:
    - Overall score (0-100)
    - Category scores (keywords, format, experience, education, completeness)
    - Matched/missing keywords
    - Issues and suggestions
    - Job match percentage (if job description provided)
    """
    try:
        service = get_ats_scoring_service()
        
        result = service.score_resume(
            resume_text=request.resume_text,
            job_description=request.job_description,
            job_requirements=request.job_requirements,
            required_experience_years=request.required_experience_years,
            required_education=request.required_education,
        )
        
        return ATSScoreResponse(**result.to_dict())
        
    except Exception as e:
        logger.error(f"ATS scoring failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to score resume: {str(e)}"
        )


@router.post("/quick-score", response_model=QuickScoreResponse, status_code=status.HTTP_200_OK)
async def quick_score_resume(request: QuickScoreRequest):
    """
    Quick ATS score without job-specific matching.
    
    Use this for:
    - Initial resume upload
    - Real-time feedback while editing
    - General resume health check
    
    Faster than full /score endpoint, returns essential metrics only.
    """
    try:
        service = get_ats_scoring_service()
        
        result = service.score_resume(resume_text=request.resume_text)
        
        # Extract top issues and quick wins
        top_issues = [
            issue["message"] 
            for issue in result.to_dict()["issues"] 
            if issue["severity"] in ["critical", "warning"]
        ][:3]
        
        quick_wins = result.suggestions[:4]
        
        return QuickScoreResponse(
            overall_score=result.overall_score,
            parsing_confidence=result.parsing_confidence,
            top_issues=top_issues,
            quick_wins=quick_wins
        )
        
    except Exception as e:
        logger.error(f"Quick ATS scoring failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to score resume: {str(e)}"
        )


@router.post("/job-match", response_model=JobMatchResponse, status_code=status.HTTP_200_OK)
async def calculate_job_match(request: JobMatchRequest):
    """
    Calculate match percentage between resume and specific job.
    
    This mimics the "match score" shown in systems like:
    - Greenhouse candidate cards
    - Workday job applications
    - LinkedIn Easy Apply
    
    Use this when:
    - User selects a job from the job board
    - Tailoring resume for specific position
    - Showing match score before applying
    """
    try:
        service = get_ats_scoring_service()
        
        result = service.score_resume(
            resume_text=request.resume_text,
            job_description=request.job_description,
            job_requirements=request.job_requirements,
        )
        
        result_dict = result.to_dict()
        
        # Calculate keyword coverage
        total_keywords = len(result_dict["matched_keywords"]) + len(result_dict["missing_keywords"])
        keyword_coverage = len(result_dict["matched_keywords"]) / max(total_keywords, 1)
        
        # Extract keyword strings
        matched_strs = [k["keyword"] for k in result_dict["matched_keywords"]]
        missing_strs = [k["keyword"] for k in result_dict["missing_keywords"] if k["importance"] == "required"]
        
        return JobMatchResponse(
            match_percentage=result_dict["job_match_percentage"] or result.overall_score,
            overall_ats_score=result.overall_score,
            keyword_coverage=round(keyword_coverage, 2),
            matched_keywords=matched_strs[:15],
            missing_keywords=missing_strs[:10],
            top_suggestions=result_dict["suggestions"][:5],
            match_breakdown=result_dict["category_scores"]
        )
        
    except Exception as e:
        logger.error(f"Job match calculation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate job match: {str(e)}"
        )


@router.post("/analyze-keywords", status_code=status.HTTP_200_OK)
async def analyze_keywords(
    resume_text: str,
    job_description: Optional[str] = None
):
    """
    Extract and analyze keywords from resume.
    
    Returns categorized keywords found in resume and
    identifies which are matching job requirements.
    """
    try:
        service = get_ats_scoring_service()
        
        result = service.score_resume(
            resume_text=resume_text,
            job_description=job_description,
        )
        
        result_dict = result.to_dict()
        
        # Group by category
        by_category = {}
        for kw in result_dict["matched_keywords"]:
            cat = kw["category"]
            if cat not in by_category:
                by_category[cat] = {"matched": [], "count": 0}
            by_category[cat]["matched"].append(kw["keyword"])
            by_category[cat]["count"] += 1
        
        return {
            "keywords_by_category": by_category,
            "total_matched": len(result_dict["matched_keywords"]),
            "total_missing": len(result_dict["missing_keywords"]),
            "keyword_score": result_dict["category_scores"]["keywords"],
            "missing_required": [
                k["keyword"] for k in result_dict["missing_keywords"]
                if k["importance"] == "required"
            ]
        }
        
    except Exception as e:
        logger.error(f"Keyword analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze keywords: {str(e)}"
        )
