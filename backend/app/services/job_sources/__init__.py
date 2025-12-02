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

Each source implements the JobSource protocol for consistent interface.
"""

from .base import JobSource, JobResult, RateLimiter
from .greenhouse import GreenhouseSource
from .lever import LeverSource
from .workday import WorkdaySource
from .smartrecruiters import SmartRecruitersSource
from .ashby import AshbySource

__all__ = [
    "JobSource",
    "JobResult",
    "RateLimiter",
    "GreenhouseSource",
    "LeverSource",
    "WorkdaySource",
    "SmartRecruitersSource",
    "AshbySource",
]
