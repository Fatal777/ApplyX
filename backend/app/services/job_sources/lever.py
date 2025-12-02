"""
Lever Job Board Integration
============================
Fetches jobs from Lever public career pages.

Lever provides public job board APIs for companies hosting
their careers on Lever. Similar to Greenhouse but with
different API structure.

API: https://api.lever.co/v0/postings/[company]
Format: JSON
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import JobSource, JobResult

logger = logging.getLogger(__name__)


class LeverSource(JobSource):
    """
    Fetches jobs from Lever public job boards.
    """
    
    name = "lever"
    base_url = "https://api.lever.co/v0/postings"
    rate_limit = 30  # 30 requests per minute
    
    # Popular companies on Lever
    COMPANY_BOARDS = [
        "netflix",
        "shopify",
        "coinbase",
        "openai",
        "anthropic",
        "robinhood",
        "doordash",
        "instacart",
        "lyft",
        "pinterest",
        "dropbox",
        "asana",
        "okta",
        "atlassian",
        "hubspot",
        "zendesk",
        "docusign",
        "pagerduty",
        "miro",
        "canva",
        "cloudflare",
        "scale",
        "ramp",
        "brex",
        "flexport",
        "chime",
        "sofi",
        "affirm",
        "square",
        "toast",
    ]
    
    COMPANY_NAMES = {
        "netflix": "Netflix",
        "shopify": "Shopify",
        "coinbase": "Coinbase",
        "openai": "OpenAI",
        "anthropic": "Anthropic",
        "robinhood": "Robinhood",
        "doordash": "DoorDash",
        "instacart": "Instacart",
        "lyft": "Lyft",
        "pinterest": "Pinterest",
        "dropbox": "Dropbox",
        "asana": "Asana",
        "okta": "Okta",
        "atlassian": "Atlassian",
        "hubspot": "HubSpot",
        "zendesk": "Zendesk",
        "docusign": "DocuSign",
        "pagerduty": "PagerDuty",
        "miro": "Miro",
        "canva": "Canva",
        "cloudflare": "Cloudflare",
        "scale": "Scale AI",
        "ramp": "Ramp",
        "brex": "Brex",
        "flexport": "Flexport",
        "chime": "Chime",
        "sofi": "SoFi",
        "affirm": "Affirm",
        "square": "Square",
        "toast": "Toast",
    }
    
    async def search(
        self,
        keywords: List[str],
        location: str = "India",
        page: int = 1,
        limit: int = 20,
    ) -> List[JobResult]:
        """Search Lever boards for matching jobs."""
        # Fetch from multiple boards in parallel
        tasks = [
            self._fetch_board_jobs(board)
            for board in self.COMPANY_BOARDS[:15]
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
        url = f"{self.base_url}/{board_id}"
        
        try:
            async with session.get(url, params={"mode": "json"}) as response:
                if response.status != 200:
                    return []
                
                jobs = await response.json()
                
                if not isinstance(jobs, list):
                    return []
                
                return [
                    self._parse_job(job, board_id)
                    for job in jobs
                    if self._is_valid_job(job)
                ]
        
        except Exception as e:
            logger.warning(f"Failed to fetch Lever board {board_id}: {e}")
            return []
    
    async def fetch_by_id(self, job_id: str) -> Optional[JobResult]:
        """Fetch a specific job by ID."""
        # Job ID format: lever:board_id:job_id
        parts = job_id.split(":")
        if len(parts) < 3:
            return None
        
        board_id = parts[1]
        external_id = parts[2]
        
        session = await self._get_session()
        url = f"{self.base_url}/{board_id}/{external_id}"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    return None
                
                job = await response.json()
                return self._parse_job(job, board_id)
        
        except Exception as e:
            logger.warning(f"Failed to fetch Lever job {job_id}: {e}")
            return None
    
    def _parse_job(self, job: Dict[str, Any], board_id: str) -> JobResult:
        """Parse Lever job to JobResult."""
        # Location from categories
        location = "Remote"
        categories = job.get("categories", {})
        if categories.get("location"):
            location = categories["location"]
        
        # Team/department
        team = categories.get("team", "")
        
        # Description from lists
        description_parts = []
        for section in job.get("lists", []):
            content = section.get("content", "")
            description_parts.append(re.sub(r'<[^>]+>', ' ', content))
        
        description = " ".join(description_parts)[:500]
        
        # Additional description from text
        if job.get("descriptionPlain"):
            description = job["descriptionPlain"][:500]
        
        # Extract skills
        full_text = f"{job.get('text', '')} {description}"
        skills = self._extract_skills(full_text)
        
        # Parse date
        created_at = job.get("createdAt", 0)
        if created_at:
            try:
                dt = datetime.fromtimestamp(created_at / 1000)
                posted_date = dt.strftime("%Y-%m-%d")
            except Exception:
                posted_date = ""
        else:
            posted_date = ""
        
        # Work type
        commitment = categories.get("commitment", "")
        job_type = "full-time"
        if "part" in commitment.lower():
            job_type = "part-time"
        elif "contract" in commitment.lower():
            job_type = "contract"
        elif "intern" in commitment.lower():
            job_type = "internship"
        
        return JobResult(
            job_id=JobResult.generate_id("lever", f"{board_id}:{job['id']}"),
            title=job.get("text", ""),
            company=self.COMPANY_NAMES.get(board_id, board_id.title()),
            location=location,
            description=description.strip(),
            redirect_url=job.get("hostedUrl", job.get("applyUrl", "")),
            portal="lever",
            posted_date=posted_date,
            skills=skills,
            job_type=job_type,
            remote="remote" in location.lower(),
        )
    
    def _is_valid_job(self, job: Dict[str, Any]) -> bool:
        """Check if job data is valid."""
        return bool(job.get("id") and job.get("text"))
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from job text."""
        skill_patterns = [
            r'\b(python|java|javascript|typescript|golang|go|rust|ruby|c\+\+|c#|scala|kotlin)\b',
            r'\b(react|angular|vue|node\.?js|express|django|flask|fastapi|spring|rails)\b',
            r'\b(aws|azure|gcp|kubernetes|docker|terraform|jenkins|github actions|gitlab)\b',
            r'\b(postgresql|mysql|mongodb|redis|elasticsearch|kafka|dynamodb|cassandra)\b',
            r'\b(machine learning|ml|ai|deep learning|nlp|pytorch|tensorflow|keras)\b',
            r'\b(data science|data engineering|analytics|etl|spark|airflow|dbt)\b',
        ]
        
        text_lower = text.lower()
        skills = set()
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, text_lower)
            skills.update(matches)
        
        return list(skills)[:10]
