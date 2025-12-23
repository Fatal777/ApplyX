"""
Celery tasks for automated engineering job scraping
Filters: Software Engineering roles ONLY (no HR, Sales, Marketing, etc.)
"""

import logging
import requests
from celery import shared_task
from typing import List
from app.core.config import settings
from app.db.database import SessionLocal
from app.models.job import Job
from datetime import datetime

logger = logging.getLogger(__name__)

# Engineering-related titles to ACCEPT
ENGINEERING_TITLES = [
    'engineer', 'developer', 'sde', 'programmer', 'devops', 'architect',
    'qa', 'tester', 'full stack', 'backend', 'frontend', 'data engineer',
    'ml engineer', 'ai engineer', 'software', 'tech lead', 'cto'
]

# Non-engineering titles to REJECT
REJECTED_TITLES = [
    'hr', 'recruiter', 'sales', 'marketing', 'business development',
    'account manager', 'customer success', 'product manager', 'designer',
    'content writer', 'seo',' finance', 'accountant', 'admin'
]


def is_engineering_job(title: str) -> bool:
    """Filter to accept only engineering jobs"""
    title_lower = title.lower()
    
    # Reject non-engineering titles
    if any(reject in title_lower for reject in REJECTED_TITLES):
        return False
    
    # Accept engineering titles
    return any(eng in title_lower for eng in ENGINEERING_TITLES)


@shared_task(name='app.tasks.scraping_tasks.scrape_linkedin_jobs')
def scrape_linkedin_jobs(keywords: List[str], job_count: int = 10):
    """Trigger LinkedIn spider for engineering jobs"""
    logger.info(f"Starting LinkedIn engineering job scrape: {job_count} jobs")
    
    url = "https://app.zyte.com/api/schedule.json"
    
    for keyword in keywords:
        data = {
            "project": "840796",
            "spider": "linkedin",
            "keywords": keyword,
            "location": "India",
        }
        
        try:
            response = requests.post(url, json=data, auth=(settings.ZYTE_API_KEY, ""))
            if response.status_code == 200:
                job_id = response.json().get('jobid')
                logger.info(f"LinkedIn spider scheduled: {job_id} for '{keyword}'")
            else:
                logger.error(f"Failed to schedule LinkedIn: {response.text}")
        except Exception as e:
            logger.error(f"Error scheduling LinkedIn: {str(e)}")
    
    return {"status": "triggered", "spider": "linkedin", "keywords": keywords}


@shared_task(name='app.tasks.scraping_tasks.scrape_indeed_jobs')
def scrape_indeed_jobs(keywords: List[str], job_count: int = 50):
    """Trigger Indeed spider for engineering jobs"""
    logger.info(f"Starting Indeed engineering job scrape: {job_count} jobs")
    
    url = "https://app.zyte.com/api/schedule.json"
    
    for keyword in keywords:
        data = {
            "project": "840796",
            "spider": "indeed",
            "keywords": keyword,
            "location": "India",
        }
        
        try:
            response = requests.post(url, json=data, auth=(settings.ZYTE_API_KEY, ""))
            if response.status_code == 200:
                job_id = response.json().get('jobid')
                logger.info(f"Indeed spider scheduled: {job_id} for '{keyword}'")
            else:
                logger.error(f"Failed to schedule Indeed: {response.text}")
        except Exception as e:
            logger.error(f"Error scheduling Indeed: {str(e)}")
    
    return {"status": "triggered", "spider": "indeed", "keywords": keywords}


@shared_task(name='app.tasks.scraping_tasks.scrape_naukri_jobs')
def scrape_naukri_jobs(keywords: List[str], job_count: int = 10):
    """Trigger Naukri spider for engineering jobs"""
    logger.info(f"Starting Naukri engineering job scrape: {job_count} jobs")
    
    url = "https://app.zyte.com/api/schedule.json"
    
    for keyword in keywords:
        data = {
            "project": "840796",
            "spider": "naukri",
            "keywords": keyword,
            "location": "India",
        }
        
        try:
            response = requests.post(url, json=data, auth=(settings.ZYTE_API_KEY, ""))
            if response.status_code == 200:
                job_id = response.json().get('jobid')
                logger.info(f"Naukri spider scheduled: {job_id} for '{keyword}'")
            else:
                logger.error(f"Failed to schedule Naukri: {response.text}")
        except Exception as e:
            logger.error(f"Error scheduling Naukri: {str(e)}")
    
    return {"status": "triggered", "spider": "naukri", "keywords": keywords}


@shared_task(name='app.tasks.scraping_tasks.fetch_and_store_jobs')
def fetch_and_store_jobs(job_id: str):
    """
    Fetch scraped jobs from Scrapy Cloud and store ONLY engineering jobs in database
    """
    logger.info(f"Fetching and filtering engineering jobs for: {job_id}")
    
    url = f"https://storage.scrapinghub.com/items/{job_id}"
    
    try:
        response = requests.get(url, auth=(settings.ZYTE_API_KEY, ""))
        
        if response.status_code == 200:
            jobs_data = response.json()
            db = SessionLocal()
            
            stored_count = 0
            filtered_count = 0
            
            for job_data in jobs_data:
                title = job_data.get('title', '')
                
                # Filter: Accept ONLY engineering jobs
                if not is_engineering_job(title):
                    filtered_count += 1
                    logger.info(f"Filtered out non-engineering job: {title}")
                    continue
                
                try:
                    job = Job(
                        title=title,
                        company=job_data.get('company'),
                        location=job_data.get('location'),
                        description=job_data.get('description'),
                        requirements=job_data.get('requirements'),
                        salary_min=job_data.get('salary_min'),
                        salary_max=job_data.get('salary_max'),
                        salary_currency=job_data.get('salary_currency', 'INR'),
                        employment_type=job_data.get('employment_type'),
                        skills_required=job_data.get('skills_required', []),
                        source=job_data.get('source'),
                        source_url=job_data.get('source_url'),
                        apply_url=job_data.get('apply_url'),
                        posted_date=job_data.get('posted_date'),
                        scraped_at=datetime.utcnow(),
                        is_active=True
                    )
                    
                    db.add(job)
                    stored_count += 1
                except Exception as e:
                    logger.error(f"Error storing job: {str(e)}")
                    continue
            
            db.commit()
            db.close()
            
            logger.info(f"Stored {stored_count} engineering jobs, filtered {filtered_count} non-engineering")
            return {"status": "success", "stored": stored_count, "filtered": filtered_count}
        else:
            logger.error(f"Failed to fetch jobs: {response.status_code}")
            return {"status": "error", "message": response.text}
            
    except Exception as e:
        logger.error(f"Error fetching/storing jobs: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task(name='app.tasks.scraping_tasks.scrape_and_store_all_jobs')
def scrape_and_store_all_jobs(keywords: List[str] = None, location: str = "India"):
    """
    Daily automated task: Fetch jobs from all free APIs and store engineering jobs in database.
    Runs at 6 AM IST daily via Celery Beat.
    """
    from app.services.job_scraper_service import JobScraperService
    
    if keywords is None:
        keywords = ['software engineer', 'developer', 'data scientist', 'frontend', 'backend']
    
    logger.info(f"Starting daily job scrape: keywords={keywords}, location={location}")
    
    scraper = JobScraperService()
    db = SessionLocal()
    
    total_fetched = 0
    total_stored = 0
    total_filtered = 0
    total_duplicates = 0
    
    # Fetch from all portals
    all_jobs = scraper.fetch_all_portals(keywords, location)
    total_fetched = len(all_jobs)
    
    logger.info(f"Fetched {total_fetched} jobs from all portals")
    
    # Store jobs in database with deduplication
    for job_data in all_jobs:
        title = job_data.get('title', '')
        
        # Filter: Accept ONLY engineering jobs
        if not is_engineering_job(title):
            total_filtered += 1
            continue
        
        # Check for duplicates by URL or title+company combo
        redirect_url = job_data.get('redirect_url', '')
        company = job_data.get('company', '')
        
        existing = db.query(Job).filter(
            (Job.source_url == redirect_url) | 
            ((Job.title == title) & (Job.company == company))
        ).first()
        
        if existing:
            total_duplicates += 1
            continue
        
        try:
            # Parse posted date
            posted_date_str = job_data.get('posted_date', '')
            posted_date = None
            if posted_date_str:
                try:
                    posted_date = datetime.strptime(posted_date_str[:10], '%Y-%m-%d')
                except:
                    pass
            
            job = Job(
                title=title,
                company=company,
                location=job_data.get('location', location),
                description=job_data.get('description', ''),
                requirements=None,
                salary_min=job_data.get('salary_min'),
                salary_max=job_data.get('salary_max'),
                salary_currency='INR',
                employment_type=job_data.get('job_type'),
                skills_required=job_data.get('skills', []),
                source=job_data.get('portal', 'api'),
                source_url=redirect_url,
                apply_url=redirect_url,
                posted_date=posted_date,
                scraped_at=datetime.utcnow(),
                is_active=True
            )
            
            db.add(job)
            total_stored += 1
        except Exception as e:
            logger.error(f"Error storing job '{title}': {str(e)}")
            continue
    
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Error committing jobs: {str(e)}")
        db.rollback()
    finally:
        db.close()
    
    result = {
        "status": "success",
        "fetched": total_fetched,
        "stored": total_stored,
        "filtered": total_filtered,
        "duplicates": total_duplicates,
        "keywords": keywords,
        "location": location,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    logger.info(f"Daily scrape complete: {result}")
    return result
