"""
Workday Job Board Integration
==============================
Fetches jobs from Workday public career sites.

Many large enterprises use Workday for their careers pages.
Workday career sites have a common API pattern.

Note: Workday APIs are company-specific and may have different
structures. This implementation targets common patterns.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import JobSource, JobResult

logger = logging.getLogger(__name__)


class WorkdaySource(JobSource):
    """
    Fetches jobs from Workday public career sites.
    
    Workday uses a standardized API across companies but with
    company-specific subdomains.
    """
    
    name = "workday"
    base_url = "https://{company}.wd5.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs"
    rate_limit = 20  # 20 requests per minute
    
    # Companies on Workday with their configurations
    # Format: (company_subdomain, site_id, display_name)
    COMPANY_CONFIGS = [
        ("microsoft", "Microsoft", "Microsoft"),
        ("salesforce", "Salesforce", "Salesforce"),
        ("adobe", "Adobe", "Adobe"),
        ("nvidia", "NVIDIAExternal", "NVIDIA"),
        ("oracle", "Oracle", "Oracle"),
        ("vmware", "VMware", "VMware"),
        ("servicenow", "ServiceNow", "ServiceNow"),
        ("workday", "Workday", "Workday"),
        ("autodesk", "Autodesk", "Autodesk"),
        ("intuit", "Intuit", "Intuit"),
        ("paypal", "PayPal", "PayPal"),
        ("visa", "Visa", "Visa"),
        ("mastercard", "Mastercard", "Mastercard"),
        ("dell", "Dell", "Dell Technologies"),
        ("hp", "HP", "HP"),
        ("ibm", "IBM", "IBM"),
        ("cisco", "Cisco", "Cisco"),
        ("qualcomm", "Qualcomm", "Qualcomm"),
        ("uber", "Uber", "Uber"),
        ("lyft", "Lyft", "Lyft"),
    ]
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """Search Workday sites for matching jobs."""
        # Fetch from multiple company sites in parallel
        tasks = [
            self._fetch_company_jobs(config, keywords, location)
            for config in self.COMPANY_CONFIGS[:10]
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten
        all_jobs = []
        for result in results:
            if isinstance(result, Exception):
                continue
            all_jobs.extend(result)
        
        # Sort by date
        all_jobs.sort(key=lambda j: j.posted_date or "", reverse=True)
        
        # Paginate
        start = (page - 1) * limit
        end = start + limit
        
        return all_jobs[start:end]
    
    async def _fetch_company_jobs(
        self,
        config: tuple,
        keywords: List[str],
        location: str,
    ) -> List[JobResult]:
        """Fetch jobs from a company's Workday site."""
        company, site, display_name = config
        session = await self._get_session()
        
        # Workday uses POST for search
        url = self.base_url.format(company=company, site=site)
        
        # Build search payload
        payload = {
            "appliedFacets": {},
            "limit": 20,
            "offset": 0,
            "searchText": " ".join(keywords) if keywords else "",
        }
        
        # Add location filter if specified
        if location and location.lower() != "india":
            payload["appliedFacets"]["locations"] = [location]
        
        try:
            async with session.post(url, json=payload) as response:
                if response.status != 200:
                    return []
                
                data = await response.json()
                job_postings = data.get("jobPostings", [])
                
                return [
                    self._parse_job(job, company, display_name)
                    for job in job_postings
                    if self._is_valid_job(job)
                ]
        
        except Exception as e:
            logger.warning(f"Failed to fetch Workday site {company}: {e}")
            return []
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific job by ID."""
        # Job ID format: workday:company:external_path
        parts = job_id.split(":", 2)
        if len(parts) < 3:
            return None
        
        company = parts[1]
        external_path = parts[2]
        
        # Find company config
        config = next(
            (c for c in self.COMPANY_CONFIGS if c[0] == company),
            None
        )
        if not config:
            return None
        
        company, site, display_name = config
        session = await self._get_session()
        
        # Workday job detail URL
        url = f"https://{company}.wd5.myworkdayjobs.com/wday/cxs/{company}/{site}{external_path}"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    return None
                
                data = await response.json()
                job = data.get("jobPostingInfo", {})
                return self._parse_job_detail(job, company, display_name, external_path)
        
        except Exception as e:
            logger.warning(f"Failed to fetch Workday job {job_id}: {e}")
            return None
    
    def _parse_job(
        self,
        job: Dict[str, Any],
        company: str,
        display_name: str,
    ) -> JobResult:
        """Parse Workday job listing to JobResult."""
        # Location
        location = "Remote"
        if job.get("locationsText"):
            location = job["locationsText"]
        elif job.get("primaryLocation"):
            location = job["primaryLocation"].get("text", "Remote")
        
        # Posted date
        posted_date = ""
        if job.get("postedOn"):
            try:
                dt = datetime.fromisoformat(job["postedOn"].replace("Z", "+00:00"))
                posted_date = dt.strftime("%Y-%m-%d")
            except Exception:
                posted_date = job.get("postedOnText", "")
        
        # Job URL
        external_path = job.get("externalPath", "")
        job_url = f"https://{company}.wd5.myworkdayjobs.com/en-US/{company}{external_path}"
        
        return JobResult(
            job_id=JobResult.generate_id("workday", f"{company}:{external_path}"),
            title=job.get("title", ""),
            company=display_name,
            location=location,
            description=job.get("bulletFields", [""])[0] if job.get("bulletFields") else "",
            redirect_url=job_url,
            portal="workday",
            posted_date=posted_date,
            skills=[],  # Will be enriched on detail fetch
            remote="remote" in location.lower(),
        )
    
    def _parse_job_detail(
        self,
        job: Dict[str, Any],
        company: str,
        display_name: str,
        external_path: str,
    ) -> JobResult:
        """Parse detailed Workday job to JobResult."""
        # Description
        description = job.get("jobDescription", "")
        description = re.sub(r'<[^>]+>', ' ', description)[:500]
        
        # Skills
        skills = self._extract_skills(f"{job.get('title', '')} {description}")
        
        # Location
        location = job.get("location", "Remote")
        
        # Posted date
        posted_date = ""
        if job.get("postedDate"):
            posted_date = job["postedDate"]
        
        job_url = f"https://{company}.wd5.myworkdayjobs.com/en-US/{company}{external_path}"
        
        return JobResult(
            job_id=JobResult.generate_id("workday", f"{company}:{external_path}"),
            title=job.get("title", ""),
            company=display_name,
            location=location,
            description=description.strip(),
            redirect_url=job_url,
            portal="workday",
            posted_date=posted_date,
            skills=skills,
            remote="remote" in location.lower(),
        )
    
    def _is_valid_job(self, job: Dict[str, Any]) -> bool:
        """Check if job data is valid."""
        return bool(job.get("title") and job.get("externalPath"))
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from job text."""
        skill_patterns = [
            r'\b(python|java|javascript|typescript|golang|c\+\+|c#|scala)\b',
            r'\b(react|angular|vue|node\.?js|\.net|spring|hibernate)\b',
            r'\b(aws|azure|gcp|kubernetes|docker|terraform)\b',
            r'\b(sql|postgresql|mysql|oracle|mongodb|redis)\b',
            r'\b(machine learning|ml|ai|data science|analytics)\b',
            r'\b(agile|scrum|jira|devops|ci/cd)\b',
        ]
        
        text_lower = text.lower()
        skills = set()
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, text_lower)
            skills.update(matches)
        
        return list(skills)[:10]
