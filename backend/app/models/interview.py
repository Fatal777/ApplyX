"""Interview database models for mock interview platform.

Models:
- InterviewSession: Main interview session tracking
- InterviewQuestion: Questions asked during interview
- InterviewResponse: User responses with transcripts and analysis
- InterviewFeedback: Final feedback and scores
"""

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, 
    DateTime, ForeignKey, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from typing import Optional, List

from app.db.database import Base


class InterviewType(str, enum.Enum):
    """Types of interviews available."""
    BEHAVIORAL = "behavioral"
    TECHNICAL_THEORY = "technical_theory"
    MIXED = "mixed"
    CUSTOM = "custom"


class InterviewStatus(str, enum.Enum):
    """Status of an interview session."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class DifficultyLevel(str, enum.Enum):
    """Difficulty levels for interviews."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class InterviewSession(Base):
    """Main interview session model.
    
    Tracks the overall interview including type, status, timing,
    and configuration. Links to user and contains all responses.
    """
    __tablename__ = "interview_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    
    # Interview configuration
    interview_type = Column(SQLEnum(InterviewType), default=InterviewType.MIXED, nullable=False)
    difficulty = Column(SQLEnum(DifficultyLevel), default=DifficultyLevel.INTERMEDIATE, nullable=False)
    target_role = Column(String(255), nullable=True)  # e.g., "Software Engineer", "Product Manager"
    target_company = Column(String(255), nullable=True)  # Optional: company context
    
    # Session state
    status = Column(SQLEnum(InterviewStatus), default=InterviewStatus.SCHEDULED, nullable=False, index=True)
    current_question_index = Column(Integer, default=0)
    total_questions = Column(Integer, default=5)
    
    # Session configuration stored as JSON (questions, persona, etc.)
    config = Column(JSON, nullable=True)
    
    # Timing
    duration_minutes = Column(Integer, default=15)  # Target duration
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Configuration flags
    voice_enabled = Column(Boolean, default=True)  # AI voice responses
    video_enabled = Column(Boolean, default=True)  # User video (local only)
    
    # Relationships
    user = relationship("User", backref="interview_sessions")
    resume = relationship("Resume", backref="interview_sessions")
    questions = relationship("InterviewQuestion", back_populates="session", cascade="all, delete-orphan", order_by="InterviewQuestion.sequence")
    responses = relationship("InterviewResponse", back_populates="session", cascade="all, delete-orphan", order_by="InterviewResponse.created_at")
    feedback = relationship("InterviewFeedback", back_populates="session", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<InterviewSession {self.id} - {self.interview_type.value} - {self.status.value}>"
    
    @property
    def duration_seconds(self) -> Optional[int]:
        """Calculate actual interview duration in seconds."""
        if self.started_at and self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds())
        return None
    
    @property
    def is_active(self) -> bool:
        """Check if interview is currently active."""
        return self.status == InterviewStatus.IN_PROGRESS


class InterviewQuestion(Base):
    """Pre-generated questions for an interview session.
    
    Stores the questions that will be asked during the interview,
    generated based on interview type and target role.
    """
    __tablename__ = "interview_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Question details
    sequence = Column(Integer, nullable=False)  # Order in interview (1, 2, 3...)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False)  # "behavioral", "technical", "situational"
    category = Column(String(100), nullable=True)  # "leadership", "problem_solving", "teamwork"
    
    # Expected answer guidance (for AI evaluation)
    expected_points = Column(JSON, nullable=True)  # Key points to look for
    follow_up_questions = Column(JSON, nullable=True)  # Potential follow-ups
    
    # Timing
    time_limit_seconds = Column(Integer, default=120)  # Suggested time for answer
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("InterviewSession", back_populates="questions")
    response = relationship("InterviewResponse", back_populates="question", uselist=False)
    
    def __repr__(self):
        return f"<InterviewQuestion {self.id} - Q{self.sequence}>"


class InterviewResponse(Base):
    """User's response to an interview question.
    
    Stores the transcript of the user's verbal response along with
    AI-generated analysis including sentiment, clarity, and relevance scores.
    """
    __tablename__ = "interview_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("interview_questions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Question tracking (for sessions that don't use InterviewQuestion table)
    question_number = Column(Integer, nullable=True)
    question_text = Column(Text, nullable=True)
    
    # Response content (text only - no audio/video stored)
    transcript = Column(Text, nullable=True)  # Transcribed user answer
    transcript_confidence = Column(Float, nullable=True)  # STT confidence score
    
    # Timing
    audio_duration = Column(Float, nullable=True)  # Audio length in seconds
    response_duration_seconds = Column(Integer, nullable=True)  # How long user spoke
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # AI Analysis scores (0-100)
    clarity_score = Column(Float, nullable=True)  # How clear/coherent
    confidence_score = Column(Float, nullable=True)  # Detected confidence level
    relevance_score = Column(Float, nullable=True)  # How relevant to question
    completeness_score = Column(Float, nullable=True)  # STAR format completeness
    overall_score = Column(Float, nullable=True)  # Weighted average
    
    # Detailed analysis (JSON)
    ai_analysis = Column(JSON, nullable=True)  # Full AI analysis result
    scores = Column(JSON, nullable=True)  # Individual score breakdown
    analysis = Column(JSON, nullable=True)
    # Structure: {
    #   "strengths": ["point1", "point2"],
    #   "improvements": ["point1", "point2"],
    #   "keywords_used": ["leadership", "results"],
    #   "star_analysis": {"situation": true, "task": true, "action": true, "result": false},
    #   "sentiment": "positive|neutral|negative",
    #   "filler_words_count": 5,
    #   "speaking_pace": "normal|fast|slow"
    # }
    
    # Follow-up handling
    follow_up_asked = Column(Boolean, default=False)
    follow_up_response = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    session = relationship("InterviewSession", back_populates="responses")
    question = relationship("InterviewQuestion", back_populates="response")
    
    def __repr__(self):
        return f"<InterviewResponse {self.id} - Score: {self.overall_score}>"


class InterviewFeedback(Base):
    """Final comprehensive feedback for an interview session.
    
    Generated after interview completion, contains overall scores,
    detailed feedback, and actionable improvement suggestions.
    """
    __tablename__ = "interview_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Overall scores (0-100)
    overall_score = Column(Float, nullable=False)
    communication_score = Column(Float, nullable=True)
    technical_score = Column(Float, nullable=True)  # For technical interviews
    behavioral_score = Column(Float, nullable=True)  # STAR method adherence
    confidence_score = Column(Float, nullable=True)
    
    # Percentile ranking (compared to other users)
    percentile_rank = Column(Integer, nullable=True)  # e.g., 75 = top 25%
    
    # Detailed feedback
    summary = Column(Text, nullable=True)  # 2-3 sentence summary
    strengths = Column(JSON, nullable=True)  # List of strength areas
    improvements = Column(JSON, nullable=True)  # List of areas to improve
    
    # Actionable recommendations
    recommendations = Column(JSON, nullable=True)
    # Structure: [
    #   {"area": "communication", "tip": "...", "priority": "high"},
    #   {"area": "structure", "tip": "...", "priority": "medium"}
    # ]
    
    # Detailed breakdown by category
    category_scores = Column(JSON, nullable=True)
    # Structure: {
    #   "problem_solving": 85,
    #   "leadership": 70,
    #   "teamwork": 90,
    #   "communication": 75
    # }
    
    # AI-generated detailed feedback
    detailed_feedback = Column(Text, nullable=True)  # Long-form feedback
    
    # Comparison data
    industry_benchmark = Column(JSON, nullable=True)  # How user compares to industry avg
    
    # Generation metadata
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    generation_model = Column(String(50), nullable=True)  # e.g., "gpt-4o-mini"
    
    # Relationships
    session = relationship("InterviewSession", back_populates="feedback")
    
    def __repr__(self):
        return f"<InterviewFeedback {self.id} - Score: {self.overall_score}>"
    
    @property
    def grade(self) -> str:
        """Return letter grade based on overall score."""
        if self.overall_score >= 90:
            return "A+"
        elif self.overall_score >= 85:
            return "A"
        elif self.overall_score >= 80:
            return "B+"
        elif self.overall_score >= 75:
            return "B"
        elif self.overall_score >= 70:
            return "C+"
        elif self.overall_score >= 65:
            return "C"
        elif self.overall_score >= 60:
            return "D"
        else:
            return "F"
