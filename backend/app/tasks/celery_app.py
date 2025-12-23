"""Celery application configuration"""

from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "applyx",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        'app.tasks.resume_tasks',
        'app.tasks.interview_tasks',
        'app.tasks.job_tasks',
        'app.tasks.scraping_tasks',
    ]
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',  # IST timezone
    enable_utc=False,  # Use local time
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Celery Beat schedule for automated tasks
celery_app.conf.beat_schedule = {
    # Scrape jobs daily at 6 AM IST (from free APIs)
    'scrape-and-store-jobs-daily': {
        'task': 'app.tasks.scraping_tasks.scrape_and_store_all_jobs',
        'schedule': crontab(hour=6, minute=0),
        'kwargs': {
            'keywords': ['software engineer', 'developer', 'data scientist', 'frontend', 'backend', 'marketing', 'sales', 'product manager'],
            'location': 'India'
        },
    },
    # Fetch Zyte spider results hourly and store in DB
    'fetch-zyte-jobs-hourly': {
        'task': 'app.tasks.scraping_tasks.fetch_all_zyte_completed_jobs',
        'schedule': crontab(minute=30),  # Run at :30 every hour
    },
}
