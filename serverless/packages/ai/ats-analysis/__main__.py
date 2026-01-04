"""
ATS Analysis Function - Real Resume Scoring
Analyzes resume focusing on content quality, experience, and skills
Provides: ATS compatibility score, section scores, keyword analysis, and recommendations
"""

import os
import json
import urllib.request
import urllib.error


def main(args):
    """
    Balanced ATS analysis focusing on content quality over strict formatting
    
    Args:
        resume_text: The extracted text from the resume
        job_description: Optional job description for keyword matching
    
    Returns:
        ats_score: Overall score (0-100)
        section_scores: Individual section ratings
        keyword_analysis: Keywords found and missing
        recommendations: Prioritized improvement suggestions
    """
    resume_text = args.get("resume_text", "")
    job_description = args.get("job_description", "")
    
    if not resume_text or len(resume_text.strip()) < 50:
        return {
            "statusCode": 400,
            "body": {"error": "Resume text is required and must be at least 50 characters"}
        }
    
    api_key = os.environ.get("DO_GENAI_API_KEY")
    if not api_key:
        return {
            "statusCode": 500,
            "body": {"error": "DO_GENAI_API_KEY not configured"}
        }
    
    # Balanced scoring prompt - focuses on content quality
    prompt = f"""You are a fair and balanced resume analyzer. Score this resume based primarily on CONTENT QUALITY, not formatting strictness.

Resume:
{resume_text[:5000]}

{("Job Description for context:" + job_description[:1500]) if job_description else ""}

SCORING GUIDELINES (be fair, not harsh):
- A resume with solid experience and skills should score 65-80 even without perfect formatting
- Strong technical skills or relevant experience = major positive (add 15-20 points)
- Multiple years of experience = major positive (add 10-15 points)
- Clear job titles and companies = positive (add 5-10 points)
- Education credentials = positive (add 5-10 points)
- Base score starts at 50 for any coherent resume with work experience

Score these factors with BALANCED weights:
1. EXPERIENCE QUALITY (40%): Relevant job history, tenure, progression
2. SKILLS & EXPERTISE (25%): Technical skills, tools, languages mentioned
3. EDUCATION (15%): Degrees, certifications, relevant coursework
4. CLARITY & STRUCTURE (10%): Readability, organization
5. IMPACT & ACHIEVEMENTS (10%): Quantified results, accomplishments

A resume with:
- 3+ years experience = minimum 60 base
- Technical skills listed = add 10-15
- Clear job progression = add 5-10
- Education = add 5-10

Respond with ONLY valid JSON:
{{
  "ats_score": 75,
  "section_scores": [
    {{"section": "Work Experience", "score": 80, "status": "Strong", "feedback": "Good career progression shown"}},
    {{"section": "Skills & Expertise", "score": 75, "status": "Good", "feedback": "Solid technical foundation"}},
    {{"section": "Education", "score": 85, "status": "Strong", "feedback": "Relevant degree"}},
    {{"section": "Clarity", "score": 70, "status": "Good", "feedback": "Well organized"}},
    {{"section": "Impact", "score": 65, "status": "Fair", "feedback": "Could add more metrics"}}
  ],
  "keyword_analysis": {{
    "found": ["python", "javascript", "team leadership"],
    "missing": ["agile", "CI/CD"],
    "density_score": 70
  }},
  "recommendations": [
    {{"priority": "Medium", "category": "Impact", "text": "Add specific metrics to achievements", "impact": "+5 points"}},
    {{"priority": "Low", "category": "Keywords", "text": "Consider adding industry buzzwords", "impact": "+3 points"}}
  ],
  "summary": "Solid resume with good experience. Minor improvements can boost visibility."
}}"""

    try:
        request_data = json.dumps({
            "model": "llama3.3-70b-instruct",
            "messages": [
                {"role": "system", "content": "You are a fair resume reviewer. Focus on what the candidate HAS accomplished, not what's missing. Be encouraging while providing actionable feedback. A decent resume should score at least 60-70."},
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
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                parsed = json.loads(content[json_start:json_end])
                return {
                    "statusCode": 200,
                    "body": {
                        "success": True,
                        **parsed
                    }
                }
        except json.JSONDecodeError:
            pass
        
        return {
            "statusCode": 200,
            "body": {
                "error": "Failed to parse LLM response",
                "raw_content": content[:500]
            }
        }
        
    except urllib.error.HTTPError as e:
        return {
            "statusCode": 500,
            "body": {"error": f"API error: {e.code}"}
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": str(e)}
        }
