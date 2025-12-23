"""
Job Model for ApplyX Job Portal
Comprehensive schema for scraped and manual job postings
"""

from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, JSON, Enum
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full-time"
    PART_TIME = "part-time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"
    FREELANCE = "freelance"


class WorkLocation(str, enum.Enum):
    REMOTE = "remote"
    ONSITE = "onsite"
    HYBRID = "hybrid"


class ExperienceLevel(str, enum.Enum):
    FRESHER = "fresher"          # 0-1 years
    ENTRY = "entry"              # 1-3 years
    MID = "mid"                  # 3-7 years
    SENIOR = "senior"            # 7+ years
    LEAD = "lead"                # Team lead/Manager


class Job(Base):
    """Job listing model with comprehensive fields"""
    
    __tablename__ = "jobs"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Info (Always present)
    title = Column(String(500), nullable=False, index=True)
    company = Column(String(255), nullable=False, index=True)
    location = Column(String(255), index=True)  # "Bangalore, Karnataka, India"
    
    # Location Breakdown
    city = Column(String(100), index=True)      # "Bangalore"
    state = Column(String(100))                 # "Karnataka"
    country = Column(String(100), default="India")
    
    # Job Description
    description = Column(Text)                  # Full description
    requirements = Column(Text)                 # Requirements/Qualifications
    
    # Salary (Optional - Auto-hide if null)
    salary_min = Column(Float, nullable=True)   # Minimum salary
    salary_max = Column(Float, nullable=True)   # Maximum salary
    salary_currency = Column(String(10), default="INR")
    salary_display = Column(String(100))        # "₹8-12 LPA" or "Competitive"
    
    # Experience (Optional - Auto-hide if null)
    experience_min = Column(Integer, nullable=True)  # Minimum years
    experience_max = Column(Integer, nullable=True)  # Maximum years
    experience_level = Column(Enum(ExperienceLevel), nullable=True, index=True)
    
    # Employment Details (Optional - Auto-hide if null)
    employment_type = Column(Enum(EmploymentType), nullable=True, index=True)
    work_location = Column(Enum(WorkLocation), nullable=True, index=True)
    
    # Skills (Optional - Auto-hide if empty)
    skills_required = Column(JSON, default=[])  # ["Python", "React", "AWS"]
    
    # URLs
    source_url = Column(Text)                   # Original job posting URL
    apply_url = Column(Text)                    # Direct apply URL
    
    # Meta Information
    source = Column(String(50), index=True)     # "linkedin", "indeed", "naukri"
    posted_date = Column(String(100))           # "2 days ago" or actual date
    scraped_at = Column(DateTime, default=func.now())
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False)  # Manual verification flag
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Job {self.id}: {self.title} at {self.company}>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "description": self.description,
            "requirements": self.requirements,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "salary_currency": self.salary_currency,
            "salary_display": self.salary_display,
            "experience_min": self.experience_min,
            "experience_max": self.experience_max,
            "experience_level": self.experience_level.value if self.experience_level else None,
            "employment_type": self.employment_type.value if self.employment_type else None,
            "work_location": self.work_location.value if self.work_location else None,
            "skills_required": self.skills_required or [],
            "source_url": self.source_url,
            "apply_url": self.apply_url,
            "source": self.source,
            "posted_date": self.posted_date,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
