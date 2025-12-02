"""
AI Job Match Scoring Service
=============================
Scores resume against job description using AI and keyword matching.

Features:
- Overall match score (0-100%)
- Skill matching with categorization
- Keyword extraction
- Improvement suggestions
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple
from functools import lru_cache

import logging

logger = logging.getLogger(__name__)


@dataclass
class MatchBreakdown:
    """Detailed match score breakdown."""
    overall_score: float  # 0-100
    skills_score: float  # Skills match percentage
    experience_score: float  # Experience match
    education_score: float  # Education match
    keywords_score: float  # ATS keywords match
    
    matched_skills: List[str] = field(default_factory=list)
    missing_skills: List[str] = field(default_factory=list)
    partial_skills: List[str] = field(default_factory=list)  # Skills with partial match
    
    matched_keywords: List[str] = field(default_factory=list)
    missing_keywords: List[str] = field(default_factory=list)
    
    experience_match: Dict = field(default_factory=dict)
    education_match: Dict = field(default_factory=dict)
    
    suggestions: List[str] = field(default_factory=list)
    priority_improvements: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "overall_score": round(self.overall_score, 1),
            "breakdown": {
                "skills": round(self.skills_score, 1),
                "experience": round(self.experience_score, 1),
                "education": round(self.education_score, 1),
                "keywords": round(self.keywords_score, 1),
            },
            "matched_skills": self.matched_skills,
            "missing_skills": self.missing_skills,
            "partial_skills": self.partial_skills,
            "matched_keywords": self.matched_keywords,
            "missing_keywords": self.missing_keywords[:10],  # Top 10
            "experience_match": self.experience_match,
            "education_match": self.education_match,
            "suggestions": self.suggestions[:5],  # Top 5
            "priority_improvements": self.priority_improvements[:3],  # Top 3
        }


class JobMatchScorer:
    """
    AI-powered job match scoring service.
    
    Scoring weights:
    - Skills: 40%
    - Keywords/ATS: 25%
    - Experience: 20%
    - Education: 15%
    """
    
    WEIGHTS = {
        "skills": 0.40,
        "keywords": 0.25,
        "experience": 0.20,
        "education": 0.15,
    }
    
    # Common skill categories for normalization
    SKILL_SYNONYMS = {
        # Programming Languages
        "javascript": ["js", "ecmascript", "es6", "es2015"],
        "typescript": ["ts"],
        "python": ["py", "python3", "python2"],
        "java": ["java8", "java11", "java17", "jdk"],
        "c++": ["cpp", "c plus plus", "cplusplus"],
        "c#": ["csharp", "c sharp", "dotnet"],
        "golang": ["go", "go lang"],
        
        # Frameworks
        "react": ["reactjs", "react.js", "react native"],
        "angular": ["angularjs", "angular.js"],
        "vue": ["vuejs", "vue.js", "vue3"],
        "node.js": ["nodejs", "node", "express", "expressjs"],
        "django": ["django rest", "drf"],
        "flask": ["flask-restful"],
        "spring": ["spring boot", "springboot", "spring framework"],
        "fastapi": ["fast api"],
        
        # Databases
        "postgresql": ["postgres", "pg", "psql"],
        "mongodb": ["mongo", "mongoose"],
        "mysql": ["mariadb"],
        "redis": ["redis cache"],
        "elasticsearch": ["elastic", "es", "elk"],
        
        # Cloud/DevOps
        "aws": ["amazon web services", "ec2", "s3", "lambda"],
        "azure": ["microsoft azure", "azure cloud"],
        "gcp": ["google cloud", "google cloud platform"],
        "docker": ["containerization", "containers"],
        "kubernetes": ["k8s", "k8"],
        "ci/cd": ["cicd", "continuous integration", "jenkins", "github actions"],
        "terraform": ["iac", "infrastructure as code"],
        
        # AI/ML
        "machine learning": ["ml", "scikit-learn", "sklearn"],
        "deep learning": ["dl", "neural networks"],
        "tensorflow": ["tf", "keras"],
        "pytorch": ["torch"],
        "nlp": ["natural language processing", "nltk", "spacy"],
        
        # Soft Skills
        "leadership": ["team lead", "team leader", "lead developer"],
        "communication": ["written communication", "verbal communication"],
        "problem solving": ["problem-solving", "analytical thinking"],
        "agile": ["scrum", "kanban", "agile methodology"],
    }
    
    # Education level rankings
    EDUCATION_LEVELS = {
        "phd": 5,
        "doctorate": 5,
        "masters": 4,
        "master's": 4,
        "mba": 4,
        "ms": 4,
        "bachelors": 3,
        "bachelor's": 3,
        "bs": 3,
        "ba": 3,
        "btech": 3,
        "associate": 2,
        "diploma": 1,
        "certificate": 1,
        "high school": 0,
    }
    
    # Result cache
    _cache: Dict[str, Tuple[MatchBreakdown, datetime]] = {}
    CACHE_TTL = timedelta(hours=1)
    
    def __init__(self, ai_service=None):
        """
        Initialize scorer.
        
        Args:
            ai_service: Optional AI service for enhanced analysis
        """
        self.ai_service = ai_service
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        if not text:
            return ""
        # Lowercase and remove extra whitespace
        text = re.sub(r'\s+', ' ', text.lower().strip())
        # Remove special characters but keep alphanumeric and spaces
        text = re.sub(r'[^\w\s\+\#\.]', ' ', text)
        return text
    
    def _extract_skills(self, text: str) -> Set[str]:
        """Extract skills from text with normalization."""
        text = self._normalize_text(text)
        found_skills = set()
        
        # Check for each skill and its synonyms
        for main_skill, synonyms in self.SKILL_SYNONYMS.items():
            if main_skill in text:
                found_skills.add(main_skill)
            else:
                for syn in synonyms:
                    if syn in text:
                        found_skills.add(main_skill)
                        break
        
        # Also extract any word sequences that look like technologies
        # (typically 2-3 words, often with dots or hyphens)
        tech_patterns = [
            r'\b[a-z]+\.js\b',  # .js frameworks
            r'\b[a-z]+-[a-z]+\b',  # hyphenated techs
            r'\b[a-z]+\+\+\b',  # C++, etc
            r'\b[a-z]+#\b',  # C#, etc
        ]
        
        for pattern in tech_patterns:
            matches = re.findall(pattern, text)
            found_skills.update(matches)
        
        return found_skills
    
    def _extract_keywords(self, text: str) -> Set[str]:
        """Extract ATS-relevant keywords from JD."""
        text = self._normalize_text(text)
        
        # Common important keywords
        action_keywords = [
            "develop", "design", "implement", "build", "create", "optimize",
            "manage", "lead", "analyze", "collaborate", "integrate", "deploy",
            "test", "debug", "maintain", "scale", "automate", "monitor",
            "architect", "mentor", "review", "document"
        ]
        
        domain_keywords = [
            "api", "rest", "graphql", "microservices", "distributed systems",
            "scalability", "performance", "security", "authentication",
            "database", "cache", "queue", "messaging", "real-time",
            "frontend", "backend", "full-stack", "fullstack", "devops",
            "mobile", "web", "cloud", "saas", "enterprise", "startup"
        ]
        
        found_keywords = set()
        
        for kw in action_keywords + domain_keywords:
            if kw in text:
                found_keywords.add(kw)
        
        return found_keywords
    
    def _extract_years_experience(self, text: str) -> Optional[int]:
        """Extract years of experience requirement from text."""
        text = self._normalize_text(text)
        
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:professional\s*)?experience',
            r'experience\s*:\s*(\d+)\+?\s*years?',
            r'minimum\s*(\d+)\+?\s*years?',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return int(match.group(1))
        
        return None
    
    def _extract_education(self, text: str) -> Dict[str, any]:
        """Extract education requirements from text."""
        text = self._normalize_text(text)
        
        result = {
            "level": None,
            "level_score": 0,
            "fields": [],
        }
        
        # Find education level
        for edu, score in self.EDUCATION_LEVELS.items():
            if edu in text:
                if score > result["level_score"]:
                    result["level"] = edu
                    result["level_score"] = score
        
        # Find fields of study
        fields = [
            "computer science", "software engineering", "information technology",
            "electrical engineering", "mathematics", "physics", "data science",
            "machine learning", "artificial intelligence", "statistics"
        ]
        
        for field in fields:
            if field in text:
                result["fields"].append(field)
        
        return result
    
    def _calculate_skills_score(
        self, 
        resume_skills: Set[str], 
        jd_skills: Set[str]
    ) -> Tuple[float, List[str], List[str], List[str]]:
        """
        Calculate skills match score.
        
        Returns:
            Tuple of (score, matched, missing, partial)
        """
        if not jd_skills:
            return 100.0, list(resume_skills), [], []
        
        matched = resume_skills & jd_skills
        missing = jd_skills - resume_skills
        
        # Check for partial matches (synonyms already handled)
        partial = []
        for skill in missing.copy():
            for resume_skill in resume_skills:
                if skill in resume_skill or resume_skill in skill:
                    partial.append(skill)
                    missing.discard(skill)
                    break
        
        # Score: full matches = 100%, partial = 50%
        full_weight = len(matched) / len(jd_skills) if jd_skills else 0
        partial_weight = (len(partial) * 0.5) / len(jd_skills) if jd_skills else 0
        
        score = min(100, (full_weight + partial_weight) * 100)
        
        return score, sorted(matched), sorted(missing), partial
    
    def _calculate_experience_score(
        self,
        resume_text: str,
        jd_text: str
    ) -> Tuple[float, Dict]:
        """Calculate experience match score."""
        jd_years = self._extract_years_experience(jd_text)
        resume_years = self._extract_years_experience(resume_text)
        
        match_info = {
            "required_years": jd_years,
            "candidate_years": resume_years,
            "status": "unknown"
        }
        
        if jd_years is None:
            # No specific requirement
            match_info["status"] = "not_specified"
            return 80.0, match_info  # Default score
        
        if resume_years is None:
            # Can't determine from resume
            match_info["status"] = "not_found_in_resume"
            return 50.0, match_info
        
        if resume_years >= jd_years:
            match_info["status"] = "meets_requirement"
            return 100.0, match_info
        elif resume_years >= jd_years - 1:
            match_info["status"] = "slightly_under"
            return 75.0, match_info
        elif resume_years >= jd_years - 2:
            match_info["status"] = "moderately_under"
            return 50.0, match_info
        else:
            match_info["status"] = "significantly_under"
            return 25.0, match_info
    
    def _calculate_education_score(
        self,
        resume_text: str,
        jd_text: str
    ) -> Tuple[float, Dict]:
        """Calculate education match score."""
        jd_edu = self._extract_education(jd_text)
        resume_edu = self._extract_education(resume_text)
        
        match_info = {
            "required_level": jd_edu["level"],
            "candidate_level": resume_edu["level"],
            "required_fields": jd_edu["fields"],
            "candidate_fields": resume_edu["fields"],
            "status": "unknown"
        }
        
        if jd_edu["level_score"] == 0:
            match_info["status"] = "not_specified"
            return 80.0, match_info
        
        if resume_edu["level_score"] == 0:
            match_info["status"] = "not_found_in_resume"
            return 50.0, match_info
        
        level_diff = resume_edu["level_score"] - jd_edu["level_score"]
        
        if level_diff >= 0:
            base_score = 100.0
            match_info["status"] = "meets_or_exceeds"
        elif level_diff == -1:
            base_score = 70.0
            match_info["status"] = "one_level_below"
        else:
            base_score = 40.0
            match_info["status"] = "below_requirement"
        
        # Bonus for matching fields
        if jd_edu["fields"]:
            matching_fields = set(jd_edu["fields"]) & set(resume_edu["fields"])
            if matching_fields:
                base_score = min(100, base_score + 10)
                match_info["matching_fields"] = list(matching_fields)
        
        return base_score, match_info
    
    def _generate_suggestions(
        self,
        breakdown: MatchBreakdown,
        jd_text: str
    ) -> List[str]:
        """Generate improvement suggestions based on match analysis."""
        suggestions = []
        
        # Skills suggestions
        if breakdown.missing_skills:
            top_missing = breakdown.missing_skills[:3]
            suggestions.append(
                f"Consider adding these key skills if you have experience: {', '.join(top_missing)}"
            )
        
        # Experience suggestions
        if breakdown.experience_match.get("status") == "slightly_under":
            suggestions.append(
                "Highlight any relevant projects or internships to boost your experience"
            )
        elif breakdown.experience_match.get("status") == "significantly_under":
            suggestions.append(
                "This role may require more experience than you currently have. Consider similar junior positions."
            )
        
        # Education suggestions
        if breakdown.education_match.get("status") == "below_requirement":
            suggestions.append(
                "Consider highlighting relevant certifications or coursework to supplement education requirements"
            )
        
        # Keywords suggestions
        if len(breakdown.missing_keywords) > 3:
            suggestions.append(
                "Your resume may be missing some ATS keywords. Consider incorporating industry-standard terminology."
            )
        
        # Score-based suggestions
        if breakdown.overall_score < 50:
            suggestions.append(
                "This job may not be the best match for your current profile. Consider roles more aligned with your experience."
            )
        elif breakdown.overall_score >= 80:
            suggestions.append(
                "Great match! Make sure your resume highlights the skills mentioned in the job description."
            )
        
        return suggestions
    
    def _generate_priority_improvements(
        self,
        breakdown: MatchBreakdown
    ) -> List[str]:
        """Generate priority list of improvements for resume customization."""
        priorities = []
        
        # Find lowest scoring areas
        scores = {
            "skills": breakdown.skills_score,
            "keywords": breakdown.keywords_score,
            "experience": breakdown.experience_score,
            "education": breakdown.education_score,
        }
        
        sorted_scores = sorted(scores.items(), key=lambda x: x[1])
        
        for area, score in sorted_scores[:2]:  # Top 2 areas to improve
            if score < 70:
                if area == "skills":
                    if breakdown.missing_skills:
                        priorities.append(f"Add skills: {', '.join(breakdown.missing_skills[:3])}")
                elif area == "keywords":
                    if breakdown.missing_keywords:
                        priorities.append(f"Include keywords: {', '.join(breakdown.missing_keywords[:3])}")
                elif area == "experience":
                    priorities.append("Emphasize relevant project experience")
                elif area == "education":
                    priorities.append("Highlight relevant certifications or courses")
        
        return priorities
    
    def score_match(
        self,
        resume_text: str,
        job_description: str,
        use_cache: bool = True
    ) -> MatchBreakdown:
        """
        Score resume against job description.
        
        Args:
            resume_text: Full resume text
            job_description: Full job description text
            use_cache: Whether to use cached results
            
        Returns:
            MatchBreakdown with detailed scoring
        """
        if not resume_text or not job_description:
            return MatchBreakdown(
                overall_score=0,
                skills_score=0,
                experience_score=0,
                education_score=0,
                keywords_score=0,
                suggestions=["Unable to score: missing resume or job description"]
            )
        
        # Check cache
        if use_cache:
            cache_key = hashlib.md5(
                f"{resume_text[:500]}|{job_description[:500]}".encode()
            ).hexdigest()
            
            if cache_key in self._cache:
                cached, timestamp = self._cache[cache_key]
                if datetime.now() - timestamp < self.CACHE_TTL:
                    return cached
        
        # Extract information
        resume_skills = self._extract_skills(resume_text)
        jd_skills = self._extract_skills(job_description)
        
        resume_keywords = self._extract_keywords(resume_text)
        jd_keywords = self._extract_keywords(job_description)
        
        # Calculate component scores
        skills_score, matched_skills, missing_skills, partial_skills = \
            self._calculate_skills_score(resume_skills, jd_skills)
        
        keywords_matched = resume_keywords & jd_keywords
        keywords_missing = jd_keywords - resume_keywords
        keywords_score = (len(keywords_matched) / len(jd_keywords) * 100) if jd_keywords else 80
        
        experience_score, experience_match = \
            self._calculate_experience_score(resume_text, job_description)
        
        education_score, education_match = \
            self._calculate_education_score(resume_text, job_description)
        
        # Calculate weighted overall score
        overall_score = (
            skills_score * self.WEIGHTS["skills"] +
            keywords_score * self.WEIGHTS["keywords"] +
            experience_score * self.WEIGHTS["experience"] +
            education_score * self.WEIGHTS["education"]
        )
        
        breakdown = MatchBreakdown(
            overall_score=overall_score,
            skills_score=skills_score,
            experience_score=experience_score,
            education_score=education_score,
            keywords_score=keywords_score,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            partial_skills=partial_skills,
            matched_keywords=sorted(keywords_matched),
            missing_keywords=sorted(keywords_missing),
            experience_match=experience_match,
            education_match=education_match,
        )
        
        # Generate suggestions
        breakdown.suggestions = self._generate_suggestions(breakdown, job_description)
        breakdown.priority_improvements = self._generate_priority_improvements(breakdown)
        
        # Cache result
        if use_cache:
            self._cache[cache_key] = (breakdown, datetime.now())
        
        return breakdown
    
    async def score_match_async(
        self,
        resume_text: str,
        job_description: str,
        use_ai_enhancement: bool = False
    ) -> MatchBreakdown:
        """
        Async version of score_match with optional AI enhancement.
        
        Args:
            resume_text: Full resume text
            job_description: Full job description text
            use_ai_enhancement: Whether to use AI for deeper analysis
            
        Returns:
            MatchBreakdown with detailed scoring
        """
        # Get base score
        breakdown = self.score_match(resume_text, job_description)
        
        # Optionally enhance with AI analysis
        if use_ai_enhancement and self.ai_service:
            try:
                ai_suggestions = await self._get_ai_suggestions(
                    resume_text, 
                    job_description, 
                    breakdown
                )
                breakdown.suggestions = ai_suggestions + breakdown.suggestions
            except Exception as e:
                logger.warning(f"AI enhancement failed: {e}")
        
        return breakdown
    
    async def _get_ai_suggestions(
        self,
        resume_text: str,
        job_description: str,
        breakdown: MatchBreakdown
    ) -> List[str]:
        """Get AI-powered suggestions for improvement."""
        # This would call the AI service for enhanced suggestions
        # For now, return empty list
        return []


# Singleton instance
_scorer: Optional[JobMatchScorer] = None


def get_job_match_scorer() -> JobMatchScorer:
    """Get singleton scorer instance."""
    global _scorer
    if _scorer is None:
        _scorer = JobMatchScorer()
    return _scorer


# Convenience function
def score_resume_match(resume_text: str, job_description: str) -> dict:
    """Quick function to score a resume against a job description."""
    scorer = get_job_match_scorer()
    breakdown = scorer.score_match(resume_text, job_description)
    return breakdown.to_dict()
