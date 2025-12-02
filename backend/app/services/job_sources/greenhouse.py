"""
Greenhouse Job Board Integration
=================================
Fetches jobs from Greenhouse public job boards.

Greenhouse provides public job board APIs for companies that host 
their careers pages on Greenhouse. We aggregate from popular 
tech companies using Greenhouse.

API: https://boards.greenhouse.io/[company]/jobs
Format: JSON

Popular companies on Greenhouse:
- Airbnb, Stripe, Notion, Figma, Hashicorp, Datadog, etc.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import aiohttp

from .base import JobSource, JobResult

logger = logging.getLogger(__name__)


class GreenhouseSource(JobSource):
    """
    Fetches jobs from Greenhouse public job boards.
    
    Greenhouse doesn't have a unified search API, so we fetch from
    known company boards and search locally.
    """
    
    name = "greenhouse"
    base_url = "https://boards-api.greenhouse.io/v1/boards"
    rate_limit = 30  # 30 requests per minute (generous for public API)
    
    # Popular tech companies on Greenhouse
    COMPANY_BOARDS = [
        "airbnb",
        "stripe",
        "notion",
        "figma",
        "hashicorp",
        "datadog",
        "mongodb",
        "twilio",
        "plaid",
        "airtable",
        "discord",
        "netlify",
        "linear",
        "vercel",
        "supabase",
        "railway",
        "planetscale",
        "cockroachlabs",
        "grafana",
        "elastic",
        "samsara",
        "amplitude",
        "segment",
        "calendly",
        "gusto",
        "lattice",
        "loom",
        "webflow",
        "retool",
        "rippling",
    ]
    
    # Company name mappings (board_id -> display name)
    COMPANY_NAMES = {
        "airbnb": "Airbnb",
        "stripe": "Stripe",
        "notion": "Notion",
        "figma": "Figma",
        "hashicorp": "HashiCorp",
        "datadog": "Datadog",
        "mongodb": "MongoDB",
        "twilio": "Twilio",
        "plaid": "Plaid",
        "airtable": "Airtable",
        "discord": "Discord",
        "netlify": "Netlify",
        "linear": "Linear",
        "vercel": "Vercel",
        "supabase": "Supabase",
        "railway": "Railway",
        "planetscale": "PlanetScale",
        "cockroachlabs": "Cockroach Labs",
        "grafana": "Grafana Labs",
        "elastic": "Elastic",
        "samsara": "Samsara",
        "amplitude": "Amplitude",
        "segment": "Segment",
        "calendly": "Calendly",
        "gusto": "Gusto",
        "lattice": "Lattice",
        "loom": "Loom",
        "webflow": "Webflow",
        "retool": "Retool",
        "rippling": "Rippling",
    }
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """
        Search Greenhouse boards for matching jobs.
        
        Strategy:
        1. Fetch jobs from multiple company boards in parallel
        2. Filter by keywords and location
        3. Return sorted by relevance
        """
        # Fetch from multiple boards in parallel
        tasks = [
            self._fetch_board_jobs(board)
            for board in self.COMPANY_BOARDS[:15]  # Limit to avoid rate limits
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten and filter
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
        
        # Paginate
        start = (page - 1) * limit
        end = start + limit
        
        return all_jobs[start:end]
    
    async def _fetch_board_jobs(self, board_id: str) -> List[JobResult]:
        """Fetch all jobs from a company board."""
        session = await self._get_session()
        url = f"{self.base_url}/{board_id}/jobs"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    return []
                
                data = await response.json()
                jobs = data.get("jobs", [])
                
                return [
                    self._parse_job(job, board_id)
                    for job in jobs
                    if self._is_valid_job(job)
                ]
        
        except Exception as e:
            logger.warning(f"Failed to fetch Greenhouse board {board_id}: {e}")
            return []
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific job by ID."""
        # Job ID format: greenhouse:board_id:job_id
        parts = job_id.split(":")
        if len(parts) < 3:
            return None
        
        board_id = parts[1]
        external_id = parts[2]
        
        session = await self._get_session()
        url = f"{self.base_url}/{board_id}/jobs/{external_id}"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    return None
                
                job = await response.json()
                return self._parse_job(job, board_id)
        
        except Exception as e:
            logger.warning(f"Failed to fetch Greenhouse job {job_id}: {e}")
            return None
    
    def _parse_job(self, job: Dict[str, Any], board_id: str) -> JobResult:
        """Parse Greenhouse job to JobResult."""
        # Extract location
        location = "Remote"
        if job.get("location"):
            loc_name = job["location"].get("name", "")
            location = loc_name if loc_name else "Remote"
        
        # Extract description (strip HTML)
        content = job.get("content", "")
        description = re.sub(r'<[^>]+>', ' ', content)[:500]
        
        # Extract skills from title and content
        skills = self._extract_skills(f"{job.get('title', '')} {content}")
        
        # Parse date
        updated_at = job.get("updated_at", "")
        if updated_at:
            try:
                dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                posted_date = dt.strftime("%Y-%m-%d")
            except Exception:
                posted_date = ""
        else:
            posted_date = ""
        
        return JobResult(
            job_id=JobResult.generate_id("greenhouse", f"{board_id}:{job['id']}"),
            title=job.get("title", ""),
            company=self.COMPANY_NAMES.get(board_id, board_id.title()),
            location=location,
            description=description.strip(),
            redirect_url=job.get("absolute_url", ""),
            portal="greenhouse",
            posted_date=posted_date,
            skills=skills,
            remote="remote" in location.lower(),
        )
    
    def _is_valid_job(self, job: Dict[str, Any]) -> bool:
        """Check if job data is valid."""
        return bool(job.get("id") and job.get("title"))
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from job text."""
        skill_patterns = [
            r'\b(python|java|javascript|typescript|golang|go|rust|ruby|c\+\+|c#)\b',
            r'\b(react|angular|vue|node\.?js|express|django|flask|fastapi|spring)\b',
            r'\b(aws|azure|gcp|kubernetes|docker|terraform|jenkins|ci/cd)\b',
            r'\b(postgresql|mysql|mongodb|redis|elasticsearch|kafka|rabbitmq)\b',
            r'\b(machine learning|ml|ai|deep learning|nlp|computer vision)\b',
            r'\b(data science|data engineering|analytics|etl|spark|hadoop)\b',
        ]
        
        text_lower = text.lower()
        skills = set()
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, text_lower)
            skills.update(matches)
        
        return list(skills)[:10]
