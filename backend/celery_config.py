"""
Celery configuration for automated engineering job scraping
Focus: SDE, DevOps, QA, Backend, Frontend, Fullstack, Data Engineering
"""

from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Initialize Celery
celery_app = Celery(
    'applyx',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',
    enable_utc=False,
)

# Engineering-specific keywords (NO HR, Sales, Marketing, etc.)
ENGINEERING_KEYWORDS = [
    'software engineer',
    'backend developer',
    'frontend developer', 
    'fullstack developer',
    'devops engineer',
    'qa engineer',
    'sde',
    'data engineer',
    'python developer',
    'react developer',
    'node.js developer',
]

# Schedule for automated scraping (Daily at 2 AM IST)
celery_app.conf.beat_schedule = {
    # LinkedIn: 10 jobs/day (5 credits each = 50 credits/day)
    'scrape-linkedin-engineering-jobs': {
        'task': 'app.tasks.scraping_tasks.scrape_linkedin_jobs',
        'schedule': crontab(hour=2, minute=0),  # 2:00 AM IST
        'kwargs': {
            'keywords': ENGINEERING_KEYWORDS[:2],  # 2 keywords
            'job_count': 10
        }
    },
    
    # Indeed: 50 jobs/day (1 credit each = 50 credits/day)
    'scrape-indeed-engineering-jobs': {
        'task': 'app.tasks.scraping_tasks.scrape_indeed_jobs',
        'schedule': crontab(hour=2, minute=30),  # 2:30 AM IST
        'kwargs': {
            'keywords': ENGINEERING_KEYWORDS[2:7],  # 5 keywords
            'job_count': 50
        }
    },
    
    # Naukri: 10 jobs/day (1 credit each = 10 credits/day)
    'scrape-naukri-engineering-jobs': {
        'task': 'app.tasks.scraping_tasks.scrape_naukri_jobs',
        'schedule': crontab(hour=3, minute=0),  # 3:00 AM IST
        'kwargs': {
            'keywords': ENGINEERING_KEYWORDS[7:9],  # 2 keywords
            'job_count': 10
        }
    }
}

# Total: 70 jobs/day × 14 days = 980 jobs (110 credits/day × 14 = 1540 credits)
# Note: Exceeds 1000 limit slightly, will adjust if needed
