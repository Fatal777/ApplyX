"""Resume Pydantic schemas for request/response validation"""

from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


class ResumeUploadResponse(BaseModel):
    """Schema for resume upload response"""
    id: int
    original_filename: str
    file_size: int
    status: str
    message: str
    
    class Config:
        from_attributes = True


class ResumeAnalysis(BaseModel):
    """Schema for resume analysis results"""
    score: float
    keywords: List[str]
    sections: Dict[str, Any]
    skills: List[str]
    experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    
    @validator('score')
    def validate_score(cls, v):
        """Ensure score is between 0 and 100"""
        if not 0 <= v <= 100:
            raise ValueError('Score must be between 0 and 100')
        return v


class ResumeFeedback(BaseModel):
    """Schema for resume feedback"""
    overall_feedback: str
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[Union[str, Dict[str, Any]]]
    completeness_score: float
    keyword_density_score: float
    formatting_score: float


class ResumeResponse(BaseModel):
    """Schema for resume response"""
    id: int
    user_id: int
    original_filename: str
    file_size: int
    file_type: str
    status: str
    analysis_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ResumeDetailResponse(ResumeResponse):
    """Schema for detailed resume response with analysis"""
    stored_filename: Optional[str] = None
    file_path: Optional[str] = None
    extracted_text: Optional[str] = None
    job_description: Optional[str] = None
    keywords: Optional[List[str]] = None
    sections: Optional[Dict[str, Any]] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    education: Optional[List[Dict[str, Any]]] = None
    feedback: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[Union[str, Dict[str, Any]]]] = None
    analysis_data: Optional[Dict[str, Any]] = None


class ResumeListResponse(BaseModel):
    """Schema for list of resumes"""
    total: int
    resumes: List[ResumeResponse]
