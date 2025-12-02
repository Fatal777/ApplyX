"""Resume database model"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class Resume(Base):
    """Resume model for storing uploaded resumes and analysis"""
    
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # File information
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False, unique=True)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)
    
    # Processing status
    status = Column(String, default="uploaded")  # uploaded, processing, completed, failed
    
    # Extracted content (encrypted)
    extracted_text = Column(Text, nullable=True)
    job_description = Column(Text, nullable=True)  # For JD-based analysis
    
    # Analysis results
    analysis_score = Column(Float, nullable=True)
    keywords = Column(JSON, nullable=True)
    sections = Column(JSON, nullable=True)
    skills = Column(JSON, nullable=True)
    experience = Column(JSON, nullable=True)
    education = Column(JSON, nullable=True)
    
    # Feedback
    feedback = Column(JSON, nullable=True)
    suggestions = Column(JSON, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="resumes")
    applications = relationship("JobApplication", back_populates="resume")
    customized_versions = relationship("CustomizedResume", back_populates="base_resume")
    
    def __repr__(self):
        return f"<Resume {self.original_filename}>"
