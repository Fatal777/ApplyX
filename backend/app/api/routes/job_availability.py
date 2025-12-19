/**
 * Job Availability API Endpoint
 * Shows job counts by city and other filters
 */

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.job import Job
from typing import List, Dict

router_availability = APIRouter(prefix="/jobs/availability", tags=["Job Availability"])


@router_availability.get("/by-city")
def get_jobs_by_city(db: Session = Depends(get_db)):
    """
    Get job counts for each city
    Shows which cities have active jobs
    """
    # Query job counts grouped by city
    results = (
        db.query(
            Job.city,
            Job.state,
            func.count(Job.id).label('job_count')
        )
        .filter(Job.is_active == True, Job.city.isnot(None))
        .group_by(Job.city, Job.state)
        .order_by(func.count(Job.id).desc())
        .all()
    )
    
    return {
        "cities": [
            {
                "city": city,
                "state": state,
                "job_count": count,
                "has_jobs": count > 0
            }
            for city, state, count in results
        ],
        "total_cities": len(results)
    }


@router_availability.get("/by-role")
def get_jobs_by_role(db: Session = Depends(get_db)):
    """
    Get job counts by role/title
    Shows popular job roles
    """
    # Get top job titles
    title_patterns = [
        ('Software Engineer', '%software engineer%'),
        ('Backend Developer', '%backend%'),
        ('Frontend Developer', '%frontend%'),
        ('Full Stack', '%full stack%'),
        ('DevOps', '%devops%'),
        ('QA Engineer', '%qa%'),
        ('Data Engineer', '%data engineer%'),
        ('Data Scientist', '%data scientist%'),
        ('ML Engineer', '%ml engineer%'),
    ]
    
    role_counts = []
    for role_name, pattern in title_patterns:
        count = db.query(func.count(Job.id)).filter(
            Job.is_active == True,
            Job.title.ilike(pattern)
        ).scalar()
        
        if count > 0:
            role_counts.append({
                "role": role_name,
                "job_count": count,
                "has_jobs": True
            })
    
    return {
        "roles": sorted(role_counts, key=lambda x: x['job_count'], reverse=True),
        "total_roles": len(role_counts)
    }


@router_availability.get("/by-skill")
def get_jobs_by_skill(db: Session = Depends(get_db)):
    """
    Get job counts by programming language/skill
    Shows which skills are in demand
    """
    # Get all jobs with skills
    jobs_with_skills = db.query(Job.skills_required).filter(
        Job.is_active == True,
        Job.skills_required.isnot(None)
    ).all()
    
    # Count skills
    skill_counts = {}
    for (skills,) in jobs_with_skills:
        if skills:
            for skill in skills:
                skill_lower = skill.lower()
                skill_counts[skill_lower] = skill_counts.get(skill_lower, 0) + 1
    
    # Sort by count
    sorted_skills = sorted(
        [{"skill": skill, "job_count": count, "has_jobs": True} 
         for skill, count in skill_counts.items()],
        key=lambda x: x['job_count'],
        reverse=True
    )[:30]  # Top 30 skills
    
    return {
        "skills": sorted_skills,
        "total_skills": len(sorted_skills)
    }


@router_availability.get("/stats")
def get_overall_stats(db: Session = Depends(get_db)):
    """
    Get overall job availability statistics
    """
    total_jobs = db.query(func.count(Job.id)).filter(Job.is_active == True).scalar()
    
    cities_with_jobs = db.query(func.count(func.distinct(Job.city))).filter(
        Job.is_active == True,
        Job.city.isnot(None)
    ).scalar()
    
    companies_hiring = db.query(func.count(func.distinct(Job.company))).filter(
        Job.is_active == True
    ).scalar()
    
    # Jobs by source
    by_source = {}
    for source in ['linkedin', 'indeed', 'naukri']:
        count = db.query(func.count(Job.id)).filter(
            Job.source == source,
            Job.is_active == True
        ).scalar()
        by_source[source] = count
    
    return {
        "total_jobs": total_jobs,
        "cities_with_jobs": cities_with_jobs,
        "companies_hiring": companies_hiring,
        "by_source": by_source,
        "last_updated": "real-time"
    }


# Add this router to main jobs.py or register separately
__all__ = ["router_availability"]
