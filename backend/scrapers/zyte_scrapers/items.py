"""
Scrapy Item definitions for ApplyX job listings
"""

import scrapy
from datetime import datetime


class JobItem(scrapy.Item):
    """Job listing item with all relevant fields"""
    
    # Unique identifier
    job_id = scrapy.Field()
    
    # Basic info
    title = scrapy.Field()
    company = scrapy.Field()
    location = scrapy.Field()
    
    # Job details
    description = scrapy.Field()
    requirements = scrapy.Field()
    responsibilities = scrapy.Field()
    
    # Compensation & benefits
    salary_min = scrapy.Field()
    salary_max = scrapy.Field()
    salary_currency = scrapy.Field()
    benefits = scrapy.Field()
    
    # Employment details
    employment_type = scrapy.Field()  # full-time, part-time, contract, internship
    experience_min = scrapy.Field()   # years
    experience_max = scrapy.Field()   # years
    experience_level = scrapy.Field()  # entry, mid, senior, executive
    
    # Skills & qualifications
    skills_required = scrapy.Field()  # list
    skills_preferred = scrapy.Field()  # list
    education_required = scrapy.Field()
    certifications = scrapy.Field()  # list
    
    # Application details
    apply_url = scrapy.Field()
    apply_email = scrapy.Field()
    application_deadline = scrapy.Field()
    
    # Meta information
    source = scrapy.Field()  # linkedin, indeed, naukri, etc.
    source_url = scrapy.Field()
    posted_date = scrapy.Field()
    scraped_at = scrapy.Field()
    
    # Company details
    company_size = scrapy.Field()
    company_industry = scrapy.Field()
    company_website = scrapy.Field()
    company_rating = scrapy.Field()
    
    # Additional
    is_remote = scrapy.Field()  # bool
    work_from_home = scrapy.Field()  # bool
    relocation_assistance = scrapy.Field()  # bool
    visa_sponsorship = scrapy.Field()  # bool
    
    def __repr__(self):
        return f"JobItem(title='{self.get('title')}', company='{self.get('company')}')"
