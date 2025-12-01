#!/usr/bin/env python3
"""Test script to verify job portal API integrations.

Usage:
    cd backend
    python scripts/test_job_apis.py

This script tests:
1. Remotive API (free, no auth) - should always work
2. Adzuna API (if configured)
3. JSearch API (if configured)
4. Job matching service
"""
import os
import sys

# Ensure we're in the backend directory for .env loading
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

# Load .env before importing app modules
from dotenv import load_dotenv
load_dotenv(override=True)

from app.services.job_scraper_service import JobScraperService
from app.services.job_matching_service import JobMatchingService, infer_experience_from_resume

# Windows console compatibility - use ASCII instead of emoji
OK = "[OK]"
WARN = "[WARN]"
FAIL = "[FAIL]"


def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def test_remotive_api():
    """Test Remotive API (should always work - no auth needed)."""
    print_header("Testing Remotive API (Free, No Auth)")
    
    scraper = JobScraperService()
    keywords = ["python", "developer"]
    
    try:
        # Bypass rate limiter for testing by calling the method directly
        jobs = scraper._fetch_remotive_jobs(keywords, "India")
        
        if jobs:
            print(f"{OK} Successfully fetched {len(jobs)} jobs from Remotive")
            print("\nSample job:")
            job = jobs[0]
            for key in ["title", "company", "location", "portal", "redirect_url"]:
                print(f"  {key}: {job.get(key, 'N/A')}")
            print(f"  skills: {job.get('skills', [])[:5]}")
        else:
            print(f"{WARN} No jobs returned from Remotive (may be rate limited or filtered)")
            
    except Exception as e:
        print(f"{FAIL} Remotive API Error: {e}")


def test_adzuna_api():
    """Test Adzuna API (requires ADZUNA_APP_ID and ADZUNA_APP_KEY)."""
    print_header("Testing Adzuna API")
    
    from app.core.config import settings
    
    app_id = getattr(settings, 'ADZUNA_APP_ID', None)
    app_key = getattr(settings, 'ADZUNA_APP_KEY', None)
    
    if not app_id or not app_key:
        print(f"{WARN} Adzuna API not configured (missing ADZUNA_APP_ID or ADZUNA_APP_KEY)")
        print("   Set these in your .env file to enable Adzuna job fetching")
        print("   Sign up at: https://developer.adzuna.com/")
        return
    
    print(f"  Found API keys: app_id={app_id}, app_key={app_key[:10]}...")
    
    scraper = JobScraperService()
    keywords = ["python", "developer"]
    
    try:
        jobs = scraper._fetch_adzuna_jobs(keywords, "India")
        
        if jobs:
            print(f"{OK} Successfully fetched {len(jobs)} jobs from Adzuna")
            print("\nSample job:")
            job = jobs[0]
            for key in ["title", "company", "location", "portal", "redirect_url"]:
                print(f"  {key}: {job.get(key, 'N/A')}")
            if job.get("salary_min") or job.get("salary_max"):
                print(f"  salary: {job.get('salary_min')} - {job.get('salary_max')}")
        else:
            print(f"{WARN} No jobs returned from Adzuna")
            
    except Exception as e:
        print(f"{FAIL} Adzuna API Error: {e}")


def test_jsearch_api():
    """Test JSearch RapidAPI (requires JSEARCH_RAPIDAPI_KEY)."""
    print_header("Testing JSearch API (RapidAPI)")
    
    from app.core.config import settings
    
    api_key = getattr(settings, 'JSEARCH_RAPIDAPI_KEY', None)
    
    if not api_key:
        print(f"{WARN} JSearch API not configured (missing JSEARCH_RAPIDAPI_KEY)")
        print("   Set this in your .env file to enable JSearch job fetching")
        print("   Sign up at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch")
        return
    
    print(f"  Found API key: {api_key[:15]}...")
    
    scraper = JobScraperService()
    keywords = ["python", "developer"]
    
    try:
        jobs = scraper._fetch_jsearch_jobs(keywords, "India")
        
        if jobs:
            print(f"{OK} Successfully fetched {len(jobs)} jobs from JSearch")
            print("\nSample job:")
            job = jobs[0]
            for key in ["title", "company", "location", "portal", "redirect_url"]:
                print(f"  {key}: {job.get(key, 'N/A')}")
        else:
            print(f"{WARN} No jobs returned from JSearch")
            
    except Exception as e:
        print(f"{FAIL} JSearch API Error: {e}")


def test_job_matching():
    """Test job matching service with sample data."""
    print_header("Testing Job Matching Service")
    
    matcher = JobMatchingService()
    
    # Sample resume data
    resume_keywords = ["python", "machine learning", "api", "backend"]
    resume_skills = ["python", "django", "fastapi", "postgresql", "docker"]
    
    # Sample job listings
    job_listings = [
        {
            "title": "Senior Python Developer",
            "company": "TechCorp",
            "location": "Bangalore, India",
            "description": "Build scalable backend services using Python, FastAPI, PostgreSQL",
            "skills": ["python", "fastapi", "postgresql", "docker"],
            "redirect_url": "https://example.com/job/1",
            "portal": "test",
            "experience": "3-5 years",
        },
        {
            "title": "Data Scientist",
            "company": "DataCo",
            "location": "Remote",
            "description": "Apply machine learning models using Python and TensorFlow",
            "skills": ["python", "tensorflow", "machine learning", "sql"],
            "redirect_url": "https://example.com/job/2",
            "portal": "test",
            "experience": "2-4 years",
        },
        {
            "title": "Frontend Developer",
            "company": "WebStudio",
            "location": "Mumbai, India",
            "description": "Build beautiful UIs with React and TypeScript",
            "skills": ["react", "typescript", "css", "html"],
            "redirect_url": "https://example.com/job/3",
            "portal": "test",
            "experience": "1-3 years",
        },
    ]
    
    try:
        # Test basic matching
        results = matcher.match_jobs(
            resume_keywords=resume_keywords,
            resume_skills=resume_skills,
            job_listings=job_listings,
            top_n=5,
        )
        
        print(f"{OK} Matched {len(results)} jobs\n")
        print("Results ranked by match score:")
        for i, job in enumerate(results, 1):
            print(f"\n  {i}. {job['title']} at {job['company']}")
            print(f"     Match Score: {job['match_score']}%")
            print(f"     Skill Matches: {job.get('skill_matches', [])}")
        
        # Test experience filtering
        print("\n\nTesting experience filtering (fresher):")
        fresher_results = matcher.match_jobs(
            resume_keywords=resume_keywords,
            resume_skills=resume_skills,
            job_listings=job_listings,
            top_n=5,
            experience_years=1,
            experience_level="fresher",
        )
        print(f"  Filtered to {len(fresher_results)} jobs suitable for freshers")
        
    except Exception as e:
        print(f"{FAIL} Matching Error: {e}")


def test_experience_inference():
    """Test experience inference from resume text."""
    print_header("Testing Experience Inference")
    
    test_cases = [
        ("I am a fresher with a B.Tech in Computer Science", "fresher"),
        ("5+ years of experience in software development", "senior"),
        ("3 years experience in Python and Django", "mid"),
        ("Senior Software Engineer with 8 years experience", "senior"),
        ("Fresh graduate looking for entry level position", "fresher"),
    ]
    
    for text, expected_level in test_cases:
        years, level = infer_experience_from_resume(text)
        status = OK if level == expected_level else WARN
        print(f"{status} '{text[:50]}...'")
        print(f"   Inferred: {years} years, {level} level (expected: {expected_level})\n")


def main():
    print("\n" + "="*60)
    print("  JOB PORTAL API INTEGRATION TESTS")
    print("="*60)
    
    # Run all tests
    test_remotive_api()
    test_adzuna_api()
    test_jsearch_api()
    test_job_matching()
    test_experience_inference()
    
    print_header("Test Summary")
    print("Tests completed. Check output above for details.")
    print("\nTo enable all APIs, set these in your .env file:")
    print("  - ADZUNA_APP_ID and ADZUNA_APP_KEY")
    print("  - JSEARCH_RAPIDAPI_KEY")
    print("\nRemotive API works without any configuration.")


if __name__ == "__main__":
    main()
