"""Pydantic schemas for Interview Platform API."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============== Enums (matching database models) ==============

class InterviewType(str, Enum):
    """Types of interviews available."""
    BEHAVIORAL = "behavioral"
    TECHNICAL_THEORY = "technical_theory"
    MIXED = "mixed"
    CUSTOM = "custom"


class InterviewStatus(str, Enum):
    """Status of an interview session."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class DifficultyLevel(str, Enum):
    """Difficulty levels for interviews."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class InterviewPersona(str, Enum):
    """AI interviewer persona types."""
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    CHALLENGING = "challenging"


# ============== Interview Session Schemas ==============

class InterviewSessionCreate(BaseModel):
    """Schema for creating a new interview session."""
    interview_type: InterviewType = InterviewType.MIXED
    difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    resume_id: Optional[int] = None
    job_role: Optional[str] = Field(None, max_length=255)
    job_description: Optional[str] = Field(None, max_length=2000)
    num_questions: int = Field(default=5, ge=3, le=15)
    persona: InterviewPersona = InterviewPersona.PROFESSIONAL
    voice_enabled: bool = True
    video_enabled: bool = True

    class Config:
        use_enum_values = True


class InterviewSessionResponse(BaseModel):
    """Schema for interview session response."""
    id: int
    user_id: int
    resume_id: Optional[int] = None
    interview_type: InterviewType
    status: InterviewStatus
    config: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        use_enum_values = True


class InterviewSessionDetail(InterviewSessionResponse):
    """Detailed interview session with questions and responses."""
    questions: List[Dict[str, Any]] = []
    responses_count: int = 0
    current_question_index: int = 0
    total_questions: int = 0


# ============== Interview Question Schemas ==============

class InterviewQuestionBase(BaseModel):
    """Base schema for interview questions."""
    question_text: str
    question_type: str  # "behavioral", "technical", "situational"
    category: Optional[str] = None
    expected_points: Optional[List[str]] = None
    follow_up_questions: Optional[List[str]] = None
    time_limit_seconds: int = 120


class InterviewQuestionCreate(InterviewQuestionBase):
    """Schema for creating an interview question."""
    session_id: int
    sequence: int


class InterviewQuestionResponse(InterviewQuestionBase):
    """Schema for interview question response."""
    id: int
    session_id: int
    sequence: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Interview Response Schemas ==============

class InterviewResponseCreate(BaseModel):
    """Schema for creating an interview response."""
    session_id: int
    question_id: int
    transcript: str
    response_duration_seconds: Optional[int] = None


class InterviewResponseData(BaseModel):
    """Schema for interview response data."""
    id: int
    session_id: int
    question_id: int
    question_number: Optional[int] = None
    question_text: Optional[str] = None
    transcript: Optional[str] = None
    transcript_confidence: Optional[float] = None
    response_duration_seconds: Optional[int] = None
    
    # Scores
    clarity_score: Optional[float] = None
    confidence_score: Optional[float] = None
    relevance_score: Optional[float] = None
    completeness_score: Optional[float] = None
    overall_score: Optional[float] = None
    
    # Analysis
    analysis: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    scores: Optional[Dict[str, Any]] = None
    
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewResponseUpdate(BaseModel):
    """Schema for updating an interview response with analysis."""
    clarity_score: Optional[float] = Field(None, ge=0, le=100)
    confidence_score: Optional[float] = Field(None, ge=0, le=100)
    relevance_score: Optional[float] = Field(None, ge=0, le=100)
    completeness_score: Optional[float] = Field(None, ge=0, le=100)
    overall_score: Optional[float] = Field(None, ge=0, le=100)
    analysis: Optional[Dict[str, Any]] = None


# ============== Interview Feedback Schemas ==============

class InterviewFeedbackCreate(BaseModel):
    """Schema for creating interview feedback."""
    session_id: int
    overall_score: float = Field(ge=0, le=100)
    communication_score: Optional[float] = Field(None, ge=0, le=100)
    technical_score: Optional[float] = Field(None, ge=0, le=100)
    behavioral_score: Optional[float] = Field(None, ge=0, le=100)
    confidence_score: Optional[float] = Field(None, ge=0, le=100)
    summary: Optional[str] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    recommendations: Optional[List[Dict[str, Any]]] = None
    category_scores: Optional[Dict[str, float]] = None
    detailed_feedback: Optional[Dict[str, str]] = None


class InterviewFeedbackResponse(BaseModel):
    """Schema for interview feedback response."""
    id: int
    session_id: int
    overall_score: float
    communication_score: Optional[float] = None
    technical_score: Optional[float] = None
    behavioral_score: Optional[float] = None
    confidence_score: Optional[float] = None
    percentile_rank: Optional[int] = None
    summary: Optional[str] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    recommendations: Optional[List[Dict[str, Any]]] = None
    category_scores: Optional[Dict[str, float]] = None
    detailed_feedback: Optional[Dict[str, Any]] = None
    grade: Optional[str] = None
    generated_at: datetime

    class Config:
        from_attributes = True


# ============== API Request/Response Schemas ==============

class StartInterviewRequest(BaseModel):
    """Request to start a new interview session."""
    interview_type: InterviewType = InterviewType.MIXED
    difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    resume_id: Optional[int] = None
    job_role: Optional[str] = None
    job_description: Optional[str] = None
    num_questions: int = Field(default=5, ge=3, le=15)
    persona: InterviewPersona = InterviewPersona.PROFESSIONAL


class StartInterviewResponse(BaseModel):
    """Response after starting interview."""
    session_id: int
    status: InterviewStatus
    questions: List[Dict[str, Any]]
    first_question: str
    greeting_audio: Optional[str] = None


class TranscribeRequest(BaseModel):
    """Request to transcribe audio."""
    session_id: int
    audio_data: str
    audio_format: str = "webm"
    question_number: int


class TranscribeResponse(BaseModel):
    """Response after transcription."""
    success: bool
    transcript: str
    duration: float
    error: Optional[str] = None


class RespondRequest(BaseModel):
    """Request for AI response after user answer."""
    session_id: int
    question_number: int
    transcript: str


class RespondResponse(BaseModel):
    """AI interviewer response."""
    response_text: str
    audio_data: Optional[str] = None
    next_question: Optional[str] = None
    is_follow_up: bool = False
    is_conclusion: bool = False
    question_number: int


class AnalyzeRequest(BaseModel):
    """Request to analyze all responses and generate feedback."""
    session_id: int


class AnalyzeResponse(BaseModel):
    """Response after interview analysis."""
    success: bool
    session_id: int
    feedback_id: int
    overall_score: float
    message: str


class InterviewStatusResponse(BaseModel):
    """Current interview session status."""
    session_id: int
    status: InterviewStatus
    current_question: int
    total_questions: int
    responses_count: int
    feedback_ready: bool


class VoiceOption(BaseModel):
    """Voice option for TTS."""
    id: str
    name: str
    description: str


class VoicesResponse(BaseModel):
    """Response with available voices."""
    voices: List[VoiceOption]


class InterviewHealthResponse(BaseModel):
    """Health check response for interview services."""
    status: str
    speech_service: Dict[str, Any]
    ai_service: Dict[str, Any]
