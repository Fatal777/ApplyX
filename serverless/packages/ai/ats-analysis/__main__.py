"""
ATS Analysis Function - Real Resume Scoring
Analyzes resume like Workday/Lever ATS systems
Provides: ATS compatibility score, section scores, keyword analysis, and recommendations
"""

import os
import json
import urllib.request
import urllib.error


def main(args):
    """
    Comprehensive ATS analysis like Workday, Lever, Greenhouse
    
    Args:
        resume_text: The extracted text from the resume
        job_description: Optional job description for keyword matching
    
    Returns:
        ats_score: Overall ATS compatibility (0-100)
        section_scores: Individual section ratings
        keyword_analysis: Keywords found and missing
        recommendations: Prioritized improvement suggestions
    """
    resume_text = args.get("resume_text", "")
    job_description = args.get("job_description", "")
    
    if not resume_text or len(resume_text.strip()) < 50:
        return {
            "error": "Resume text is required and must be at least 50 characters"
        }
    
    api_key = os.environ.get("DO_GENAI_API_KEY")
    if not api_key:
        return {"error": "DO_GENAI_API_KEY not configured"}
    
    # Workday-style ATS analysis prompt
    prompt = f"""You are an ATS (Applicant Tracking System) analyzer like Workday, Lever, or Greenhouse.
Analyze this resume for ATS compatibility and provide detailed scoring.

Resume:
{resume_text[:5000]}

{"Job Description for keyword matching:" + job_description[:1500] if job_description else ""}

Analyze and score these ATS factors:
1. FORMAT & READABILITY: Clean structure, proper headings, no tables/images
2. KEYWORD OPTIMIZATION: Industry terms, action verbs, skills mentioned
3. SECTION COMPLETENESS: Contact, Summary, Experience, Education, Skills
4. IMPACT METRICS: Quantified achievements, numbers, percentages
5. GRAMMAR & CLARITY: Professional language, no errors

Respond with ONLY valid JSON:
{{
  "ats_score": 85,
  "section_scores": [
    {{"section": "Work Experience", "score": 92, "status": "Excellent", "feedback": "Strong quantified achievements"}},
    {{"section": "Skills & Keywords", "score": 78, "status": "Good", "feedback": "Add more technical terms"}},
    {{"section": "Professional Summary", "score": 85, "status": "Strong", "feedback": "Clear value proposition"}},
    {{"section": "Education", "score": 90, "status": "Excellent", "feedback": "Well formatted"}},
    {{"section": "Format & Structure", "score": 88, "status": "Strong", "feedback": "ATS-friendly layout"}}
  ],
  "keyword_analysis": {{
    "found": ["python", "javascript", "team leadership"],
    "missing": ["agile", "CI/CD", "cloud"],
    "density_score": 75
  }},
  "recommendations": [
    {{"priority": "High", "category": "Keywords", "text": "Add missing technical terms", "impact": "+8 points"}},
    {{"priority": "High", "category": "Metrics", "text": "Replace 'managed team' with 'Led team of 8 engineers'", "impact": "+5 points"}},
    {{"priority": "Medium", "category": "Format", "text": "Use consistent date format", "impact": "+3 points"}}
  ],
  "summary": "Your resume has strong content but needs keyword optimization for ATS systems."
}}"""

    try:
        request_data = json.dumps({
            "model": "llama3.3-70b-instruct",
            "messages": [
                {"role": "system", "content": "You are an expert ATS analyzer. Provide accurate, actionable resume scoring. Be specific and honest in your assessments."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1500,
            "temperature": 0.3,
        }).encode('utf-8')
        
        req = urllib.request.Request(
            "https://inference.do-ai.run/v1/chat/completions",
            data=request_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # Parse JSON from response
        try:
            # Find JSON in response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                parsed = json.loads(content[json_start:json_end])
                return {
                    "success": True,
                    **parsed
                }
        except json.JSONDecodeError:
            pass
        
        return {
            "error": "Failed to parse LLM response",
            "raw_content": content[:500]
        }
        
    except urllib.error.HTTPError as e:
        return {"error": f"API error: {e.code}"}
    except Exception as e:
        return {"error": str(e)}
