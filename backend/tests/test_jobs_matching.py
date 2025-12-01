"""Smoke tests for JobMatchingService.

These are light-weight tests intended to validate that the matching
service produces deterministic results for stub job listings and
handles absence of scikit-learn gracefully.
"""
from app.services.job_matching_service import JobMatchingService


def test_match_jobs_overlap_fallback():
    service = JobMatchingService()
    resume_keywords = ["python", "fastapi", "sql"]
    resume_skills = ["docker", "redis"]
    jobs = [
        {"title": "Python Developer", "description": "Work with FastAPI and Redis", "skills": ["python", "fastapi", "redis"], "redirect_url": "https://example/jobs/1", "portal": "indeed"},
        {"title": "Frontend Engineer", "description": "React and CSS", "skills": ["react", "css"], "redirect_url": "https://example/jobs/2", "portal": "linkedin"},
    ]
    matched = service.match_jobs(resume_keywords, resume_skills, jobs, top_n=2)
    assert matched, "Expected non-empty match list"
    # First job should have higher score
    assert matched[0]["title"] == "Python Developer"
    assert "match_score" in matched[0]


def test_match_jobs_limit():
    service = JobMatchingService()
    resume_keywords = ["python"]
    jobs = [
        {"title": f"Job {i}", "description": "Python work", "skills": ["python"], "redirect_url": f"https://x/{i}", "portal": "indeed"}
        for i in range(10)
    ]
    matched = service.match_jobs(resume_keywords, [], jobs, top_n=5)
    assert len(matched) == 5
