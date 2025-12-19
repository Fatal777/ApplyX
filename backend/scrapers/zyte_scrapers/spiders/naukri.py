"""
Naukri.com Jobs Spider using Zyte API
India's largest job portal
"""

import scrapy
from urllib.parse import quote_plus
from zyte_scrapers.items import JobItem
from datetime import datetime


class NaukriSpider(scrapy.Spider):
    name = 'naukri'
    allowed_domains = ['naukri.com']
    
    custom_settings = {
        'CONCURRENT_REQUESTS': 100,  # Naukri can handle high concurrency
        'ZYTE_API_DEFAULT_PARAMS': {
            'browserHtml': True,
            'geolocation': 'IN',
        },
    }
    
    def __init__(self, keywords='software engineer', location='india', *args, **kwargs):
        super(NaukriSpider, self).__init__(*args, **kwargs)
        self.keywords = keywords
        self.location = location
        self.start_urls = [self._build_search_url(keywords, location)]
    
    def _build_search_url(self, keywords, location, page=1):
        """Build Naukri search URL"""
        # Naukri URL pattern: https://www.naukri.com/{keywords}-jobs-in-{location}
        keywords_slug = keywords.replace(' ', '-')
        location_slug = location.replace(' ', '-').lower()
        return f"https://www.naukri.com/{keywords_slug}-jobs-in-{location_slug}?k={quote_plus(keywords)}&l={quote_plus(location)}&p={page}"
    
    def parse(self, response):
        """Parse job listing page"""
        # Naukri job articles
        job_articles = response.css('article.jobTuple')
        
        for article in job_articles:
            # Get job title link
            title_elem = article.css('a.title::attr(href)').get()
            job_url = response.urljoin(title_elem) if title_elem else None
            
            if job_url:
                # Extract preview data from listing
                preview_data = {
                    'title': article.css('a.title::text').get('').strip(),
                    'company': article.css('a.comp-name::text').get('').strip(),
                    'experience': article.css('span.exp::text').get(''),
                    'salary': article.css('span.sal::text').get(''),
                    'location': article.css('span.loc::text').get('').strip(),
                    'tags': article.css('span.tag::text').getall(),
                }
                
                yield scrapy.Request(
                    job_url,
                    callback=self.parse_job,
                    meta={'preview_data': preview_data}
                )
        
        # Pagination
        next_page = response.css('a.fright::attr(href)').get()
        if next_page and 'next' in response.css('a.fright::text').get('').lower():
            yield response.follow(next_page, callback=self.parse)
    
    def parse_job(self, response):
        """Parse individual job page"""
        job = JobItem()
        preview = response.meta.get('preview_data', {})
        
        # Basic info (prefer page data over preview)
        job['title'] = response.css('h1.jd-header-title::text').get() or preview.get('title', '')
        job['company'] = response.css('a.pad-rt-8::text').get() or preview.get('company', '')
        job['location'] = response.css('span.loc::text').get() or preview.get('location', '')
        
        # Job description
        desc_section = response.css('div.job-desc')
        job['description'] = ' '.join(desc_section.css('::text').getall()).strip()
        
        # Experience
        exp_text = response.css('span.exp::text').get() or preview.get('experience', '')
        job['experience_min'], job['experience_max'] = self._parse_experience(exp_text)
        
        # Salary
        salary_text = response.css('span.salary::text').get() or preview.get('salary', '')
        if salary_text and 'not disclosed' not in salary_text.lower():
            job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)
            job['salary_currency'] = 'INR'
        
        # Skills from tags
        skills_tags = response.css('a.chip::text').getall() or preview.get('tags', [])
        if skills_tags:
            job['skills_required'] = [s.strip().lower() for s in skills_tags]
        
        # Company details
        job['company_rating'] = response.css('span.rating::text').get()
        job['company_size'] = response.css('a[href*="company-"]::text').re_first(r'(\d+\+?\s*(?:employees)?)')
        
        # Employment type from keywords in description
        desc_lower = job['description'].lower()
        if 'full time' in desc_lower or 'full-time' in desc_lower:
            job['employment_type'] = 'full-time'
        elif 'internship' in desc_lower or 'intern' in desc_lower:
            job['employment_type'] = 'internship'
        else:
            job['employment_type'] = 'full-time'  # default
        
        # Meta
        job['source'] = 'naukri'
        job['source_url'] = response.url
        job['apply_url'] = response.url
        job['scraped_at'] = datetime.utcnow().isoformat()
        
        yield job
    
    def _parse_experience(self, exp_text):
        """Parse experience range like '3-5 Yrs'"""
        import re
        match = re.search(r'(\d+)\s*-\s*(\d+)', exp_text)
        if match:
            return int(match.group(1)), int(match.group(2))
        match = re.search(r'(\d+)', exp_text)
        if match:
            exp = int(match.group(1))
            return exp, exp
        return None, None
    
    def _parse_salary(self, salary_text):
        """Parse salary from Naukri format"""
        import re
        # "3,00,000 - 6,00,000 PA" or "5-8 Lacs PA"
        lacs_match = re.search(r'(\d+)\s*-\s*(\d+)\s*lacs?', salary_text, re.I)
        if lacs_match:
            return int(lacs_match.group(1)) * 100000, int(lacs_match.group(2)) * 100000
        
        rupee_match = re.search(r'₹?\s*(\d+(?:,\d+)*)\s*-\s*₹?\s*(\d+(?:,\d+)*)', salary_text)
        if rupee_match:
            return int(rupee_match.group(1).replace(',', '')), int(rupee_match.group(2).replace(',', ''))
        
        return None, None
