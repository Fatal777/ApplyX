"""Job scraping / aggregation service with real API integrations.

This service centralizes fetching jobs from multiple portals:
- Adzuna API (free tier, supports India)
- JSearch via RapidAPI (aggregates LinkedIn, Indeed, Glassdoor)
- Remotive API (free, remote tech jobs)

Each fetch_* method returns a list of dicts with:
{
  'title': str,
  'company': str,
  'location': str,
  'description': str,
  'skills': List[str],
  'redirect_url': str,
  'portal': str,
  'posted_date': str,
  'salary_min': int | None,
  'salary_max': int | None,
  'experience': str | None
}
"""
from __future__ import annotations

import time
import logging
import re
from typing import List, Dict, Any, Optional
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.core.config import settings
from app.services.job_cache_service import JobCacheService

logger = logging.getLogger(__name__)

# Create a session with retry logic
def _create_session() -> requests.Session:
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


class JobScraperService:
    """Aggregate job listings across multiple portals with rate limiting.

    Supported portals:
    - adzuna: Adzuna API (free tier 250 calls/month, supports India)
    - jsearch: JSearch RapidAPI (200 free/month, aggregates LinkedIn/Indeed/Glassdoor)
    - remotive: Remotive API (free, no auth, remote tech jobs)
    - arbeitnow: Arbeitnow API (free, no auth, tech/startup jobs)
    """

    # Per-minute soft limits
    _RATE_LIMITS = {
        "adzuna": 5,      # ~250/month ≈ 8/day, be conservative
        "jsearch": 3,     # 200/month ≈ 6/day
        "remotive": 10,   # Free, generous
        "arbeitnow": 10,  # Free, no auth required
    }

    # API endpoints
    ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs"
    JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com/search"
    REMOTIVE_BASE_URL = "https://remotive.com/api/remote-jobs"
    ARBEITNOW_BASE_URL = "https://www.arbeitnow.com/api/job-board-api"

    def __init__(self) -> None:
        self._cache = JobCacheService()
        self._session = _create_session()

    # ---------------- Public API ----------------
    def fetch_jobs(self, portal: str, keywords: List[str], location: str = "India") -> List[Dict[str, Any]]:
        """Fetch jobs for a portal; handles rate limiting + dispatch.
        Returns empty list on rate limit exceed or API error.
        """
        if portal not in self._RATE_LIMITS:
            logger.warning("Unsupported portal requested: %s", portal)
            return []

        minute_epoch = int(time.time() // 60)
        current_count = self._cache.increment_rate_limit(portal, minute_epoch)
        if current_count > self._RATE_LIMITS[portal]:
            logger.info("Rate limit exceeded portal=%s count=%d", portal, current_count)
            return []

        dispatcher = {
            "adzuna": self._fetch_adzuna_jobs,
            "jsearch": self._fetch_jsearch_jobs,
            "remotive": self._fetch_remotive_jobs,
            "arbeitnow": self._fetch_arbeitnow_jobs,
        }.get(portal)

        if not dispatcher:
            return []

        try:
            jobs = dispatcher(keywords, location)
            logger.info("Fetched %d jobs from %s", len(jobs), portal)
            return jobs
        except Exception as e:
            logger.error("Error fetching from %s: %s", portal, str(e))
            return []

    def fetch_all_portals(self, keywords: List[str], location: str = "India") -> List[Dict[str, Any]]:
        """Fetch from all available portals and combine results."""
        all_jobs = []
        for portal in self._RATE_LIMITS.keys():
            jobs = self.fetch_jobs(portal, keywords, location)
            all_jobs.extend(jobs)
        return all_jobs

    # -------------- Real API Fetchers --------------

    def _fetch_adzuna_jobs(self, keywords: List[str], location: str) -> List[Dict[str, Any]]:
        """Fetch jobs from Adzuna API.
        
        Adzuna API docs: https://developer.adzuna.com/docs/search
        Free tier: 250 calls/month
        Supports India with country code 'in'
        """
        app_id = getattr(settings, 'ADZUNA_APP_ID', None)
        app_key = getattr(settings, 'ADZUNA_APP_KEY', None)
        
        if not app_id or not app_key:
            logger.warning("Adzuna API credentials not configured, using stub")
            return self._fetch_adzuna_stub(keywords, location)

        # Build query from keywords
        query = " ".join(keywords[:5]) if keywords else "software developer"
        
        # Map location to Adzuna format
        where = location if location else "India"
        country = "in"  # India country code
        
        params = {
            "app_id": app_id,
            "app_key": app_key,
            "what": query,
            "where": where,
            "results_per_page": 20,
            "sort_by": "relevance",
        }
        
        url = f"{self.ADZUNA_BASE_URL}/{country}/search/1"
        
        try:
            response = self._session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            jobs = []
            for item in data.get("results", []):
                job = self._normalize_adzuna_job(item)
                if job:
                    jobs.append(job)
            
            return jobs
        except requests.RequestException as e:
            logger.error("Adzuna API error: %s", str(e))
            return []

    def _normalize_adzuna_job(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize Adzuna job response to standard format."""
        try:
            # Extract skills from description using basic pattern matching
            description = item.get("description", "")
            skills = self._extract_skills_from_text(description)
            
            # Parse location
            location_data = item.get("location", {})
            location_parts = location_data.get("display_name", "India").split(", ")
            location = location_parts[0] if location_parts else "India"
            
            return {
                "title": item.get("title", "Unknown Position"),
                "company": item.get("company", {}).get("display_name", "Unknown Company"),
                "location": location,
                "description": description[:500],  # Truncate for storage
                "skills": skills,
                # Resolve Adzuna tracking URL to get actual job page
                "redirect_url": self._resolve_redirect_url(item.get("redirect_url", "")),
                "portal": "adzuna",
                "posted_date": item.get("created", datetime.now().isoformat())[:10],
                "salary_min": item.get("salary_min"),
                "salary_max": item.get("salary_max"),
                "experience": self._infer_experience_level(item.get("title", ""), description),
                "job_id": item.get("id", ""),
            }
        except Exception as e:
            logger.warning("Failed to normalize Adzuna job: %s", str(e))
            return None

    def _fetch_jsearch_jobs(self, keywords: List[str], location: str) -> List[Dict[str, Any]]:
        """Fetch jobs from JSearch RapidAPI.
        
        JSearch aggregates: LinkedIn, Indeed, Glassdoor, ZipRecruiter
        Free tier: 200 requests/month
        """
        api_key = getattr(settings, 'JSEARCH_RAPIDAPI_KEY', None)
        
        if not api_key:
            logger.warning("JSearch API key not configured, using stub")
            return self._fetch_jsearch_stub(keywords, location)

        # Build query
        query = " ".join(keywords[:5]) if keywords else "software developer"
        if location:
            query += f" in {location}"

        headers = {
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            "X-RapidAPI-Key": api_key,
        }
        
        params = {
            "query": query,
            "num_pages": "1",
            "date_posted": "week",  # Recent jobs only
        }
        
        try:
            response = self._session.get(
                self.JSEARCH_BASE_URL, 
                headers=headers, 
                params=params, 
                timeout=15
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                logger.warning("JSearch API returned non-OK status: %s", data.get("status"))
                return []
            
            jobs = []
            for item in data.get("data", []):
                job = self._normalize_jsearch_job(item)
                if job:
                    jobs.append(job)
            
            return jobs
        except requests.RequestException as e:
            logger.error("JSearch API error: %s", str(e))
            return []

    def _normalize_jsearch_job(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize JSearch job response to standard format."""
        try:
            description = item.get("job_description", "")
            skills = self._extract_skills_from_text(description)
            
            # Handle location
            city = item.get("job_city", "")
            state = item.get("job_state", "")
            country = item.get("job_country", "India")
            location = ", ".join(filter(None, [city, state, country]))
            
            # Get salary if available
            salary_min = item.get("job_min_salary")
            salary_max = item.get("job_max_salary")
            
            return {
                "title": item.get("job_title", "Unknown Position"),
                "company": item.get("employer_name", "Unknown Company"),
                "location": location or "Remote",
                "description": description[:500],
                "skills": skills,
                "redirect_url": item.get("job_apply_link", ""),
                "portal": "jsearch",
                "posted_date": item.get("job_posted_at_datetime_utc", "")[:10] if item.get("job_posted_at_datetime_utc") else datetime.now().strftime("%Y-%m-%d"),
                "salary_min": int(salary_min) if salary_min else None,
                "salary_max": int(salary_max) if salary_max else None,
                "experience": self._infer_experience_level(item.get("job_title", ""), description),
                "job_id": item.get("job_id", ""),
                "employer_logo": item.get("employer_logo"),
                "is_remote": item.get("job_is_remote", False),
            }
        except Exception as e:
            logger.warning("Failed to normalize JSearch job: %s", str(e))
            return None

    def _fetch_remotive_jobs(self, keywords: List[str], location: str) -> List[Dict[str, Any]]:
        """Fetch jobs from Remotive API.
        
        Remotive API: Free, no auth required
        Focused on remote tech jobs
        """
        # Map keywords to Remotive categories if possible
        category = self._map_to_remotive_category(keywords)
        
        params = {}
        if category:
            params["category"] = category
        
        # Add search term
        if keywords:
            params["search"] = " ".join(keywords[:3])
        
        try:
            response = self._session.get(
                self.REMOTIVE_BASE_URL,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            jobs = []
            for item in data.get("jobs", [])[:20]:  # Limit to 20
                job = self._normalize_remotive_job(item)
                if job:
                    jobs.append(job)
            
            return jobs
        except requests.RequestException as e:
            logger.error("Remotive API error: %s", str(e))
            return []

    def _normalize_remotive_job(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize Remotive job response to standard format."""
        try:
            description = item.get("description", "")
            # Strip HTML tags from description
            clean_desc = re.sub(r'<[^>]+>', '', description)
            skills = self._extract_skills_from_text(clean_desc)
            
            return {
                "title": item.get("title", "Unknown Position"),
                "company": item.get("company_name", "Unknown Company"),
                "location": "Remote",
                "description": clean_desc[:500],
                "skills": skills,
                "redirect_url": item.get("url", ""),
                "portal": "remotive",
                "posted_date": item.get("publication_date", datetime.now().strftime("%Y-%m-%d"))[:10],
                "salary_min": None,
                "salary_max": None,
                "experience": self._infer_experience_level(item.get("title", ""), clean_desc),
                "job_id": str(item.get("id", "")),
                "job_type": item.get("job_type", ""),
                "category": item.get("category", ""),
                "company_logo": item.get("company_logo"),
            }
        except Exception as e:
            logger.warning("Failed to normalize Remotive job: %s", str(e))
            return None

    def _map_to_remotive_category(self, keywords: List[str]) -> Optional[str]:
        """Map keywords to Remotive job categories."""
        keyword_str = " ".join(keywords).lower()
        
        category_map = {
            "software-dev": ["python", "java", "javascript", "developer", "engineer", "backend", "frontend", "fullstack"],
            "design": ["ui", "ux", "design", "figma", "graphic"],
            "data": ["data", "analytics", "machine learning", "ml", "ai", "scientist"],
            "devops": ["devops", "sre", "infrastructure", "cloud", "aws", "kubernetes"],
            "product": ["product manager", "product owner", "scrum"],
            "marketing": ["marketing", "seo", "content", "social media"],
            "qa": ["qa", "quality", "testing", "automation"],
        }
        
        for category, terms in category_map.items():
            if any(term in keyword_str for term in terms):
                return category
        
        return "software-dev"  # Default for tech jobs

    def _fetch_arbeitnow_jobs(self, keywords: List[str], location: str) -> List[Dict[str, Any]]:
        """Fetch jobs from Arbeitnow API.
        
        Arbeitnow API: Free, no auth required
        Focused on tech/startup jobs in Europe but has global listings
        """
        params = {}
        if keywords:
            params["search"] = " ".join(keywords[:3])
        
        try:
            response = self._session.get(
                self.ARBEITNOW_BASE_URL,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            jobs = []
            for item in data.get("data", [])[:20]:  # Limit to 20
                job = self._normalize_arbeitnow_job(item)
                if job:
                    jobs.append(job)
            
            return jobs
        except requests.RequestException as e:
            logger.error("Arbeitnow API error: %s", str(e))
            return []

    def _normalize_arbeitnow_job(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize Arbeitnow job response to standard format."""
        try:
            description = item.get("description", "") or ""
            # Strip HTML tags from description
            clean_desc = re.sub(r'<[^>]+>', '', str(description))
            skills = self._extract_skills_from_text(clean_desc)
            
            # Parse location
            location = item.get("location", "Remote") or "Remote"
            if item.get("remote", False):
                location = "Remote"
            
            # Handle created_at - could be string or Unix timestamp
            created_at = item.get("created_at", "")
            if isinstance(created_at, int):
                # Unix timestamp
                posted_date = datetime.fromtimestamp(created_at).strftime("%Y-%m-%d")
            elif isinstance(created_at, str) and created_at:
                posted_date = created_at[:10]
            else:
                posted_date = datetime.now().strftime("%Y-%m-%d")
            
            # Handle tags - could be list, string, or None
            tags = item.get("tags", [])
            if isinstance(tags, list):
                category = ", ".join(str(t) for t in tags)
            elif tags:
                category = str(tags)
            else:
                category = ""
            
            return {
                "title": item.get("title", "Unknown Position") or "Unknown Position",
                "company": item.get("company_name", "Unknown Company") or "Unknown Company",
                "location": location,
                "description": clean_desc[:500],
                "skills": skills,
                "redirect_url": item.get("url", "") or "",
                "portal": "arbeitnow",
                "posted_date": posted_date,
                "salary_min": None,
                "salary_max": None,
                "experience": self._infer_experience_level(item.get("title", "") or "", clean_desc),
                "job_id": str(item.get("slug", "") or ""),
                "job_type": "Full-time" if not item.get("remote") else "Remote",
                "category": category,
                "company_logo": None,
            }
        except Exception as e:
            logger.warning("Failed to normalize Arbeitnow job: %s", str(e))
            return None

    def _fetch_serpapi_jobs(self, keywords: List[str], location: str) -> List[Dict[str, Any]]:
        """Fetch jobs from SerpAPI Google Jobs.
        
        SerpAPI: 100 free searches/month
        Aggregates Google Jobs results from multiple sources
        """
        if not settings.SERPAPI_KEY:
            logger.warning("SERPAPI_KEY not configured, skipping")
            return []
        
        params = {
            "engine": "google_jobs",
            "q": " ".join(keywords[:5]),
            "location": location,
            "api_key": settings.SERPAPI_KEY,
            "hl": "en",
        }
        
        try:
            response = self._session.get(
                self.SERPAPI_BASE_URL,
                params=params,
                timeout=15
            )
            response.raise_for_status()
            data = response.json()
            
            jobs = []
            for item in data.get("jobs_results", [])[:20]:  # Limit to 20
                job = self._normalize_serpapi_job(item)
                if job:
                    jobs.append(job)
            
            return jobs
        except requests.RequestException as e:
            logger.error("SerpAPI error: %s", str(e))
            return []

    def _normalize_serpapi_job(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize SerpAPI Google Jobs response to standard format."""
        try:
            description = item.get("description", "")
            skills = self._extract_skills_from_text(description)
            
            # Extract salary if available
            salary_info = item.get("detected_extensions", {})
            
            # Get apply link - prefer share_link, fallback to related_links
            apply_url = item.get("share_link", "")
            if not apply_url:
                apply_options = item.get("apply_options", [])
                if apply_options:
                    apply_url = apply_options[0].get("link", "")
            
            return {
                "title": item.get("title", "Unknown Position"),
                "company": item.get("company_name", "Unknown Company"),
                "location": item.get("location", location if 'location' in dir() else "India"),
                "description": description[:500],
                "skills": skills,
                "redirect_url": apply_url,
                "portal": "google_jobs",
                "posted_date": item.get("detected_extensions", {}).get("posted_at", ""),
                "salary_min": None,
                "salary_max": None,
                "experience": self._infer_experience_level(item.get("title", ""), description),
                "job_id": item.get("job_id", ""),
                "job_type": salary_info.get("schedule_type", ""),
                "category": "",
                "company_logo": item.get("thumbnail"),
            }
        except Exception as e:
            logger.warning("Failed to normalize SerpAPI job: %s", str(e))
            return None

    def _resolve_redirect_url(self, url: str) -> str:
        """Resolve redirect URL to get final destination (for Adzuna, etc.)."""
        if not url:
            return url
        try:
            response = self._session.head(url, allow_redirects=True, timeout=5)
            return response.url
        except Exception:
            return url  # Return original if resolution fails

    # -------------- Helper Methods --------------

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from job description using keyword matching."""
        text_lower = text.lower()
        
        # Common tech skills to look for
        skill_patterns = [
            "python", "java", "javascript", "typescript", "react", "angular", "vue",
            "node.js", "nodejs", "express", "django", "flask", "fastapi",
            "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
            "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
            "git", "ci/cd", "jenkins", "github actions",
            "machine learning", "deep learning", "tensorflow", "pytorch",
            "rest api", "graphql", "microservices",
            "agile", "scrum", "jira",
            "html", "css", "sass", "tailwind",
            "linux", "unix", "bash",
            "c++", "c#", ".net", "go", "golang", "rust",
            "swift", "kotlin", "flutter", "react native",
        ]
        
        found_skills = []
        for skill in skill_patterns:
            if skill in text_lower:
                found_skills.append(skill.title() if len(skill) > 3 else skill.upper())
        
        return list(set(found_skills))[:10]  # Dedupe and limit

    def _infer_experience_level(self, title: str, description: str) -> str:
        """Infer experience level from job title and description."""
        text = (title + " " + description).lower()
        
        if any(term in text for term in ["intern", "trainee", "fresher", "entry level", "junior", "graduate"]):
            return "0-2 years"
        elif any(term in text for term in ["senior", "lead", "principal", "architect", "staff"]):
            return "5+ years"
        elif any(term in text for term in ["mid", "intermediate", "2-5", "3-5"]):
            return "2-5 years"
        
        return "2-5 years"  # Default to mid-level

    # -------------- Stub Fetchers (fallback) --------------
    
    def _fetch_adzuna_stub(self, keywords: List[str], location: str) -> List[Dict[str, Any]]:
        """Stub data when Adzuna API is not configured."""
        return self._build_stub_jobs("adzuna", keywords, [
            "Software Engineer", "Backend Developer", "Data Analyst"
        ])

    def _fetch_jsearch_stub(self, keywords: List[str], location: str) -> List[Dict[str, Any]]:
        """Stub data when JSearch API is not configured."""
        return self._build_stub_jobs("jsearch", keywords, [
            "Full Stack Developer", "Machine Learning Engineer", "DevOps Engineer"
        ])

    def _build_stub_jobs(self, portal: str, keywords: List[str], titles: List[str]) -> List[Dict[str, Any]]:
        """Build stub job listings for testing."""
        skills = keywords[:5] if keywords else ["python", "sql", "communication"]
        jobs = []
        for idx, title in enumerate(titles):
            jobs.append({
                "title": title,
                "company": f"TechCompany{idx + 1}",
                "location": "Bangalore, India" if idx % 2 == 0 else "Remote",
                "description": f"Role focusing on {', '.join(skills)} and collaborative delivery.",
                "skills": skills,
                "redirect_url": f"https://{portal}.example/jobs/{idx}",
                "portal": portal,
                "posted_date": datetime.now().strftime("%Y-%m-%d"),
                "salary_min": None,
                "salary_max": None,
                "experience": "0-2 years" if idx == 0 else "2-5 years",
                "job_id": f"stub_{portal}_{idx}",
            })
        return jobs


__all__ = ["JobScraperService"]
