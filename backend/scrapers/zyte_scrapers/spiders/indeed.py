"""
Indeed India Jobs Spider using Zyte API
"""

import scrapy
from urllib.parse import urlencode, quote_plus
from zyte_scrapers.items import JobItem
from datetime import datetime


class IndeedSpider(scrapy.Spider):
    name = 'indeed'
    allowed_domains = ['in.indeed.com']
    
    custom_settings = {
        'CONCURRENT_REQUESTS': 80,
        'ZYTE_API_DEFAULT_PARAMS': {
            'browserHtml': True,
            'geolocation': 'IN',
        },
    }
    
    def __init__(self, keywords='software engineer', location='India', *args, **kwargs):
        super(IndeedSpider, self).__init__(*args, **kwargs)
        self.keywords = keywords
        self.location = location
        self.start_urls = [self._build_search_url(keywords, location)]
    
    def _build_search_url(self, keywords, location, start=0):
        """Build Indeed search URL"""
        params = {
            'q': keywords,
            'l': location,
            'start': start,
            'fromage': '7',  # Last 7 days
        }
        return f"https://in.indeed.com/jobs?{urlencode(params)}"
    
    def parse(self, response):
        """Parse job listing page"""
        # Indeed job cards
        job_cards = response.css('div.job_seen_beacon')
        
        for card in job_cards:
            # Extract job key
            job_key = card.css('::attr(data-jk)').get()
            if job_key:
                job_url = f"https://in.indeed.com/viewjob?jk={job_key}"
                yield scrapy.Request(job_url, callback=self.parse_job)
        
        # Pagination
        next_page = response.css('a[data-testid="pagination-page-next"]::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
    
    def parse_job(self, response):
        """Parse job details"""
        job = JobItem()
        
        job['title'] = response.css('h1.jobsearch-JobInfoHeader-title span::text').get('').strip()
        job['company'] = response.css('div[data-company-name="true"] a::text').get('').strip()
        job['location'] = response.css('div[data-testid="inlineHeader-companyLocation"] div::text').get('').strip()
        
        # Description from rich text div
        desc_div = response.css('div#jobDescriptionText')
        job['description'] = ' '.join(desc_div.css('::text').getall()).strip()
        
        # Salary if present
        salary = response.css('div#salaryInfoAndJobType span::text').get()
        if salary:
            job['salary_min'], job['salary_max'] = self._parse_salary(salary)
            job['salary_currency'] = 'INR'
        
        # Job type
        job_type = response.css('div#salaryInfoAndJobType div::text').getall()
        for jt in job_type:
            if any(x in jt.lower() for x in ['full', 'part', 'contract', 'temporary']):
                job['employment_type'] = jt.strip().lower()
                break
        
        # Meta
        job['source'] = 'indeed'
        job['source_url'] = response.url
        job['apply_url'] = response.url
        job['scraped_at'] = datetime.utcnow().isoformat()
        
        yield job
    
    def _parse_salary(self, salary_text):
        """Parse salary from Indeed format"""
        import re
        # Match patterns like "₹3,00,000 - ₹6,00,000 a year"
        match = re.search(r'₹\s*(\d+(?:,\d+)*)\s*-\s*₹?\s*(\d+(?:,\d+)*)', salary_text)
        if match:
            return int(match.group(1).replace(',', '')), int(match.group(2).replace(',', ''))
        # Single salary "₹5,00,000"
        match = re.search(r'₹\s*(\d+(?:,\d+)*)', salary_text)
        if match:
            sal = int(match.group(1).replace(',', ''))
            return sal, sal
        return None, None
