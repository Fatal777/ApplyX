"""Pydantic schemas for request/response validation"""

from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    UserProfileUpdate,
    UserProfileResponse,
    TokenResponse,
    TokenData
)
from app.schemas.resume import (
    ResumeUploadResponse,
    ResumeAnalysis,
    ResumeFeedback,
    ResumeResponse,
    ResumeDetailResponse,
    ResumeListResponse
)
from app.schemas.interview import (
    InterviewPersona,
    StartInterviewRequest,
    StartInterviewResponse,
    TranscribeRequest,
    TranscribeResponse,
    RespondRequest,
    RespondResponse,
    AnalyzeRequest,
    InterviewStatusResponse,
    InterviewSessionResponse,
    InterviewFeedbackResponse,
)

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "UserProfileUpdate",
    "UserProfileResponse",
    "TokenResponse",
    "TokenData",
    "ResumeUploadResponse",
    "ResumeAnalysis",
    "ResumeFeedback",
    "ResumeResponse",
    "ResumeDetailResponse",
    "ResumeListResponse",
    # Interview schemas
    "InterviewPersona",
    "StartInterviewRequest",
    "StartInterviewResponse",
    "TranscribeRequest",
    "TranscribeResponse",
    "RespondRequest",
    "RespondResponse",
    "AnalyzeRequest",
    "InterviewStatusResponse",
    "InterviewSessionResponse",
    "InterviewFeedbackResponse",
]
