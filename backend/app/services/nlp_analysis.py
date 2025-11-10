"""NLP analysis service for resume parsing and scoring"""

import logging
from typing import Dict, List, Any, Tuple
import re
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
import nltk
from collections import Counter

logger = logging.getLogger(__name__)

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
except:
    pass


class NLPAnalysisService:
    """Service for NLP-based resume analysis"""
    
    def __init__(self):
        try:
            # Load spaCy model (use small model for free tier)
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None
    
    def extract_keywords(self, text: str, top_n: int = None) -> List[str]:
        """Extract all important keywords using TF-IDF (no limit by default)"""
        try:
            # Use TF-IDF to extract important terms
            vectorizer = TfidfVectorizer(
                max_features=top_n if top_n else None,  # No limit if top_n is None
                stop_words='english',
                ngram_range=(1, 2),
                min_df=1  # Include all terms
            )
            
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            
            # Get scores
            scores = tfidf_matrix.toarray()[0]
            keyword_scores = list(zip(feature_names, scores))
            keyword_scores.sort(key=lambda x: x[1], reverse=True)
            
            keywords = [kw for kw, score in keyword_scores if score > 0]
            logger.info(f"Extracted {len(keywords)} keywords")
            return keywords
            
        except Exception as e:
            logger.error(f"Keyword extraction error: {str(e)}")
            return []
    
    def identify_sections(self, text: str) -> Dict[str, str]:
        """Identify resume sections (Education, Experience, Skills, etc.)"""
        sections = {}
        
        # Common section headers
        section_patterns = {
            'education': r'(?i)(education|academic|qualification|degree)',
            'experience': r'(?i)(experience|employment|work history|professional)',
            'skills': r'(?i)(skills|technical skills|competencies|expertise)',
            'summary': r'(?i)(summary|objective|profile|about)',
            'certifications': r'(?i)(certification|certificate|license)',
            'projects': r'(?i)(projects|portfolio)',
            'awards': r'(?i)(awards|achievements|honors)',
        }
        
        lines = text.split('\n')
        current_section = None
        section_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line is a section header
            is_header = False
            for section_name, pattern in section_patterns.items():
                if re.search(pattern, line) and len(line) < 50:
                    # Save previous section
                    if current_section and section_content:
                        sections[current_section] = '\n'.join(section_content)
                    
                    # Start new section
                    current_section = section_name
                    section_content = []
                    is_header = True
                    break
            
            if not is_header and current_section:
                section_content.append(line)
        
        # Save last section
        if current_section and section_content:
            sections[current_section] = '\n'.join(section_content)
        
        logger.info(f"Identified {len(sections)} sections")
        return sections
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract technical and soft skills"""
        skills = set()
        
        # Common technical skills
        tech_skills = [
            'python', 'java', 'javascript', 'c++', 'c#', 'ruby', 'php', 'swift',
            'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'spring',
            'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
            'git', 'agile', 'scrum', 'ci/cd', 'devops',
            'machine learning', 'deep learning', 'ai', 'data science',
            'html', 'css', 'typescript', 'rest api', 'graphql'
        ]
        
        # Common soft skills
        soft_skills = [
            'leadership', 'communication', 'teamwork', 'problem solving',
            'analytical', 'creative', 'management', 'organization'
        ]
        
        text_lower = text.lower()
        
        # Find technical skills
        for skill in tech_skills:
            if skill in text_lower:
                skills.add(skill.title())
        
        # Find soft skills
        for skill in soft_skills:
            if skill in text_lower:
                skills.add(skill.title())
        
        # Use spaCy for additional entity extraction
        if self.nlp:
            doc = self.nlp(text[:100000])  # Limit text length
            for ent in doc.ents:
                if ent.label_ in ['ORG', 'PRODUCT', 'SKILL']:
                    skills.add(ent.text)
        
        logger.info(f"Extracted {len(skills)} skills")
        return sorted(list(skills))
    
    def extract_experience(self, text: str) -> List[Dict[str, Any]]:
        """Extract work experience entries"""
        experiences = []
        
        # Pattern for dates (e.g., "2020-2023", "Jan 2020 - Present")
        date_pattern = r'\b(\d{4}|\w{3,9}\s+\d{4})\s*[-–—to]+\s*(\d{4}|\w{3,9}\s+\d{4}|present|current)\b'
        
        # Find potential experience entries
        lines = text.split('\n')
        current_exp = {}
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Look for date ranges
            date_match = re.search(date_pattern, line, re.IGNORECASE)
            if date_match:
                if current_exp:
                    experiences.append(current_exp)
                
                current_exp = {
                    'period': date_match.group(0),
                    'title': line.replace(date_match.group(0), '').strip(),
                    'description': []
                }
            elif current_exp and line.startswith(('•', '-', '*')):
                current_exp['description'].append(line[1:].strip())
        
        if current_exp:
            experiences.append(current_exp)
        
        logger.info(f"Extracted {len(experiences)} experience entries")
        return experiences
    
    def extract_education(self, text: str) -> List[Dict[str, Any]]:
        """Extract education entries"""
        education = []
        
        # Common degree patterns
        degree_patterns = [
            r'\b(bachelor|master|phd|doctorate|associate|diploma|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba)\b',
        ]
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            for pattern in degree_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    education.append({
                        'degree': line,
                        'institution': ''
                    })
                    break
        
        logger.info(f"Extracted {len(education)} education entries")
        return education
    
    def calculate_completeness_score(self, sections: Dict[str, str], text: str) -> float:
        """Calculate resume completeness score based on sections and content quality"""
        required_sections = ['education', 'experience', 'skills']
        optional_sections = ['summary', 'certifications', 'projects']
        
        score = 0.0
        
        # Required sections (70% weight)
        for section in required_sections:
            if section in sections:
                content_length = len(sections[section])
                if content_length > 200:  # Substantial content
                    score += 23.33
                elif content_length > 100:
                    score += 18.0
                elif content_length > 50:
                    score += 12.0
        
        # Optional sections (30% weight)
        for section in optional_sections:
            if section in sections and len(sections[section]) > 30:
                score += 10.0
        
        # Bonus for well-structured content
        if len(text) > 500:  # Minimum length
            score += 5.0
        if len(text.split('\n')) > 20:  # Good formatting
            score += 5.0
        
        return min(score, 100.0)
    
    def calculate_keyword_density(self, keywords: List[str], text: str) -> float:
        """Calculate keyword density score"""
        if not keywords:
            return 0.0
        
        text_lower = text.lower()
        total_words = len(text.split())
        keyword_count = sum(text_lower.count(kw.lower()) for kw in keywords)
        
        # Optimal density is 2-5%
        density = (keyword_count / total_words) * 100 if total_words > 0 else 0
        
        if 2 <= density <= 5:
            score = 100.0
        elif density < 2:
            score = (density / 2) * 100
        else:
            score = max(0, 100 - (density - 5) * 10)
        
        return min(score, 100.0)
    
    def calculate_ats_score(self, text: str, keywords: List[str], sections: Dict[str, str], skills: List[str]) -> float:
        """Calculate strict ATS compatibility score based on specific criteria"""
        score = 100.0  # Start with perfect score and deduct for issues
        penalties = []
        
        # CRITICAL: Standard section headers (deduct up to 30 points)
        standard_sections = ['education', 'experience', 'skills']
        missing_sections = [s for s in standard_sections if s not in sections]
        if missing_sections:
            penalty = len(missing_sections) * 10
            score -= penalty
            penalties.append(f"Missing sections: {', '.join(missing_sections)} (-{penalty})")
        
        # CRITICAL: Minimum content length (deduct up to 20 points)
        if len(text) < 500:
            score -= 20
            penalties.append("Resume too short (<500 chars) (-20)")
        elif len(text) < 1000:
            score -= 10
            penalties.append("Resume short (<1000 chars) (-10)")
        
        # Formatting issues (deduct up to 15 points)
        if re.search(r'[\t]{2,}', text):  # Excessive tabs
            score -= 5
            penalties.append("Excessive tabs (-5)")
        if re.search(r'[\n]{4,}', text):  # Excessive line breaks
            score -= 5
            penalties.append("Excessive line breaks (-5)")
        if re.search(r'[^\x00-\x7F]{10,}', text):  # Too many special characters
            score -= 5
            penalties.append("Too many special characters (-5)")
        
        # Keywords criteria (deduct up to 20 points)
        if len(keywords) < 5:
            score -= 20
            penalties.append(f"Very few keywords ({len(keywords)}) (-20)")
        elif len(keywords) < 10:
            score -= 10
            penalties.append(f"Few keywords ({len(keywords)}) (-10)")
        elif len(keywords) < 15:
            score -= 5
            penalties.append(f"Below optimal keywords ({len(keywords)}) (-5)")
        
        # Skills criteria (deduct up to 15 points)
        if len(skills) < 3:
            score -= 15
            penalties.append(f"Very few skills ({len(skills)}) (-15)")
        elif len(skills) < 5:
            score -= 10
            penalties.append(f"Few skills ({len(skills)}) (-10)")
        elif len(skills) < 8:
            score -= 5
            penalties.append(f"Below optimal skills ({len(skills)}) (-5)")
        
        # Quantifiable achievements (deduct up to 10 points)
        numbers = re.findall(r'\b\d+[%$]?\b', text)
        if len(numbers) < 3:
            score -= 10
            penalties.append(f"No quantifiable achievements (-10)")
        elif len(numbers) < 5:
            score -= 5
            penalties.append(f"Few quantifiable achievements (-5)")
        
        # Contact information check (deduct up to 10 points)
        has_email = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text))
        has_phone = bool(re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text))
        if not has_email:
            score -= 5
            penalties.append("Missing email (-5)")
        if not has_phone:
            score -= 5
            penalties.append("Missing phone (-5)")
        
        logger.info(f"ATS Score: {max(score, 0):.2f}, Penalties: {penalties}")
        return max(score, 0.0)
    
    def calculate_impact_score(self, text: str, experience: List[Dict[str, Any]]) -> float:
        """Calculate impact score based on achievements and quantifiable results"""
        score = 0.0
        
        # Action verbs that indicate impact
        action_verbs = [
            'achieved', 'improved', 'increased', 'decreased', 'reduced', 'generated',
            'launched', 'led', 'managed', 'developed', 'created', 'implemented',
            'optimized', 'streamlined', 'delivered', 'drove', 'built', 'designed'
        ]
        
        text_lower = text.lower()
        
        # Count action verbs (40 points)
        verb_count = sum(text_lower.count(verb) for verb in action_verbs)
        score += min(verb_count * 4, 40.0)
        
        # Count quantifiable metrics (40 points)
        metrics = re.findall(r'\b\d+[%$]?\b|\b(million|thousand|billion)\b', text_lower)
        score += min(len(metrics) * 4, 40.0)
        
        # Experience entries with descriptions (20 points)
        detailed_exp = sum(1 for exp in experience if exp.get('description') and len(exp['description']) > 2)
        score += min(detailed_exp * 10, 20.0)
        
        return min(score, 100.0)
    
    def analyze_resume(self, text: str) -> Dict[str, Any]:
        """Perform complete resume analysis with improved scoring"""
        logger.info("Starting comprehensive resume analysis")
        
        # Extract components
        keywords = self.extract_keywords(text)
        sections = self.identify_sections(text)
        skills = self.extract_skills(text)
        experience = self.extract_experience(text)
        education = self.extract_education(text)
        
        # Calculate individual scores
        completeness_score = self.calculate_completeness_score(sections, text)
        keyword_density_score = self.calculate_keyword_density(keywords, text)
        ats_score = self.calculate_ats_score(text, keywords, sections, skills)
        impact_score = self.calculate_impact_score(text, experience)
        
        # Skills score (based on quantity and relevance)
        skills_score = min((len(skills) / 20) * 100, 100.0)  # 20 skills = 100%
        
        # Overall score (weighted average)
        overall_score = (
            completeness_score * 0.25 +  # 25% - Has all sections
            ats_score * 0.25 +            # 25% - ATS friendly
            impact_score * 0.20 +         # 20% - Shows impact
            skills_score * 0.15 +         # 15% - Skills coverage
            keyword_density_score * 0.15  # 15% - Keyword optimization
        )
        overall_score = min(overall_score, 100.0)
        
        analysis = {
            'score': round(overall_score, 2),
            'keywords': keywords,  # Return ALL keywords, no limit
            'sections': sections,
            'skills': skills,
            'experience': experience,
            'education': education,
            'completeness_score': round(completeness_score, 2),
            'keyword_density_score': round(keyword_density_score, 2),
            'ats_score': round(ats_score, 2),
            'impact_score': round(impact_score, 2),
            'skills_score': round(skills_score, 2)
        }
        
        logger.info(f"Analysis complete. Overall score: {analysis['score']} (ATS: {ats_score}, Impact: {impact_score})")
        return analysis
