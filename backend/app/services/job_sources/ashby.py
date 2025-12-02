"""
Ashby Job Board Integration
============================
Fetches jobs from Ashby public career pages.

Ashby is an ATS popular with startups and growing companies.
Many YC companies and tech startups use Ashby.

API: https://jobs.ashbyhq.com/api/non-user-graphql
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import JobSource, JobResult

logger = logging.getLogger(__name__)


class AshbySource(JobSource):
    """
    Fetches jobs from Ashby public job boards.
    
    Ashby uses GraphQL for their public job API.
    """
    
    name = "ashby"
    base_url = "https://jobs.ashbyhq.com"
    rate_limit = 30  # 30 requests per minute
    
    # Popular companies on Ashby
    COMPANY_BOARDS = [
        ("ramp", "Ramp"),
        ("linear", "Linear"),
        ("notion", "Notion"),
        ("mercury", "Mercury"),
        ("anthropic", "Anthropic"),
        ("perplexity", "Perplexity"),
        ("anduril", "Anduril"),
        ("deel", "Deel"),
        ("figma", "Figma"),
        ("plaid", "Plaid"),
        ("airtable", "Airtable"),
        ("vercel", "Vercel"),
        ("supabase", "Supabase"),
        ("retool", "Retool"),
        ("webflow", "Webflow"),
        ("loom", "Loom"),
        ("lattice", "Lattice"),
        ("gusto", "Gusto"),
        ("rippling", "Rippling"),
        ("brex", "Brex"),
    ]
    
    # GraphQL query for job listings
    JOBS_QUERY = """
    query JobBoardWithSearch($organizationHostedJobsPageName: String!) {
        jobBoard: jobBoardWithSearch(
            organizationHostedJobsPageName: $organizationHostedJobsPageName
        ) {
            jobPostings {
                id
                title
                departmentName
                locationName
                employmentType
                publishedAt
                jobUrl
                descriptionHtml
            }
        }
    }
    """
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """Search Ashby boards for matching jobs."""
        tasks = [
            self._fetch_board_jobs(board_id, company_name)
            for board_id, company_name in self.COMPANY_BOARDS[:15]
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_jobs = []
        for result in results:
            if isinstance(result, Exception):
                continue
            all_jobs.extend(result)
        
        # Filter by keywords
        if keywords:
            keywords_lower = [k.lower() for k in keywords]
            filtered = []
            for job in all_jobs:
                job_text = f"{job.title} {job.description}".lower()
                if any(kw in job_text for kw in keywords_lower):
                    filtered.append(job)
            all_jobs = filtered
        
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
    
    async def _fetch_board_jobs(
        self,
        board_id: str,
        company_name: str,
    ) -> List[JobResult]:
        """Fetch all jobs from a company board using GraphQL."""
        session = await self._get_session()
        
        url = f"{self.base_url}/api/non-user-graphql"
        
        payload = {
            "operationName": "JobBoardWithSearch",
            "variables": {
                "organizationHostedJobsPageName": board_id,
            },
            "query": self.JOBS_QUERY,
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        try:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    return []
                
                data = await response.json()
                
                job_board = data.get("data", {}).get("jobBoard", {})
                if not job_board:
                    return []
                
                postings = job_board.get("jobPostings", [])
                
                return [
                    self._parse_job(job, board_id, company_name)
                    for job in postings
                    if self._is_valid_job(job)
                ]
        
        except Exception as e:
            logger.warning(f"Failed to fetch Ashby board {board_id}: {e}")
            return []
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific job by ID."""
        # Job ID format: ashby:board_id:posting_id
        parts = job_id.split(":")
        if len(parts) < 3:
            return None
        
        board_id = parts[1]
        posting_id = parts[2]
        
        # Find company name
        company_name = next(
            (name for bid, name in self.COMPANY_BOARDS if bid == board_id),
            board_id.title()
        )
        
        # Fetch all jobs from board and find the one we want
        jobs = await self._fetch_board_jobs(board_id, company_name)
        
        for job in jobs:
            if job.job_id == job_id:
                return job
        
        return None
    
    def _parse_job(
        self,
        job: Dict[str, Any],
        board_id: str,
        company_name: str,
    ) -> JobResult:
        """Parse Ashby job to JobResult."""
        # Location
        location = job.get("locationName", "Remote") or "Remote"
        
        # Description
        description_html = job.get("descriptionHtml", "")
        description = re.sub(r'<[^>]+>', ' ', description_html)[:500]
        
        # Posted date
        posted_date = ""
        published_at = job.get("publishedAt")
        if published_at:
            try:
                dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                posted_date = dt.strftime("%Y-%m-%d")
            except Exception:
                pass
        
        # Job type
        employment_type = job.get("employmentType", "").lower()
        job_type = "full-time"
        if "part" in employment_type:
            job_type = "part-time"
        elif "contract" in employment_type:
            job_type = "contract"
        elif "intern" in employment_type:
            job_type = "internship"
        
        # Skills
        skills = self._extract_skills(f"{job.get('title', '')} {description}")
        
        # Job URL
        job_url = job.get("jobUrl", f"https://jobs.ashbyhq.com/{board_id}/{job['id']}")
        
        return JobResult(
            job_id=JobResult.generate_id("ashby", f"{board_id}:{job['id']}"),
            title=job.get("title", ""),
            company=company_name,
            location=location,
            description=description.strip(),
            redirect_url=job_url,
            portal="ashby",
            posted_date=posted_date,
            skills=skills,
            job_type=job_type,
            remote="remote" in location.lower(),
        )
    
    def _is_valid_job(self, job: Dict[str, Any]) -> bool:
        """Check if job data is valid."""
        return bool(job.get("id") and job.get("title"))
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from job text."""
        skill_patterns = [
            r'\b(python|java|javascript|typescript|golang|go|rust|ruby|c\+\+|c#|scala)\b',
            r'\b(react|angular|vue|node\.?js|express|django|flask|fastapi|rails)\b',
            r'\b(aws|azure|gcp|kubernetes|docker|terraform|jenkins)\b',
            r'\b(postgresql|mysql|mongodb|redis|elasticsearch|kafka)\b',
            r'\b(machine learning|ml|ai|deep learning|nlp|pytorch|tensorflow)\b',
            r'\b(data science|data engineering|analytics|spark|airflow)\b',
        ]
        
        text_lower = text.lower()
        skills = set()
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, text_lower)
            skills.update(matches)
        
        return list(skills)[:10]
