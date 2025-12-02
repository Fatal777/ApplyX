"""
SmartRecruiters Job Board Integration
======================================
Fetches jobs from SmartRecruiters public job boards.

SmartRecruiters provides public APIs for company career pages.
Many mid-size and enterprise companies use SmartRecruiters.

API: https://api.smartrecruiters.com/v1/companies/{companyId}/postings
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import JobSource, JobResult

logger = logging.getLogger(__name__)


class SmartRecruitersSource(JobSource):
    """
    Fetches jobs from SmartRecruiters public job boards.
    """
    
    name = "smartrecruiters"
    base_url = "https://api.smartrecruiters.com/v1/companies"
    rate_limit = 30  # 30 requests per minute
    
    # Companies on SmartRecruiters
    COMPANY_IDS = [
        ("Visa", "visa"),
        ("Spotify", "spotifyjobs"),
        ("Bosch", "bosch"),
        ("Siemens", "siemens"),
        ("IKEA", "ikea"),
        ("Philips", "philips"),
        ("SAP", "sap"),
        ("Booking.com", "booking"),
        ("Zalando", "zalando"),
        ("Adidas", "adidas"),
        ("BMW", "bmw"),
        ("Mercedes", "mercedes-benz"),
        ("Volkswagen", "volkswagen"),
        ("Porsche", "porsche"),
        ("T-Mobile", "tmobile"),
        ("Vodafone", "vodafone"),
        ("Orange", "orange"),
        ("PwC", "pwc"),
        ("Deloitte", "deloitte"),
        ("EY", "ey"),
    ]
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """Search SmartRecruiters for matching jobs."""
        tasks = [
            self._fetch_company_jobs(company_name, company_id, keywords)
            for company_name, company_id in self.COMPANY_IDS[:10]
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_jobs = []
        for result in results:
            if isinstance(result, Exception):
                continue
            all_jobs.extend(result)
        
        # Filter by location
        if location and location.lower() != "india":
            location_lower = location.lower()
            all_jobs = [
                j for j in all_jobs
                if location_lower in j.location.lower()
            ]
        
        # Sort by date
        all_jobs.sort(key=lambda j: j.posted_date or "", reverse=True)
        
        # Paginate
        start = (page - 1) * limit
        end = start + limit
        
        return all_jobs[start:end]
    
    async def _fetch_company_jobs(
        self,
        company_name: str,
        company_id: str,
        keywords: List[str],
    ) -> List[JobResult]:
        """Fetch jobs from a company."""
        session = await self._get_session()
        
        # Build query params
        params = {
            "limit": 50,
            "offset": 0,
        }
        
        if keywords:
            params["q"] = " ".join(keywords)
        
        url = f"{self.base_url}/{company_id}/postings"
        
        try:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    return []
                
                data = await response.json()
                postings = data.get("content", [])
                
                return [
                    self._parse_job(job, company_name)
                    for job in postings
                    if self._is_valid_job(job)
                ]
        
        except Exception as e:
            logger.warning(f"Failed to fetch SmartRecruiters {company_id}: {e}")
            return []
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific job by ID."""
        # Job ID format: smartrecruiters:company_id:posting_id
        parts = job_id.split(":")
        if len(parts) < 3:
            return None
        
        company_id = parts[1]
        posting_id = parts[2]
        
        # Find company name
        company_name = next(
            (name for name, cid in self.COMPANY_IDS if cid == company_id),
            company_id.title()
        )
        
        session = await self._get_session()
        url = f"{self.base_url}/{company_id}/postings/{posting_id}"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    return None
                
                job = await response.json()
                return self._parse_job(job, company_name)
        
        except Exception as e:
            logger.warning(f"Failed to fetch SmartRecruiters job {job_id}: {e}")
            return None
    
    def _parse_job(self, job: Dict[str, Any], company_name: str) -> JobResult:
        """Parse SmartRecruiters job to JobResult."""
        # Location
        location = "Remote"
        loc_data = job.get("location", {})
        if loc_data:
            city = loc_data.get("city", "")
            country = loc_data.get("country", "")
            location = f"{city}, {country}".strip(", ") or "Remote"
        
        # Description
        description = ""
        job_ad = job.get("jobAd", {})
        if job_ad:
            sections = job_ad.get("sections", {})
            company_desc = sections.get("companyDescription", {}).get("text", "")
            job_desc = sections.get("jobDescription", {}).get("text", "")
            description = re.sub(r'<[^>]+>', ' ', f"{job_desc} {company_desc}")[:500]
        
        # Posted date
        posted_date = ""
        released_date = job.get("releasedDate", "")
        if released_date:
            try:
                dt = datetime.fromisoformat(released_date.replace("Z", "+00:00"))
                posted_date = dt.strftime("%Y-%m-%d")
            except Exception:
                pass
        
        # Experience level
        experience = ""
        exp_level = job.get("experienceLevel", {})
        if exp_level:
            experience = exp_level.get("name", "")
        
        # Skills from title and description
        skills = self._extract_skills(f"{job.get('name', '')} {description}")
        
        # Job type
        job_type = "full-time"
        type_data = job.get("typeOfEmployment", {})
        if type_data:
            type_name = type_data.get("name", "").lower()
            if "part" in type_name:
                job_type = "part-time"
            elif "contract" in type_name:
                job_type = "contract"
            elif "intern" in type_name:
                job_type = "internship"
        
        # Apply URL
        apply_url = job.get("applyUrl", "")
        if not apply_url:
            ref = job.get("ref", "")
            if ref:
                apply_url = ref
        
        return JobResult(
            job_id=JobResult.generate_id("smartrecruiters", f"{job.get('company', {}).get('identifier', '')}:{job['id']}"),
            title=job.get("name", ""),
            company=company_name,
            location=location,
            description=description.strip(),
            redirect_url=apply_url,
            portal="smartrecruiters",
            posted_date=posted_date,
            skills=skills,
            experience=experience,
            job_type=job_type,
            remote="remote" in location.lower() or job.get("remote", False),
        )
    
    def _is_valid_job(self, job: Dict[str, Any]) -> bool:
        """Check if job data is valid."""
        return bool(job.get("id") and job.get("name"))
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from job text."""
        skill_patterns = [
            r'\b(python|java|javascript|typescript|golang|c\+\+|c#|scala|kotlin)\b',
            r'\b(react|angular|vue|node\.?js|spring|django|flask)\b',
            r'\b(aws|azure|gcp|kubernetes|docker|terraform)\b',
            r'\b(sql|postgresql|mysql|mongodb|redis|elasticsearch)\b',
            r'\b(machine learning|ml|ai|data science|analytics)\b',
            r'\b(agile|scrum|devops|ci/cd)\b',
        ]
        
        text_lower = text.lower()
        skills = set()
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, text_lower)
            skills.update(matches)
        
        return list(skills)[:10]
