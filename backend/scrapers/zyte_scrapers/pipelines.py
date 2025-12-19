"""
Data processing pipelines for scraped job listings
"""

import json
import re
import hashlib
from datetime import datetime
from itemadapter import ItemAdapter


class DeduplicationPipeline:
    """Remove duplicate jobs based on title + company"""
    
    def __init__(self):
        self.seen_jobs = set()
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Create hash from title + company
        title = adapter.get('title', '').lower().strip()
        company = adapter.get('company', '').lower().strip()
        job_hash = hashlib.md5(f"{title}{company}".encode()).hexdigest()
        
        if job_hash in self.seen_jobs:
            spider.logger.info(f"Duplicate job found: {title} at {company}")
            from scrapy.exceptions import DropItem
            raise DropItem(f"Duplicate: {title}")
        
        self.seen_jobs.add(job_hash)
        adapter['job_id'] = job_hash
        return item


class DataCleaningPipeline:
    """Clean and normalize job data"""
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Clean text fields
        text_fields = ['title', 'company', 'location', 'description', 'requirements']
        for field in text_fields:
            if adapter.get(field):
                # Remove excess whitespace
                cleaned = ' '.join(adapter[field].split())
                # Remove special characters but keep basic punctuation
                cleaned = re.sub(r'[^\w\s.,!?()-]', '', cleaned)
                adapter[field] = cleaned.strip()
        
        # Normalize location
        if adapter.get('location'):
            location = adapter['location']
            # Extract city if format is "City, State, Country"
            if ',' in location:
                adapter['location'] = location.split(',')[0].strip()
        
        # Parse salary if present in description
        if not adapter.get('salary_min') and adapter.get('description'):
            salary_match = re.search(r'₹\s*(\d+(?:,\d+)*)\s*-\s*₹?\s*(\d+(?:,\d+)*)', adapter['description'])
            if salary_match:
                adapter['salary_min'] = int(salary_match.group(1).replace(',', ''))
                adapter['salary_max'] = int(salary_match.group(2).replace(',', ''))
                adapter['salary_currency'] = 'INR'
        
        # Detect remote/WFH
        desc_lower = adapter.get('description', '').lower()
        adapter['is_remote'] = 'remote' in desc_lower or 'work from home' in desc_lower
        adapter['work_from_home'] = 'wfh' in desc_lower or 'work from home' in desc_lower
        
        # Set scraped timestamp
        adapter['scraped_at'] = datetime.utcnow().isoformat()
        
        return item


class SkillExtractionPipeline:
    """Extract skills from job description"""
    
    # Common tech skills
    TECH_SKILLS = {
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go', 'rust',
        'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'spring', 'laravel',
        'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
        'git', 'github', 'gitlab', 'ci/cd', 'agile', 'scrum', 'jira',
        'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp',
        'html', 'css', 'sass', 'webpack', 'babel', 'rest api', 'graphql',
    }
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Combine description and requirements for skill extraction
        text = ' '.join(filter(None, [
            adapter.get('description', ''),
            adapter.get('requirements', '')
        ])).lower()
        
        # Extract skills
        found_skills = set()
        for skill in self.TECH_SKILLS:
            if skill in text:
                found_skills.add(skill)
        
        if found_skills:
            adapter['skills_required'] = list(found_skills)
        
        # Infer experience level from title
        title_lower = adapter.get('title', '').lower()
        if any(word in title_lower for word in ['senior', 'lead', 'principal', 'staff']):
            adapter['experience_level'] = 'senior'
        elif any(word in title_lower for word in ['junior', 'entry', 'fresher', 'graduate']):
            adapter['experience_level'] = 'entry'
        elif 'intern' in title_lower:
            adapter['experience_level'] = 'internship'
        else:
            adapter['experience_level'] = 'mid'
        
        return item


class JsonExportPipeline:
    """Export items to JSON file (for local testing)"""
    
    def open_spider(self, spider):
        self.file = open(f'{spider.name}_output.json', 'w', encoding='utf-8')
        self.file.write('[\n')
        self.first_item = True
    
    def close_spider(self, spider):
        self.file.write('\n]')
        self.file.close()
    
    def process_item(self, item, spider):
        if not self.first_item:
            self.file.write(',\n')
        else:
            self.first_item = False
        
        line = json.dumps(dict(item), indent=2, ensure_ascii=False)
        self.file.write(line)
        return item
