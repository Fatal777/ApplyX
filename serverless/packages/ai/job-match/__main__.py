"""
Job Match Analysis Function
Analyzes resume against job roles using DO GenAI to provide real match scores
"""

import os
import json
import urllib.request
import urllib.error


def main(args):
    """
    Analyze resume text against common job roles
    
    Args:
        resume_text: The extracted text from the resume
        target_roles: Optional list of specific roles to match against
    
    Returns:
        job_matches: List of {role, match_percent, reasons, improvements}
    """
    resume_text = args.get("resume_text", "")
    target_roles = args.get("target_roles", [
        "Software Engineer",
        "Senior Developer", 
        "Product Manager",
        "Data Scientist",
        "DevOps Engineer"
    ])
    
    if not resume_text or len(resume_text.strip()) < 50:
        return {
            "error": "Resume text is required and must be at least 50 characters",
            "job_matches": []
        }
    
    api_key = os.environ.get("DO_GENAI_API_KEY")
    if not api_key:
        return {"error": "DO_GENAI_API_KEY not configured", "job_matches": []}
    
    # Build prompt for job matching
    roles_list = ", ".join(target_roles[:5])  # Limit to 5 roles
    
    prompt = f"""Analyze this resume and rate how well it matches each of these job roles: {roles_list}

Resume:
{resume_text[:4000]}

For each role, provide:
1. match_percent (0-100): How well the resume matches
2. strengths: 2-3 key strengths for this role
3. gaps: 1-2 missing skills or experiences

Respond with valid JSON only:
{{
  "job_matches": [
    {{
      "role": "Software Engineer",
      "match_percent": 85,
      "strengths": ["Strong Python skills", "Experience with APIs"],
      "gaps": ["No cloud experience mentioned"]
    }}
  ]
}}"""

    try:
        # Call DO GenAI API
        request_data = json.dumps({
            "model": "llama3.3-70b-instruct",
            "messages": [
                {"role": "system", "content": "You are a career advisor AI. Analyze resumes and provide accurate job matching scores based on skills, experience, and qualifications."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1000,
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
                    "job_matches": parsed.get("job_matches", [])
                }
        except json.JSONDecodeError:
            pass
        
        return {
            "error": "Failed to parse LLM response",
            "raw_content": content[:500],
            "job_matches": []
        }
        
    except urllib.error.HTTPError as e:
        return {
            "error": f"API error: {e.code}",
            "job_matches": []
        }
    except Exception as e:
        return {
            "error": str(e),
            "job_matches": []
        }
