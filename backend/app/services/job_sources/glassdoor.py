"""
Glassdoor Job Source Integration
=================================
Fetches jobs from Glassdoor via RapidAPI.

Note: Glassdoor requires authentication for full API access.
Uses RapidAPI's Glassdoor Jobs API as intermediary.
"""

from __future__ import annotations

import os
from typing import List, Optional

from app.services.job_sources.base import JobSource, JobResult


class GlassdoorJobSource(JobSource):
    """
    Glassdoor job source using RapidAPI.
    
    Features:
    - Company ratings and reviews
    - Salary estimates
    - Interview difficulty ratings
    """
    
    name = "glassdoor"
    base_url = "https://glassdoor.p.rapidapi.com"
    rate_limit = 5  # Conservative rate limit
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key or os.environ.get("RAPIDAPI_KEY", "")
    
    def _get_headers(self):
        return {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "glassdoor.p.rapidapi.com",
            "Accept": "application/json",
        }
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """Search Glassdoor for jobs."""
        if not self.api_key:
            return []  # No API key, skip this source
        
        try:
            session = await self._get_session()
            
            params = {
                "keyword": " ".join(keywords),
                "location": location,
                "pageNumber": str(page),
                "pageSize": str(limit),
            }
            
            async with session.get(
                f"{self.base_url}/job/search",
                params=params,
            ) as response:
                if response.status != 200:
                    return []
                
                data = await response.json()
                return self._parse_results(data.get("jobs", []))
        
        except Exception as e:
            print(f"Glassdoor API error: {e}")
            return []
    
    def _parse_results(self, results: list) -> List[JobResult]:
        """Parse Glassdoor API response."""
        jobs = []
        
        for item in results:
            try:
                # Parse salary
                salary_min = None
                salary_max = None
                salary_data = item.get("salaryEstimate", {})
                if salary_data:
                    salary_min = salary_data.get("minValue")
                    salary_max = salary_data.get("maxValue")
                
                # Build job URL
                job_url = item.get("jobViewUrl", "")
                if not job_url and item.get("jobId"):
                    job_url = f"https://www.glassdoor.com/job-listing/-JV_{item['jobId']}"
                
                job = JobResult(
                    job_id=JobResult.generate_id("glassdoor", str(item.get("jobId", ""))),
                    title=item.get("jobTitle", ""),
                    company=item.get("employer", {}).get("name", item.get("employerName", "")),
                    location=item.get("locationName", ""),
                    description=item.get("jobDescription", item.get("snippet", "")),
                    redirect_url=job_url,
                    portal="glassdoor",
                    posted_date=item.get("postedDate", ""),
                    salary_min=salary_min,
                    salary_max=salary_max,
                    job_type=item.get("employmentType", ""),
                    remote=item.get("isRemote", False) or 
                           "remote" in item.get("jobTitle", "").lower(),
                )
                jobs.append(job)
            except Exception:
                continue
        
        return jobs
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific Glassdoor job."""
        if not self.api_key:
            return None
        
        try:
            session = await self._get_session()
            
            # Extract the numeric ID
            gd_id = job_id.replace("glassdoor:", "")
            
            async with session.get(
                f"{self.base_url}/job/{gd_id}",
            ) as response:
                if response.status != 200:
                    return None
                
                data = await response.json()
                results = self._parse_results([data])
                return results[0] if results else None
        
        except Exception as e:
            print(f"Glassdoor fetch error: {e}")
            return None


class GlassdoorCompanySource:
    """
    Fetch company information from Glassdoor.
    
    Provides:
    - Company ratings
    - Salary ranges by role
    - Interview questions
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("RAPIDAPI_KEY", "")
        self.base_url = "https://glassdoor.p.rapidapi.com"
    
    async def get_company_info(self, company_name: str) -> Optional[dict]:
        """Get company ratings and info."""
        # Would implement company lookup
        # Useful for displaying company ratings alongside job listings
        pass
    
    async def get_salary_info(self, company_name: str, job_title: str) -> Optional[dict]:
        """Get salary information for a role at a company."""
        pass
