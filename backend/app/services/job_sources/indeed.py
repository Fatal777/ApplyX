"""
Indeed Job Source Integration
==============================
Fetches jobs from Indeed via RapidAPI.

Note: Indeed blocks direct scraping, so we use RapidAPI's Indeed Jobs API.
Falls back to Adzuna/JSearch if API is unavailable.
"""

from __future__ import annotations

import os
from typing import List, Optional

from app.services.job_sources.base import JobSource, JobResult


class IndeedJobSource(JobSource):
    """
    Indeed job source using RapidAPI.
    
    Rate limit: 500 requests/month on free tier
    Provides: Title, Company, Location, Description, Salary, Job Type
    """
    
    name = "indeed"
    base_url = "https://indeed-indeed.p.rapidapi.com"
    rate_limit = 5  # Conservative rate limit
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key or os.environ.get("RAPIDAPI_KEY", "")
    
    def _get_headers(self):
        return {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "indeed-indeed.p.rapidapi.com",
            "Accept": "application/json",
        }
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """Search Indeed for jobs."""
        if not self.api_key:
            return []  # No API key, skip this source
        
        try:
            session = await self._get_session()
            
            params = {
                "query": " ".join(keywords),
                "location": location,
                "page_id": str(page),
                "locality": "in" if location.lower() == "india" else "us",
                "fromage": "14",  # Last 14 days
                "radius": "50",
            }
            
            async with session.get(
                f"{self.base_url}/apisearch",
                params=params,
            ) as response:
                if response.status != 200:
                    return []
                
                data = await response.json()
                return self._parse_results(data.get("hits", []))
        
        except Exception as e:
            print(f"Indeed API error: {e}")
            return []
    
    def _parse_results(self, results: list) -> List[JobResult]:
        """Parse Indeed API response."""
        jobs = []
        
        for item in results:
            try:
                # Parse salary if available
                salary_min = None
                salary_max = None
                salary_str = item.get("salary", "")
                if salary_str:
                    # Try to extract numbers from salary string
                    import re
                    numbers = re.findall(r'[\d,]+', salary_str.replace(",", ""))
                    if len(numbers) >= 2:
                        salary_min = int(numbers[0])
                        salary_max = int(numbers[1])
                    elif len(numbers) == 1:
                        salary_min = int(numbers[0])
                
                job = JobResult(
                    job_id=JobResult.generate_id("indeed", item.get("id", "")),
                    title=item.get("title", ""),
                    company=item.get("company_name", ""),
                    location=item.get("location", ""),
                    description=item.get("description", item.get("snippet", "")),
                    redirect_url=item.get("link", ""),
                    portal="indeed",
                    posted_date=item.get("pubdate", ""),
                    salary_min=salary_min,
                    salary_max=salary_max,
                    job_type=item.get("job_type", ""),
                    remote="remote" in item.get("title", "").lower() or 
                           "remote" in item.get("location", "").lower(),
                )
                jobs.append(job)
            except Exception:
                continue
        
        return jobs
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific Indeed job."""
        # Indeed API doesn't support fetching by ID directly
        # Would need to store/cache results
        return None


class IndeedScraperSource(JobSource):
    """
    Indeed jobs via web scraping (backup method).
    
    Note: Use sparingly as Indeed blocks scrapers.
    Prefer the API version when available.
    """
    
    name = "indeed_scraper"
    base_url = "https://www.indeed.com"
    rate_limit = 2  # Very conservative
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 10,
    ) -> List[JobResult]:
        """
        Scrape Indeed search results.
        
        Warning: Indeed actively blocks scrapers.
        This should only be used as a fallback.
        """
        # Disabled by default - Indeed blocks scrapers
        # Use IndeedJobSource with RapidAPI instead
        return []
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        return None
