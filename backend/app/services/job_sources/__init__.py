"""
Job Source Integrations
=======================
Unified interface for fetching jobs from multiple job boards.

Supported Sources:
- Greenhouse (public job boards)
- Lever (public career pages)
- Workday (public career sites)
- SmartRecruiters (public job boards)
- Ashby (public career pages)
- Indeed (via RapidAPI)
- Glassdoor (via RapidAPI)
- SimplyHired (via JSearch API)
- LinkedIn (via RapidAPI - bonus)

Each source implements the JobSource protocol for consistent interface.
"""

from .base import JobSource, JobResult, RateLimiter, AggregatedJobSource
from .greenhouse import GreenhouseSource
from .lever import LeverSource
from .workday import WorkdaySource
from .smartrecruiters import SmartRecruitersSource
from .ashby import AshbySource
from .indeed import IndeedJobSource
from .glassdoor import GlassdoorJobSource
from .simplyhired import SimplyHiredJobSource, LinkedInJobSource

__all__ = [
    # Base classes
    "JobSource",
    "JobResult",
    "RateLimiter",
    "AggregatedJobSource",
    # ATS-based sources (free)
    "GreenhouseSource",
    "LeverSource",
    "WorkdaySource",
    "SmartRecruitersSource",
    "AshbySource",
    # Job board APIs (RapidAPI)
    "IndeedJobSource",
    "GlassdoorJobSource",
    "SimplyHiredJobSource",
    "LinkedInJobSource",
]
