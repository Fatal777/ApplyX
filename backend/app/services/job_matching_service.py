"""Service implementing job-resume matching logic.

Primary algorithm: TF-IDF + cosine similarity on combined textual
representations of resume profile vs. job listing content.

Features:
- TF-IDF based semantic matching (with scikit-learn)
- Experience-level filtering (fresher/mid/senior)
- Skill-based boosting
- Fallback to keyword overlap if scikit-learn unavailable

We deliberately keep this stateless so it can be safely instantiated
inside Celery tasks / API requests without shared global state.
"""
from __future__ import annotations

import logging
import re
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# Attempt to import scikit-learn; provide graceful degradation if unavailable.
try:  # pragma: no cover
    from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
    from sklearn.metrics.pairwise import cosine_similarity  # type: ignore
    _SKLEARN_AVAILABLE = True
except Exception:  # pragma: no cover
    logger.warning("scikit-learn unavailable; falling back to keyword overlap matching")
    _SKLEARN_AVAILABLE = False


# Experience level mapping
EXPERIENCE_LEVELS = {
    "fresher": (0, 2),     # 0-2 years
    "junior": (0, 2),      # 0-2 years  
    "mid": (2, 5),         # 2-5 years
    "intermediate": (2, 5),
    "senior": (5, 15),     # 5+ years
    "lead": (5, 15),
    "principal": (8, 20),
    "architect": (8, 20),
}


class JobMatchingService:
    """Match resume profile to a set of job listings.

    Each job listing dict SHOULD contain at minimum:
    {
        'title': str,
        'description': str,
        'skills': List[str] | str (optional),
        'redirect_url': str,
        'portal': str,
        'experience': str (optional, e.g., "0-2 years", "5+ years")
    }
    """

    def __init__(self) -> None:
        if _SKLEARN_AVAILABLE:
            # Reasonable defaults for short textual fields
            self._vectorizer = TfidfVectorizer(
                max_features=1000,
                ngram_range=(1, 2),
                stop_words="english",
            )
        else:
            self._vectorizer = None  # type: ignore

    # -------------------- Public API --------------------
    def match_jobs(
        self,
        resume_keywords: List[str],
        resume_skills: List[str],
        job_listings: List[Dict[str, Any]],
        top_n: int = 20,
        experience_years: Optional[int] = None,
        experience_level: Optional[str] = None,
        prefer_remote: bool = False,
    ) -> List[Dict[str, Any]]:
        """Return top-N matched jobs with a `match_score` field added.

        Args:
            resume_keywords: Keywords extracted from resume
            resume_skills: Skills extracted from resume
            job_listings: List of job dicts to match against
            top_n: Number of results to return
            experience_years: Candidate's years of experience (for filtering)
            experience_level: Candidate's level (fresher/mid/senior)
            prefer_remote: Boost remote jobs if True
            
        Returns:
            List of matched jobs with match_score added
        """
        if not job_listings:
            return []

        # Build resume profile text
        profile_text = " ".join(resume_keywords + resume_skills).strip()
        if not profile_text:
            profile_text = "generic profile"  # Avoid empty vector errors

        # Pre-filter by experience if provided
        if experience_years is not None or experience_level:
            job_listings = self._filter_by_experience(
                job_listings, experience_years, experience_level
            )

        if not job_listings:
            return []

        if _SKLEARN_AVAILABLE:
            results = self._match_with_tfidf(profile_text, job_listings, top_n * 2)
        else:
            results = self._match_with_overlap(resume_keywords, resume_skills, job_listings, top_n * 2)

        # Apply boosting factors
        results = self._apply_boosts(
            results, 
            resume_skills, 
            prefer_remote=prefer_remote
        )

        # Re-sort by final score and return top_n
        results.sort(key=lambda j: j.get("match_score", 0), reverse=True)
        return results[:top_n]

    # ------------------- Experience Filtering -------------------
    def _filter_by_experience(
        self,
        job_listings: List[Dict[str, Any]],
        experience_years: Optional[int],
        experience_level: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Filter jobs to match candidate's experience level."""
        if experience_years is None and experience_level is None:
            return job_listings

        # Determine candidate's experience range
        if experience_years is not None:
            candidate_min = max(0, experience_years - 1)
            candidate_max = experience_years + 2
        elif experience_level:
            level_key = experience_level.lower().strip()
            if level_key in EXPERIENCE_LEVELS:
                candidate_min, candidate_max = EXPERIENCE_LEVELS[level_key]
            else:
                # Default to mid-level
                candidate_min, candidate_max = 2, 5
        else:
            return job_listings

        filtered = []
        for job in job_listings:
            job_exp = job.get("experience", "")
            if not job_exp:
                # No experience specified - include job
                filtered.append(job)
                continue

            job_min, job_max = self._parse_experience_string(job_exp)
            
            # Check for overlap between candidate range and job requirement
            if job_min <= candidate_max and job_max >= candidate_min:
                filtered.append(job)

        return filtered if filtered else job_listings  # Return all if filter too strict

    def _parse_experience_string(self, exp_str: str) -> Tuple[int, int]:
        """Parse experience string like '0-2 years', '5+ years', '3-5 yrs'.
        
        Returns (min_years, max_years) tuple.
        """
        exp_str = exp_str.lower().strip()
        
        # Handle "X+ years"
        match = re.search(r'(\d+)\s*\+', exp_str)
        if match:
            min_years = int(match.group(1))
            return (min_years, min_years + 10)
        
        # Handle "X-Y years"
        match = re.search(r'(\d+)\s*[-–]\s*(\d+)', exp_str)
        if match:
            return (int(match.group(1)), int(match.group(2)))
        
        # Handle single number
        match = re.search(r'(\d+)', exp_str)
        if match:
            years = int(match.group(1))
            return (max(0, years - 1), years + 1)
        
        # Check for level keywords
        for level, (min_y, max_y) in EXPERIENCE_LEVELS.items():
            if level in exp_str:
                return (min_y, max_y)
        
        # Default: accept any
        return (0, 20)

    # ------------------- Boosting Logic -------------------
    def _apply_boosts(
        self,
        results: List[Dict[str, Any]],
        resume_skills: List[str],
        prefer_remote: bool = False,
    ) -> List[Dict[str, Any]]:
        """Apply boosting factors to match scores."""
        resume_skills_lower = set(s.lower() for s in resume_skills)
        
        for job in results:
            score = job.get("match_score", 0)
            boost = 0.0
            
            # Skill match boost (up to +15%)
            job_skills = job.get("skills", [])
            if isinstance(job_skills, list):
                job_skills_lower = set(s.lower() for s in job_skills)
            else:
                job_skills_lower = set(str(job_skills).lower().split())
            
            skill_overlap = resume_skills_lower.intersection(job_skills_lower)
            if skill_overlap:
                skill_boost = min(len(skill_overlap) * 3, 15)  # +3% per skill, max +15%
                boost += skill_boost
            
            # Remote job boost
            if prefer_remote:
                location = str(job.get("location", "")).lower()
                is_remote = job.get("is_remote", False)
                if is_remote or "remote" in location:
                    boost += 5
            
            # Recent posting boost (placeholder - would need date parsing)
            # TODO: Add date-based recency boost
            
            # Apply boost
            job["match_score"] = min(100, score + boost)  # Cap at 100
            job["skill_matches"] = list(skill_overlap)  # Store matched skills
        
        return results

    # ------------------ TF-IDF Matching ------------------
    def _match_with_tfidf(
        self,
        profile_text: str,
        job_listings: List[Dict[str, Any]],
        top_n: int,
    ) -> List[Dict[str, Any]]:
        job_texts: List[str] = []
        for job in job_listings:
            title = str(job.get("title", ""))
            desc = str(job.get("description", ""))
            skills_field = job.get("skills", "")
            if isinstance(skills_field, list):
                skills_str = " ".join(skills_field)
            else:
                skills_str = str(skills_field)
            job_texts.append(f"{title} {desc} {skills_str}".strip())

        # Vectorize combined corpus (profile + job texts)
        corpus = [profile_text] + job_texts
        try:
            matrix = self._vectorizer.fit_transform(corpus)
        except Exception as e:  # pragma: no cover
            logger.error("TF-IDF vectorization failed; falling back to overlap: %s", e)
            return self._match_with_overlap(profile_text.split(), profile_text.split(), job_listings, top_n)

        profile_vec = matrix[0:1]
        job_vecs = matrix[1:]
        similarities = cosine_similarity(profile_vec, job_vecs)[0]

        # Rank jobs by similarity
        ranked = sorted(
            enumerate(similarities), key=lambda x: x[1], reverse=True
        )[:top_n]

        results: List[Dict[str, Any]] = []
        for idx, score in ranked:
            job = dict(job_listings[idx])  # shallow copy
            job["match_score"] = round(float(score * 100), 2)  # percentage-like
            results.append(job)
        return results

    # --------------- Keyword Overlap Matching --------------
    def _match_with_overlap(
        self,
        resume_keywords: List[str],
        resume_skills: List[str],
        job_listings: List[Dict[str, Any]],
        top_n: int,
    ) -> List[Dict[str, Any]]:
        profile_set = set(k.lower() for k in (resume_keywords + resume_skills))
        if not profile_set:
            profile_set = {"generic"}

        scored: List[Dict[str, Any]] = []
        for job in job_listings:
            skills_field = job.get("skills", [])
            if isinstance(skills_field, list):
                job_tokens = set(s.lower() for s in skills_field)
            else:
                job_tokens = set(str(skills_field).lower().split())

            overlap = profile_set.intersection(job_tokens)
            score = (len(overlap) / max(len(profile_set), 1)) * 100.0
            entry = dict(job)
            entry["match_score"] = round(score, 2)
            scored.append(entry)

        # Rank & slice
        scored.sort(key=lambda j: j["match_score"], reverse=True)
        return scored[:top_n]


# Utility function for external use
def infer_experience_from_resume(resume_text: str) -> Tuple[Optional[int], Optional[str]]:
    """Infer experience years and level from resume text.
    
    Returns (years, level) tuple. Either can be None if not determined.
    """
    text_lower = resume_text.lower()
    
    # Look for explicit experience mentions
    patterns = [
        r'(\d+)\s*\+?\s*years?\s+(?:of\s+)?experience',
        r'experience[:\s]+(\d+)\s*\+?\s*years?',
        r'(\d+)\s*years?\s+(?:of\s+)?(?:professional|industry|work)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            years = int(match.group(1))
            # Determine level from years
            if years <= 2:
                level = "fresher"
            elif years < 5:
                level = "mid"
            else:
                level = "senior"  # 5+ years = senior
            return (years, level)
    
    # Check for level keywords
    if any(kw in text_lower for kw in ["fresher", "fresh graduate", "entry level", "intern"]):
        return (0, "fresher")
    elif any(kw in text_lower for kw in ["senior", "lead", "principal", "architect", "staff"]):
        return (6, "senior")
    
    # Default to mid-level
    return (None, None)


__all__ = ["JobMatchingService", "infer_experience_from_resume"]
