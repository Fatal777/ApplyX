"""Resume Builder database model for storing editable resume documents"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class ResumeBuilderDocument(Base):
    """Resume Builder Document model - stores the JSON structure of user-created resumes
    
    Uses optimistic locking with `version` field for multi-user concurrency:
    - Each update increments version
    - Updates fail if version doesn't match (someone else modified it)
    """
    
    __tablename__ = "resume_builder_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Document metadata
    title = Column(String(255), nullable=False, default="Untitled Resume")
    template_id = Column(String(50), nullable=True)
    
    # The full resume data as JSON (personal info, education, experience, etc.)
    content = Column(JSON, nullable=False, default={})
    
    # Optimistic locking version - incremented on each update
    version = Column(Integer, nullable=False, default=1)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="resume_builder_documents")
    
    def __repr__(self):
        return f"<ResumeBuilderDocument {self.id}: {self.title}>"
