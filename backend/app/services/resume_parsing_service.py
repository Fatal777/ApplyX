"""
LLM-based Resume Parsing Service
Uses structured extraction with LLM to parse resumes into editable sections
Includes FAISS-based similarity matching for better categorization
"""

import os
import json
import re
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

# Try to import optional dependencies
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    logger.warning("OpenAI not installed. LLM parsing will be unavailable.")

try:
    import numpy as np
    import faiss
    HAS_FAISS = True
except ImportError:
    HAS_FAISS = False
    logger.warning("FAISS not installed. Similarity matching will be unavailable.")


@dataclass
class ParsedPersonalInfo:
    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    website: str = ""


@dataclass
class ParsedExperience:
    company: str
    position: str
    date: str
    details: str  # HTML with bullet points
    visible: bool = True


@dataclass
class ParsedEducation:
    school: str
    degree: str
    major: str
    start_date: str
    end_date: str
    gpa: str = ""
    description: str = ""
    visible: bool = True


@dataclass
class ParsedProject:
    name: str
    role: str
    date: str
    description: str  # HTML with bullet points
    link: str = ""
    visible: bool = True


@dataclass
class ParsedResume:
    personal: ParsedPersonalInfo
    experience: List[ParsedExperience]
    education: List[ParsedEducation]
    projects: List[ParsedProject]
    skills_content: str  # HTML


# Section type keywords for FAISS classification
SECTION_KEYWORDS = {
    "experience": ["experience", "work history", "employment", "professional experience", "work experience", "career"],
    "education": ["education", "academic", "university", "college", "degree", "school", "qualification"],
    "skills": ["skills", "technologies", "tools", "programming", "languages", "competencies", "expertise"],
    "projects": ["projects", "portfolio", "personal projects", "side projects", "work samples"],
    "summary": ["summary", "objective", "profile", "about me", "professional summary", "career objective"],
    "certifications": ["certifications", "certificates", "licenses", "credentials"],
}


class ResumeParsingService:
    """Service for parsing resume text into structured sections"""
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_api_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
        self._openai_client = None
        self._faiss_index = None
        self._section_embeddings = None
    
    @property
    def openai_client(self):
        if self._openai_client is None and HAS_OPENAI and self.openai_api_key:
            self._openai_client = OpenAI(api_key=self.openai_api_key)
        return self._openai_client
    
    def _get_embedding(self, text: str) -> Optional[np.ndarray]:
        """Get embedding vector for text using OpenAI"""
        if not self.openai_client:
            return None
        
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return np.array(response.data[0].embedding, dtype=np.float32)
        except Exception as e:
            logger.error(f"Failed to get embedding: {e}")
            return None
    
    def _build_faiss_index(self):
        """Build FAISS index for section classification"""
        if not HAS_FAISS or not self.openai_client:
            return
        
        # Generate embeddings for section keywords
        all_keywords = []
        section_labels = []
        
        for section, keywords in SECTION_KEYWORDS.items():
            for keyword in keywords:
                all_keywords.append(keyword)
                section_labels.append(section)
        
        embeddings = []
        for keyword in all_keywords:
            emb = self._get_embedding(keyword)
            if emb is not None:
                embeddings.append(emb)
        
        if embeddings:
            embeddings_np = np.vstack(embeddings)
            dimension = embeddings_np.shape[1]
            
            self._faiss_index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
            faiss.normalize_L2(embeddings_np)
            self._faiss_index.add(embeddings_np)
            self._section_embeddings = section_labels[:len(embeddings)]
            
            logger.info(f"Built FAISS index with {len(embeddings)} section keywords")
    
    def classify_section(self, section_header: str) -> str:
        """Classify a section header using FAISS similarity or keyword matching"""
        header_lower = section_header.lower().strip()
        
        # First try exact/partial keyword matching
        for section, keywords in SECTION_KEYWORDS.items():
            for keyword in keywords:
                if keyword in header_lower or header_lower in keyword:
                    return section
        
        # If FAISS is available, use similarity matching
        if HAS_FAISS and self._faiss_index is not None:
            query_emb = self._get_embedding(section_header)
            if query_emb is not None:
                query_emb = query_emb.reshape(1, -1)
                faiss.normalize_L2(query_emb)
                
                distances, indices = self._faiss_index.search(query_emb, k=3)
                
                # Use top match if similarity is high enough
                if distances[0][0] > 0.7 and self._section_embeddings:
                    return self._section_embeddings[indices[0][0]]
        
        return "other"
    
    def parse_with_llm(self, resume_text: str) -> Optional[ParsedResume]:
        """Parse resume text using LLM for structured extraction"""
        if not self.openai_client:
            logger.warning("OpenAI client not available. Using fallback parsing.")
            return self.parse_fallback(resume_text)
        
        prompt = """Parse this resume into structured JSON format. Extract:
1. Personal info (name, title, email, phone, location, linkedin, github, website)
2. Experience entries (company, position, date, details as bullet points)
3. Education entries (school, degree, major, start_date, end_date, gpa)
4. Projects (name, role, date, description as bullet points, link)
5. Skills (as a single HTML string with categories if present)

For bullet points in details/descriptions, format as HTML: <ul><li>point 1</li><li>point 2</li></ul>

Resume:
{resume_text}

Respond with valid JSON only:
{{
  "personal": {{"name": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "website": ""}},
  "experience": [{{"company": "", "position": "", "date": "", "details": "<ul><li>...</li></ul>"}}],
  "education": [{{"school": "", "degree": "", "major": "", "start_date": "", "end_date": "", "gpa": ""}}],
  "projects": [{{"name": "", "role": "", "date": "", "description": "<ul><li>...</li></ul>", "link": ""}}],
  "skills_content": "<p><strong>Programming:</strong> Python, JavaScript</p>"
}}"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a resume parser. Extract structured data from resumes accurately."},
                    {"role": "user", "content": prompt.format(resume_text=resume_text[:8000])}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Convert to dataclasses
            personal = ParsedPersonalInfo(**result.get("personal", {}))
            
            experience = [
                ParsedExperience(
                    company=e.get("company", ""),
                    position=e.get("position", ""),
                    date=e.get("date", ""),
                    details=e.get("details", ""),
                )
                for e in result.get("experience", [])
            ]
            
            education = [
                ParsedEducation(
                    school=ed.get("school", ""),
                    degree=ed.get("degree", ""),
                    major=ed.get("major", ""),
                    start_date=ed.get("start_date", ""),
                    end_date=ed.get("end_date", ""),
                    gpa=ed.get("gpa", ""),
                )
                for ed in result.get("education", [])
            ]
            
            projects = [
                ParsedProject(
                    name=p.get("name", ""),
                    role=p.get("role", ""),
                    date=p.get("date", ""),
                    description=p.get("description", ""),
                    link=p.get("link", ""),
                )
                for p in result.get("projects", [])
            ]
            
            skills_content = result.get("skills_content", "")
            
            return ParsedResume(
                personal=personal,
                experience=experience,
                education=education,
                projects=projects,
                skills_content=skills_content,
            )
            
        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            return self.parse_fallback(resume_text)
    
    def parse_fallback(self, resume_text: str) -> ParsedResume:
        """Fallback parsing without LLM - uses regex and heuristics"""
        lines = resume_text.strip().split('\n')
        
        # Simple extraction
        personal = ParsedPersonalInfo()
        
        # Try to extract email
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
        if email_match:
            personal.email = email_match.group()
        
        # Try to extract phone
        phone_match = re.search(r'[\+\d][\d\s\-\(\)]{9,}', resume_text)
        if phone_match:
            personal.phone = phone_match.group().strip()
        
        # Try to extract LinkedIn
        linkedin_match = re.search(r'linkedin\.com/in/[\w\-]+', resume_text, re.I)
        if linkedin_match:
            personal.linkedin = f"https://{linkedin_match.group()}"
        
        # Try to extract GitHub
        github_match = re.search(r'github\.com/[\w\-]+', resume_text, re.I)
        if github_match:
            personal.github = f"https://{github_match.group()}"
        
        # First non-empty line is likely the name
        for line in lines:
            line = line.strip()
            if line and len(line) < 50 and not '@' in line:
                personal.name = line
                break
        
        return ParsedResume(
            personal=personal,
            experience=[],
            education=[],
            projects=[],
            skills_content="",
        )
    
    def to_resume_builder_format(self, parsed: ParsedResume) -> Dict[str, Any]:
        """Convert parsed resume to ResumeBuilder document format"""
        import time
        
        doc_id = f"{int(time.time())}-parsed"
        
        return {
            "id": doc_id,
            "title": f"{parsed.personal.name}'s Resume" if parsed.personal.name else "Imported Resume",
            "createdAt": "",
            "updatedAt": "",
            "templateId": "classic",
            "personal": {
                "name": parsed.personal.name,
                "title": parsed.personal.title,
                "email": parsed.personal.email,
                "phone": parsed.personal.phone,
                "location": parsed.personal.location,
                "birthDate": "",
                "employmentStatus": "",
                "photo": "",
                "photoConfig": {},
                "icons": {},
                "customFields": [
                    {"id": "linkedin", "label": "LinkedIn", "value": parsed.personal.linkedin, "icon": "linkedin", "visible": True} if parsed.personal.linkedin else None,
                    {"id": "github", "label": "GitHub", "value": parsed.personal.github, "icon": "github", "visible": True} if parsed.personal.github else None,
                    {"id": "website", "label": "Website", "value": parsed.personal.website, "icon": "website", "visible": True} if parsed.personal.website else None,
                ],
            },
            "education": [
                {
                    "id": f"edu-{i}",
                    "school": e.school,
                    "degree": e.degree,
                    "major": e.major,
                    "startDate": e.start_date,
                    "endDate": e.end_date,
                    "gpa": e.gpa,
                    "description": e.description,
                    "visible": True,
                }
                for i, e in enumerate(parsed.education)
            ],
            "experience": [
                {
                    "id": f"exp-{i}",
                    "company": e.company,
                    "position": e.position,
                    "date": e.date,
                    "details": e.details,
                    "visible": True,
                }
                for i, e in enumerate(parsed.experience)
            ],
            "projects": [
                {
                    "id": f"proj-{i}",
                    "name": p.name,
                    "role": p.role,
                    "date": p.date,
                    "description": p.description,
                    "link": p.link,
                    "visible": True,
                }
                for i, p in enumerate(parsed.projects)
            ],
            "skillsContent": parsed.skills_content,
            "customSections": {},
            "activeSection": "personal",
            "draggingProjectId": None,
            "sections": [],
            "styleSettings": {
                "themeColor": "#000000",
            },
        }


# Singleton instance
resume_parsing_service = ResumeParsingService()
