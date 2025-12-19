"""
LinkedIn Jobs Spider using Zyte API
Scrapes job listings from LinkedIn India
"""

import scrapy
from urllib.parse import urlencode
from zyte_scrapers.items import JobItem
from datetime import datetime


class LinkedInSpider(scrapy.Spider):
    name = 'linkedin'
    allowed_domains = ['linkedin.com']
    
    # Custom settings for LinkedIn
    custom_settings = {
        'ZYTE_API_DEFAULT_PARAMS': { 'browserHtml': True,
            'geolocation': 'IN',
            'javascript': True,  # LinkedIn is JavaScript-heavy
        },
        'CONCURRENT_REQUESTS': 50,
    }
    
    def __init__(self, keywords='software engineer', location='India', *args, **kwargs):
        super(LinkedInSpider, self).__init__(*args, **kwargs)
        self.keywords = keywords
        self.location = location
        self.start_urls = [self._build_search_url(keywords, location)]
    
    def _build_search_url(self, keywords, location):
        """Build LinkedIn job search URL"""
        params = {
            'keywords': keywords,
            'location': location,
            'f_TPR': 'r86400',  # Posted in last 24 hours
            'position': 1,
            'pageNum': 0
        }
        return f"https://www.linkedin.com/jobs/search/?{urlencode(params)}"
    
    def parse(self, response):
        """Parse job listing page"""
        # Extract job cards
        job_cards = response.css('div.base-card')
        
        for card in job_cards:
            job_url = card.css('a.base-card__full-link::attr(href)').get()
            if job_url:
                yield scrapy.Request(
                    job_url,
                    callback=self.parse_job,
                    meta={'dont_redirect': True}
                )
        
        # Follow pagination
        next_page = response.css('button[aria-label="View next page"]::attr(data-page-number)').get()
        if next_page:
            params = {
                'keywords': self.keywords,
                'location': self.location,
                'start': int(next_page) * 25
            }
            next_url = f"https://www.linkedin.com/jobs/search/?{urlencode(params)}"
            yield scrapy.Request(next_url, callback=self.parse)
    
    def parse_job(self, response):
        """Parse individual job page"""
        job = JobItem()
        
        # Basic info
        job['title'] = response.css('h1.top-card-layout__title::text').get('').strip()
        job['company'] = response.css('a.topcard__org-name-link::text').get('').strip()
        job['location'] = response.css('span.topcard__flavor--bullet::text').get('').strip()
        
        # Job description
        description = response.css('div.description__text').get('')
        job['description'] = self._clean_html(description)
        
        # Extract requirements from description
        if 'requirements' in description.lower():
            job['requirements'] = self._extract_section(description, 'requirements')
        
        # Employment type
        job_type = response.css('span.description__job-criteria-text::text').get('')
        job['employment_type'] = self._normalize_job_type(job_type)
        
        # Salary (if available)
        salary_text = response.css('div.salary::text').get('')
        if salary_text:
            job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)
            job['salary_currency'] = 'INR'
        
        # Meta
        job['source'] = 'linkedin'
        job['source_url'] = response.url
        job['apply_url'] = response.css('a.apply-button::attr(href)').get() or response.url
        job['posted_date'] = self._extract_posted_date(response)
        job['scraped_at'] = datetime.utcnow().isoformat()
        
        # Company details (if available)
        job['company_size'] = response.css('li.company-size::text').get('')
        job['company_industry'] = response.css('li.company-industry::text').get('')
        
        yield job
    
    def _clean_html(self, html_text):
        """Remove HTML tags and clean text"""
        import re
        text = re.sub('<[^<]+?>', '', html_text)
        return ' '.join(text.split()).strip()
    
    def _extract_section(self, text, section_name):
        """Extract specific section from job description"""
        import re
        pattern = f'{section_name}:?(.*?)(?:responsibilities|qualifications|benefits|$)'
        match = re.search(pattern, text.lower(), re.DOTALL)
        return match.group(1).strip() if match else ''
    
    def _normalize_job_type(self, job_type_text):
        """Normalize employment type"""
        job_type_text = job_type_text.lower()
        if 'full' in job_type_text:
            return 'full-time'
        elif 'part' in job_type_text:
            return 'part-time'
        elif 'contract' in job_type_text:
            return 'contract'
        elif 'intern' in job_type_text:
            return 'internship'
        return 'full-time'
    
    def _parse_salary(self, salary_text):
        """Parse salary range from text"""
        import re
        # Match patterns like "₹5,00,000 - ₹8,00,000"
        match = re.search(r'₹\s*(\d+(?:,\d+)*)\s*-\s*₹?\s*(\d+(?:,\d+)*)', salary_text)
        if match:
            min_sal = int(match.group(1).replace(',', ''))
            max_sal = int(match.group(2).replace(',', ''))
            return min_sal, max_sal
        return None, None
    
    def _extract_posted_date(self, response):
        """Extract when job was posted"""
        posted_text = response.css('span.posted-time-ago__text::text').get('')
        # Convert relative time to approximate date
        # This is a simplified version
        return posted_text.strip()
