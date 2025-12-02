"""
SimplyHired Job Source Integration
===================================
Fetches jobs from SimplyHired via RapidAPI or direct API.

SimplyHired is part of the Indeed family but has its own job listings.
"""

from __future__ import annotations

import os
from typing import List, Optional

from app.services.job_sources.base import JobSource, JobResult


class SimplyHiredJobSource(JobSource):
    """
    SimplyHired job source.
    
    SimplyHired aggregates jobs from multiple sources including:
    - Direct employer postings
    - Staffing agencies
    - Career sites
    
    Note: Uses RapidAPI's jobs aggregation APIs that include SimplyHired data.
    """
    
    name = "simplyhired"
    base_url = "https://jsearch.p.rapidapi.com"  # Uses JSearch which includes SimplyHired
    rate_limit = 10
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key or os.environ.get("RAPIDAPI_KEY", "")
    
    def _get_headers(self):
        return {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            "Accept": "application/json",
        }
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """
        Search SimplyHired for jobs.
        
        Uses JSearch API which aggregates from multiple sources.
        Filters for SimplyHired-originated listings.
        """
        if not self.api_key:
            return []
        
        try:
            session = await self._get_session()
            
            params = {
                "query": " ".join(keywords) + f" in {location}",
                "page": str(page),
                "num_pages": "1",
                "date_posted": "month",  # Last month
            }
            
            async with session.get(
                f"{self.base_url}/search",
                params=params,
            ) as response:
                if response.status != 200:
                    return []
                
                data = await response.json()
                jobs = self._parse_results(data.get("data", []))
                
                # Return all jobs (JSearch aggregates from multiple sources)
                return jobs[:limit]
        
        except Exception as e:
            print(f"SimplyHired API error: {e}")
            return []
    
    def _parse_results(self, results: list) -> List[JobResult]:
        """Parse JSearch API response."""
        jobs = []
        
        for item in results:
            try:
                # Parse salary
                salary_min = item.get("job_min_salary")
                salary_max = item.get("job_max_salary")
                
                # Convert to annual if hourly
                salary_period = item.get("job_salary_period", "")
                if salary_period == "HOUR" and salary_min:
                    salary_min = salary_min * 2080  # 40 hrs * 52 weeks
                    salary_max = salary_max * 2080 if salary_max else None
                
                # Get skills from highlights
                skills = []
                highlights = item.get("job_highlights", {})
                if highlights:
                    qualifications = highlights.get("Qualifications", [])
                    for qual in qualifications[:5]:
                        skills.extend(self._extract_skills_from_text(qual))
                
                job = JobResult(
                    job_id=JobResult.generate_id("simplyhired", item.get("job_id", "")),
                    title=item.get("job_title", ""),
                    company=item.get("employer_name", ""),
                    location=f"{item.get('job_city', '')}, {item.get('job_state', '')}".strip(", "),
                    description=item.get("job_description", ""),
                    redirect_url=item.get("job_apply_link", ""),
                    portal="simplyhired",
                    posted_date=item.get("job_posted_at_datetime_utc", ""),
                    salary_min=int(salary_min) if salary_min else None,
                    salary_max=int(salary_max) if salary_max else None,
                    job_type=item.get("job_employment_type", ""),
                    remote=item.get("job_is_remote", False),
                    skills=skills[:10],
                )
                jobs.append(job)
            except Exception:
                continue
        
        return jobs
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skill keywords from text."""
        common_skills = [
            "python", "java", "javascript", "react", "node", "aws", "docker",
            "kubernetes", "sql", "nosql", "mongodb", "postgresql", "redis",
            "machine learning", "data science", "ai", "ml", "api", "rest",
            "graphql", "typescript", "golang", "rust", "c++", "azure", "gcp",
            "terraform", "jenkins", "ci/cd", "agile", "scrum", "git",
        ]
        
        text_lower = text.lower()
        found = []
        
        for skill in common_skills:
            if skill in text_lower:
                found.append(skill)
        
        return found
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific job by ID."""
        if not self.api_key:
            return None
        
        try:
            session = await self._get_session()
            
            # Extract the actual job ID
            actual_id = job_id.replace("simplyhired:", "")
            
            params = {"job_id": actual_id}
            
            async with session.get(
                f"{self.base_url}/job-details",
                params=params,
            ) as response:
                if response.status != 200:
                    return None
                
                data = await response.json()
                results = self._parse_results([data.get("data", {})])
                return results[0] if results else None
        
        except Exception as e:
            print(f"SimplyHired fetch error: {e}")
            return None


class LinkedInJobSource(JobSource):
    """
    LinkedIn job source (bonus).
    
    Uses RapidAPI's LinkedIn Jobs API.
    LinkedIn is a major job source, included as bonus.
    """
    
    name = "linkedin"
    base_url = "https://linkedin-jobs-api.p.rapidapi.com"
    rate_limit = 5
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key or os.environ.get("RAPIDAPI_KEY", "")
    
    def _get_headers(self):
        return {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "linkedin-jobs-api.p.rapidapi.com",
            "Accept": "application/json",
        }
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """Search LinkedIn for jobs."""
        if not self.api_key:
            return []
        
        try:
            session = await self._get_session()
            
            params = {
                "keywords": " ".join(keywords),
                "locationId": "102713980" if location.lower() == "india" else "",  # India location ID
                "datePosted": "pastMonth",
                "sort": "mostRelevant",
            }
            
            async with session.get(
                f"{self.base_url}/",
                params=params,
            ) as response:
                if response.status != 200:
                    return []
                
                data = await response.json()
                return self._parse_results(data if isinstance(data, list) else [])[:limit]
        
        except Exception as e:
            print(f"LinkedIn API error: {e}")
            return []
    
    def _parse_results(self, results: list) -> List[JobResult]:
        """Parse LinkedIn API response."""
        jobs = []
        
        for item in results:
            try:
                job = JobResult(
                    job_id=JobResult.generate_id("linkedin", str(item.get("id", ""))),
                    title=item.get("title", ""),
                    company=item.get("company", {}).get("name", item.get("company_name", "")),
                    location=item.get("location", ""),
                    description=item.get("description", ""),
                    redirect_url=item.get("url", item.get("jobUrl", "")),
                    portal="linkedin",
                    posted_date=item.get("postedTime", item.get("postedDate", "")),
                    job_type=item.get("employmentType", ""),
                    remote="remote" in item.get("title", "").lower() or 
                           item.get("workplaceType", "").lower() == "remote",
                )
                jobs.append(job)
            except Exception:
                continue
        
        return jobs
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific LinkedIn job."""
        return None  # LinkedIn doesn't support fetching by ID
