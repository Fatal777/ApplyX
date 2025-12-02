"""
ATS Scoring Service
====================

Implements realistic ATS (Applicant Tracking System) scoring logic based on
how systems like Greenhouse, Workday, Lever, and Taleo actually evaluate resumes.

Scoring Categories:
1. Keyword Match (40%) - Hard skills, soft skills, job-specific terms
2. Format & Structure (20%) - Parseable format, section detection, layout
3. Experience Relevance (20%) - Years of experience, role alignment
4. Education Match (10%) - Degree level, field of study
5. Contact & Completeness (10%) - Email, phone, LinkedIn, etc.

The scoring uses weighted algorithms similar to real ATS systems.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ATSCategory(Enum):
    """ATS scoring categories with weights matching real systems"""
    KEYWORDS = ("keywords", 0.40)
    FORMAT = ("format", 0.20)
    EXPERIENCE = ("experience", 0.20)
    EDUCATION = ("education", 0.10)
    COMPLETENESS = ("completeness", 0.10)
    
    @property
    def weight(self) -> float:
        return self.value[1]
    
    @property
    def key(self) -> str:
        return self.value[0]


@dataclass
class KeywordMatch:
    """Represents a matched or missing keyword"""
    keyword: str
    category: str  # 'hard_skill', 'soft_skill', 'tool', 'certification', 'industry'
    found: bool
    importance: str  # 'required', 'preferred', 'nice_to_have'
    context: Optional[str] = None  # Where it was found in resume


@dataclass
class ATSIssue:
    """Represents an ATS compatibility issue"""
    category: str
    severity: str  # 'critical', 'warning', 'info'
    message: str
    suggestion: str
    impact_score: int  # How many points this costs (0-10)


@dataclass
class ATSScoreResult:
    """Complete ATS scoring result"""
    overall_score: int  # 0-100
    category_scores: Dict[str, int]
    matched_keywords: List[KeywordMatch]
    missing_keywords: List[KeywordMatch]
    issues: List[ATSIssue]
    suggestions: List[str]
    job_match_percentage: Optional[int] = None
    parsing_confidence: float = 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_score": self.overall_score,
            "category_scores": self.category_scores,
            "matched_keywords": [
                {
                    "keyword": k.keyword,
                    "category": k.category,
                    "importance": k.importance,
                    "context": k.context
                }
                for k in self.matched_keywords
            ],
            "missing_keywords": [
                {
                    "keyword": k.keyword,
                    "category": k.category,
                    "importance": k.importance
                }
                for k in self.missing_keywords
            ],
            "issues": [
                {
                    "category": i.category,
                    "severity": i.severity,
                    "message": i.message,
                    "suggestion": i.suggestion,
                    "impact_score": i.impact_score
                }
                for i in self.issues
            ],
            "suggestions": self.suggestions,
            "job_match_percentage": self.job_match_percentage,
            "parsing_confidence": self.parsing_confidence
        }


# Common ATS-unfriendly patterns (like Greenhouse/Workday parsers struggle with)
ATS_PROBLEMATIC_PATTERNS = {
    "tables": r'[\|\+\-]{3,}',  # ASCII tables
    "headers_footers": r'^(page\s*\d+|confidential|draft)$',
    "special_chars": r'[★☆●○◆◇▪▫►◄♦♣♠♥✓✗✔✘→←↑↓]',
    "excessive_formatting": r'[_]{5,}|[=]{5,}|[\*]{3,}',
    "non_standard_bullets": r'^[\>\-\~\*]{1}\s',
}

# Section headers that ATS systems look for (Greenhouse, Workday, Lever)
STANDARD_SECTIONS = {
    "contact": ["contact", "personal info", "personal information"],
    "summary": ["summary", "professional summary", "executive summary", "profile", "objective", "about me", "about"],
    "experience": ["experience", "work experience", "professional experience", "employment", "work history", "employment history"],
    "education": ["education", "academic", "qualifications", "academic background", "educational background"],
    "skills": ["skills", "technical skills", "core competencies", "competencies", "expertise", "proficiencies", "technologies"],
    "certifications": ["certifications", "certificates", "licenses", "credentials", "professional certifications"],
    "projects": ["projects", "personal projects", "key projects", "portfolio"],
    "awards": ["awards", "honors", "achievements", "recognition"],
    "languages": ["languages", "language skills"],
    "volunteer": ["volunteer", "volunteering", "community service", "volunteer experience"],
}

# Common tech keywords (for general scoring without job description)
COMMON_TECH_KEYWORDS = {
    "programming": ["python", "javascript", "java", "c++", "c#", "ruby", "go", "rust", "typescript", "php", "swift", "kotlin"],
    "frameworks": ["react", "angular", "vue", "django", "flask", "spring", "express", "node.js", "next.js", ".net", "rails"],
    "databases": ["sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "dynamodb", "oracle", "sqlite"],
    "cloud": ["aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "jenkins", "ci/cd"],
    "tools": ["git", "github", "gitlab", "jira", "confluence", "slack", "figma", "postman", "vs code"],
    "methodologies": ["agile", "scrum", "kanban", "devops", "tdd", "bdd", "microservices", "rest", "graphql"],
}

# Soft skills ATS systems look for
SOFT_SKILLS = [
    "leadership", "communication", "teamwork", "problem-solving", "analytical",
    "collaboration", "adaptability", "time management", "critical thinking",
    "project management", "stakeholder management", "mentoring", "coaching",
    "cross-functional", "strategic planning", "decision making", "innovation",
]


class ATSScoringService:
    """
    ATS Scoring Service implementing real ATS evaluation logic.
    
    This mimics how Greenhouse, Workday, and Lever parse and score resumes:
    1. Parse resume text and detect sections
    2. Extract keywords and compare to job requirements
    3. Evaluate formatting for parseability
    4. Score experience relevance
    5. Check education requirements
    6. Verify contact information completeness
    """
    
    def __init__(self):
        self.section_patterns = self._compile_section_patterns()
    
    def _compile_section_patterns(self) -> Dict[str, re.Pattern]:
        """Compile regex patterns for section detection"""
        patterns = {}
        for section, keywords in STANDARD_SECTIONS.items():
            pattern = r'(?:^|\n)\s*(?:' + '|'.join(re.escape(k) for k in keywords) + r')\s*[:|\n]?'
            patterns[section] = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
        return patterns
    
    def score_resume(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
        job_requirements: Optional[List[str]] = None,
        required_experience_years: Optional[int] = None,
        required_education: Optional[str] = None,
    ) -> ATSScoreResult:
        """
        Score a resume using ATS-style evaluation.
        
        Args:
            resume_text: The full text content of the resume
            job_description: Optional job description for targeted scoring
            job_requirements: Optional list of specific requirements
            required_experience_years: Optional minimum years of experience
            required_education: Optional required education level
            
        Returns:
            ATSScoreResult with detailed scoring breakdown
        """
        issues: List[ATSIssue] = []
        suggestions: List[str] = []
        
        # Normalize text
        resume_lower = resume_text.lower()
        
        # 1. Format & Structure Score (20%)
        format_score, format_issues = self._score_format(resume_text)
        issues.extend(format_issues)
        
        # 2. Section Detection & Completeness (10%)
        completeness_score, completeness_issues, detected_sections = self._score_completeness(resume_text)
        issues.extend(completeness_issues)
        
        # 3. Keyword Matching (40%)
        if job_description or job_requirements:
            keyword_score, matched, missing = self._score_keywords_with_job(
                resume_lower, job_description, job_requirements
            )
        else:
            keyword_score, matched, missing = self._score_keywords_general(resume_lower)
        
        # 4. Experience Relevance (20%)
        experience_score, exp_issues = self._score_experience(
            resume_text, required_experience_years
        )
        issues.extend(exp_issues)
        
        # 5. Education (10%)
        education_score, edu_issues = self._score_education(
            resume_lower, required_education
        )
        issues.extend(edu_issues)
        
        # Calculate weighted overall score
        category_scores = {
            "keywords": keyword_score,
            "format": format_score,
            "experience": experience_score,
            "education": education_score,
            "completeness": completeness_score,
        }
        
        overall_score = int(
            keyword_score * ATSCategory.KEYWORDS.weight +
            format_score * ATSCategory.FORMAT.weight +
            experience_score * ATSCategory.EXPERIENCE.weight +
            education_score * ATSCategory.EDUCATION.weight +
            completeness_score * ATSCategory.COMPLETENESS.weight
        )
        
        # Generate suggestions based on issues
        suggestions = self._generate_suggestions(issues, missing, category_scores)
        
        # Calculate job match percentage if job description provided
        job_match = None
        if job_description:
            job_match = self._calculate_job_match(
                keyword_score, experience_score, education_score, matched, missing
            )
        
        # Calculate parsing confidence
        parsing_confidence = self._calculate_parsing_confidence(
            format_score, len(detected_sections), len(issues)
        )
        
        return ATSScoreResult(
            overall_score=overall_score,
            category_scores=category_scores,
            matched_keywords=matched,
            missing_keywords=missing,
            issues=issues,
            suggestions=suggestions,
            job_match_percentage=job_match,
            parsing_confidence=parsing_confidence,
        )
    
    def _score_format(self, resume_text: str) -> Tuple[int, List[ATSIssue]]:
        """
        Score resume format for ATS parseability.
        
        Checks for:
        - ASCII tables (hard to parse)
        - Special characters (often stripped)
        - Excessive formatting
        - Non-standard bullets
        - Text length (too short/long)
        """
        score = 100
        issues = []
        
        # Check for problematic patterns
        for pattern_name, pattern in ATS_PROBLEMATIC_PATTERNS.items():
            matches = re.findall(pattern, resume_text, re.MULTILINE | re.IGNORECASE)
            if matches:
                if pattern_name == "tables":
                    score -= 15
                    issues.append(ATSIssue(
                        category="format",
                        severity="warning",
                        message="ASCII tables detected - many ATS systems cannot parse tables",
                        suggestion="Convert table data to bullet points or plain text",
                        impact_score=15
                    ))
                elif pattern_name == "special_chars":
                    score -= 10
                    issues.append(ATSIssue(
                        category="format",
                        severity="warning",
                        message=f"Special characters found: {', '.join(set(matches[:5]))}",
                        suggestion="Replace special characters with standard bullets (• or -)",
                        impact_score=10
                    ))
                elif pattern_name == "excessive_formatting":
                    score -= 5
                    issues.append(ATSIssue(
                        category="format",
                        severity="info",
                        message="Excessive formatting characters detected",
                        suggestion="Simplify formatting - use standard section breaks",
                        impact_score=5
                    ))
        
        # Check text length
        word_count = len(resume_text.split())
        if word_count < 150:
            score -= 20
            issues.append(ATSIssue(
                category="format",
                severity="critical",
                message=f"Resume too short ({word_count} words) - may appear incomplete",
                suggestion="Add more detail to work experience and skills sections",
                impact_score=20
            ))
        elif word_count > 1500:
            score -= 10
            issues.append(ATSIssue(
                category="format",
                severity="warning",
                message=f"Resume may be too long ({word_count} words)",
                suggestion="Consider condensing to 1-2 pages for better ATS processing",
                impact_score=10
            ))
        
        # Check for excessive blank lines
        blank_line_ratio = resume_text.count('\n\n\n') / max(len(resume_text), 1) * 1000
        if blank_line_ratio > 5:
            score -= 5
            issues.append(ATSIssue(
                category="format",
                severity="info",
                message="Excessive blank lines may cause parsing issues",
                suggestion="Remove extra blank lines between sections",
                impact_score=5
            ))
        
        return max(0, score), issues
    
    def _score_completeness(
        self, resume_text: str
    ) -> Tuple[int, List[ATSIssue], List[str]]:
        """
        Score resume completeness and section structure.
        
        Essential sections for ATS:
        - Contact info (email, phone)
        - Experience section
        - Education section
        - Skills section
        """
        score = 100
        issues = []
        detected_sections = []
        resume_lower = resume_text.lower()
        
        # Check for essential sections
        essential = ["experience", "education", "skills"]
        for section in essential:
            if self.section_patterns[section].search(resume_text):
                detected_sections.append(section)
            else:
                score -= 15
                issues.append(ATSIssue(
                    category="completeness",
                    severity="critical",
                    message=f"Missing '{section.title()}' section",
                    suggestion=f"Add a clearly labeled '{section.title()}' section",
                    impact_score=15
                ))
        
        # Check for recommended sections
        recommended = ["summary", "certifications", "projects"]
        for section in recommended:
            if self.section_patterns[section].search(resume_text):
                detected_sections.append(section)
        
        # Check for contact information
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        phone_pattern = r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}'
        linkedin_pattern = r'linkedin\.com/in/[\w-]+'
        
        has_email = bool(re.search(email_pattern, resume_text))
        has_phone = bool(re.search(phone_pattern, resume_text))
        has_linkedin = bool(re.search(linkedin_pattern, resume_lower))
        
        if not has_email:
            score -= 15
            issues.append(ATSIssue(
                category="completeness",
                severity="critical",
                message="No email address found",
                suggestion="Add a professional email address at the top of your resume",
                impact_score=15
            ))
        
        if not has_phone:
            score -= 10
            issues.append(ATSIssue(
                category="completeness",
                severity="warning",
                message="No phone number found",
                suggestion="Add a phone number for recruiter contact",
                impact_score=10
            ))
        
        if not has_linkedin:
            score -= 5
            issues.append(ATSIssue(
                category="completeness",
                severity="info",
                message="No LinkedIn profile found",
                suggestion="Consider adding your LinkedIn URL",
                impact_score=5
            ))
        else:
            detected_sections.append("linkedin")
        
        return max(0, score), issues, detected_sections
    
    def _score_keywords_with_job(
        self,
        resume_lower: str,
        job_description: Optional[str],
        job_requirements: Optional[List[str]]
    ) -> Tuple[int, List[KeywordMatch], List[KeywordMatch]]:
        """
        Score keyword matching against specific job description.
        
        This mimics how Greenhouse and Workday extract and match keywords.
        """
        matched = []
        missing = []
        
        # Extract keywords from job description
        job_keywords = self._extract_job_keywords(job_description, job_requirements)
        
        # Match against resume
        total_weight = 0
        matched_weight = 0
        
        for keyword, info in job_keywords.items():
            importance = info["importance"]
            category = info["category"]
            
            # Weight based on importance
            weight = {"required": 3, "preferred": 2, "nice_to_have": 1}.get(importance, 1)
            total_weight += weight
            
            # Check if keyword exists in resume (with word boundaries)
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
            match = re.search(pattern, resume_lower)
            
            if match:
                # Find context (surrounding text)
                start = max(0, match.start() - 50)
                end = min(len(resume_lower), match.end() + 50)
                context = "..." + resume_lower[start:end] + "..."
                
                matched.append(KeywordMatch(
                    keyword=keyword,
                    category=category,
                    found=True,
                    importance=importance,
                    context=context
                ))
                matched_weight += weight
            else:
                missing.append(KeywordMatch(
                    keyword=keyword,
                    category=category,
                    found=False,
                    importance=importance
                ))
        
        # Calculate score
        if total_weight > 0:
            score = int((matched_weight / total_weight) * 100)
        else:
            score = 50  # Default if no keywords extracted
        
        return score, matched, missing
    
    def _score_keywords_general(
        self, resume_lower: str
    ) -> Tuple[int, List[KeywordMatch], List[KeywordMatch]]:
        """
        Score keywords using general industry standards when no job description.
        """
        matched = []
        missing = []
        found_count = 0
        total_checked = 0
        
        # Check for common tech keywords
        for category, keywords in COMMON_TECH_KEYWORDS.items():
            for keyword in keywords[:5]:  # Check top 5 per category
                total_checked += 1
                if keyword.lower() in resume_lower:
                    found_count += 1
                    matched.append(KeywordMatch(
                        keyword=keyword,
                        category=category,
                        found=True,
                        importance="preferred"
                    ))
        
        # Check for soft skills
        for skill in SOFT_SKILLS[:10]:
            total_checked += 1
            if skill.lower() in resume_lower:
                found_count += 1
                matched.append(KeywordMatch(
                    keyword=skill,
                    category="soft_skill",
                    found=True,
                    importance="preferred"
                ))
        
        # Score based on keyword density
        score = min(100, int((found_count / max(total_checked, 1)) * 150))
        
        return score, matched, missing
    
    def _extract_job_keywords(
        self,
        job_description: Optional[str],
        job_requirements: Optional[List[str]]
    ) -> Dict[str, Dict[str, str]]:
        """
        Extract keywords from job description like ATS systems do.
        
        Returns dict of keyword -> {importance, category}
        """
        keywords = {}
        
        if job_requirements:
            for req in job_requirements:
                # Requirements are usually "required"
                words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9\+\#\.]+\b', req)
                for word in words:
                    if len(word) > 2 and word.lower() not in ['the', 'and', 'for', 'with', 'our', 'you', 'are', 'have']:
                        keywords[word] = {
                            "importance": "required",
                            "category": self._categorize_keyword(word)
                        }
        
        if job_description:
            jd_lower = job_description.lower()
            
            # Extract tech keywords
            for category, terms in COMMON_TECH_KEYWORDS.items():
                for term in terms:
                    if term.lower() in jd_lower and term not in keywords:
                        keywords[term] = {
                            "importance": "preferred",
                            "category": category
                        }
            
            # Extract soft skills
            for skill in SOFT_SKILLS:
                if skill.lower() in jd_lower and skill not in keywords:
                    keywords[skill] = {
                        "importance": "preferred",
                        "category": "soft_skill"
                    }
            
            # Look for years of experience mentions
            exp_pattern = r'(\d+)\+?\s*(?:years?|yrs?)'
            exp_matches = re.findall(exp_pattern, jd_lower)
            if exp_matches:
                keywords[f"{exp_matches[0]}+ years experience"] = {
                    "importance": "required",
                    "category": "experience"
                }
        
        return keywords
    
    def _categorize_keyword(self, keyword: str) -> str:
        """Categorize a keyword by type"""
        keyword_lower = keyword.lower()
        
        for category, terms in COMMON_TECH_KEYWORDS.items():
            if keyword_lower in [t.lower() for t in terms]:
                return category
        
        if keyword_lower in [s.lower() for s in SOFT_SKILLS]:
            return "soft_skill"
        
        return "other"
    
    def _score_experience(
        self,
        resume_text: str,
        required_years: Optional[int]
    ) -> Tuple[int, List[ATSIssue]]:
        """
        Score experience section quality and relevance.
        """
        score = 100
        issues = []
        
        # Check for date patterns (ATS uses these to calculate experience)
        date_pattern = r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)[\s,]*\d{4}|(\d{1,2}/\d{4})|(\d{4}\s*[-–]\s*(?:\d{4}|present|current))'
        date_matches = re.findall(date_pattern, resume_text, re.IGNORECASE)
        
        if len(date_matches) < 2:
            score -= 15
            issues.append(ATSIssue(
                category="experience",
                severity="warning",
                message="Few date ranges found - ATS may not calculate experience correctly",
                suggestion="Use clear date formats like 'Jan 2020 - Present' for each role",
                impact_score=15
            ))
        
        # Check for quantifiable achievements (ATS and recruiters love these)
        number_pattern = r'\b\d+%|\$[\d,]+|\d+\+?\s*(users|customers|clients|projects|team members)'
        metrics = re.findall(number_pattern, resume_text, re.IGNORECASE)
        
        if len(metrics) < 3:
            score -= 10
            issues.append(ATSIssue(
                category="experience",
                severity="warning",
                message="Few quantifiable achievements found",
                suggestion="Add metrics like '50% increase' or 'managed team of 8'",
                impact_score=10
            ))
        
        # Check for action verbs
        action_verbs = [
            "led", "managed", "developed", "created", "implemented", "designed",
            "built", "launched", "increased", "reduced", "achieved", "delivered",
            "drove", "executed", "established", "improved", "optimized", "spearheaded"
        ]
        
        resume_lower = resume_text.lower()
        found_verbs = sum(1 for verb in action_verbs if verb in resume_lower)
        
        if found_verbs < 5:
            score -= 10
            issues.append(ATSIssue(
                category="experience",
                severity="info",
                message="Limited use of strong action verbs",
                suggestion="Start bullet points with action verbs like 'Led', 'Developed', 'Achieved'",
                impact_score=10
            ))
        
        return max(0, score), issues
    
    def _score_education(
        self,
        resume_lower: str,
        required_education: Optional[str]
    ) -> Tuple[int, List[ATSIssue]]:
        """
        Score education section.
        """
        score = 100
        issues = []
        
        # Check for degree mentions
        degrees = {
            "phd": ["phd", "ph.d", "doctorate", "doctoral"],
            "masters": ["master", "mba", "m.s.", "m.a.", "msc", "ma degree"],
            "bachelors": ["bachelor", "b.s.", "b.a.", "bsc", "ba degree", "undergraduate"],
            "associate": ["associate", "a.s.", "a.a."],
        }
        
        found_degree = None
        for degree_level, patterns in degrees.items():
            for pattern in patterns:
                if pattern in resume_lower:
                    found_degree = degree_level
                    break
            if found_degree:
                break
        
        if not found_degree:
            score -= 20
            issues.append(ATSIssue(
                category="education",
                severity="warning",
                message="No recognized degree found",
                suggestion="Clearly list your degree (e.g., 'Bachelor of Science in Computer Science')",
                impact_score=20
            ))
        
        # Check if required education matches
        if required_education and found_degree:
            required_lower = required_education.lower()
            degree_hierarchy = ["associate", "bachelors", "masters", "phd"]
            
            required_level = None
            for level in degree_hierarchy:
                if level in required_lower or any(p in required_lower for p in degrees.get(level, [])):
                    required_level = level
                    break
            
            if required_level:
                found_idx = degree_hierarchy.index(found_degree) if found_degree in degree_hierarchy else -1
                required_idx = degree_hierarchy.index(required_level)
                
                if found_idx < required_idx:
                    score -= 30
                    issues.append(ATSIssue(
                        category="education",
                        severity="critical",
                        message=f"Education may not meet requirement: {required_education}",
                        suggestion="Highlight relevant certifications or equivalent experience",
                        impact_score=30
                    ))
        
        return max(0, score), issues
    
    def _calculate_job_match(
        self,
        keyword_score: int,
        experience_score: int,
        education_score: int,
        matched: List[KeywordMatch],
        missing: List[KeywordMatch]
    ) -> int:
        """
        Calculate job match percentage similar to how Greenhouse shows match scores.
        """
        # Weight keyword match heavily (that's what ATS primarily uses)
        base_match = keyword_score * 0.6 + experience_score * 0.25 + education_score * 0.15
        
        # Adjust based on required keyword coverage
        required_matched = sum(1 for k in matched if k.importance == "required")
        required_total = required_matched + sum(1 for k in missing if k.importance == "required")
        
        if required_total > 0:
            required_coverage = required_matched / required_total
            # If missing required keywords, cap the match score
            if required_coverage < 0.5:
                base_match = min(base_match, 50)
            elif required_coverage < 0.75:
                base_match = min(base_match, 70)
        
        return int(base_match)
    
    def _calculate_parsing_confidence(
        self,
        format_score: int,
        section_count: int,
        issue_count: int
    ) -> float:
        """
        Calculate confidence that ATS will parse resume correctly.
        """
        confidence = 1.0
        
        # Format issues reduce confidence
        confidence *= (format_score / 100)
        
        # More sections = better structure
        if section_count >= 4:
            confidence *= 1.0
        elif section_count >= 2:
            confidence *= 0.9
        else:
            confidence *= 0.7
        
        # Many issues reduce confidence
        if issue_count > 5:
            confidence *= 0.8
        
        return round(confidence, 2)
    
    def _generate_suggestions(
        self,
        issues: List[ATSIssue],
        missing_keywords: List[KeywordMatch],
        category_scores: Dict[str, int]
    ) -> List[str]:
        """
        Generate prioritized suggestions for improvement.
        """
        suggestions = []
        
        # Critical issues first
        critical_issues = [i for i in issues if i.severity == "critical"]
        for issue in critical_issues[:3]:
            suggestions.append(f"🔴 {issue.suggestion}")
        
        # Missing required keywords
        required_missing = [k for k in missing_keywords if k.importance == "required"][:5]
        if required_missing:
            keywords = ", ".join([k.keyword for k in required_missing])
            suggestions.append(f"🔑 Add missing required keywords: {keywords}")
        
        # Low-scoring categories
        for category, score in category_scores.items():
            if score < 70:
                if category == "keywords":
                    suggestions.append("📝 Add more relevant industry keywords to your resume")
                elif category == "format":
                    suggestions.append("📋 Simplify formatting - remove tables and special characters")
                elif category == "experience":
                    suggestions.append("📊 Add quantifiable achievements with numbers and percentages")
                elif category == "education":
                    suggestions.append("🎓 Clearly list your education with degree and institution")
                elif category == "completeness":
                    suggestions.append("✅ Ensure all essential sections are present and labeled")
        
        # Warning issues
        warning_issues = [i for i in issues if i.severity == "warning"]
        for issue in warning_issues[:2]:
            if issue.suggestion not in suggestions:
                suggestions.append(f"⚠️ {issue.suggestion}")
        
        return suggestions[:8]  # Limit to top 8 suggestions


# Singleton instance
_ats_service: Optional[ATSScoringService] = None


def get_ats_scoring_service() -> ATSScoringService:
    """Get singleton ATS scoring service instance"""
    global _ats_service
    if _ats_service is None:
        _ats_service = ATSScoringService()
    return _ats_service
