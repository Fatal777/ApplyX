"""
Resume Parser Function
Parses resume text into structured sections using GPT-oss-20b on DigitalOcean GenAI
Returns structured JSON with personal info, experience, education, projects, skills
"""

import os
import json
import urllib.request
import urllib.error


def main(args):
    """
    Parse resume text into structured format for the Resume Builder
    
    Args:
        resume_text: The extracted text from the resume
    
    Returns:
        Structured resume data with all sections
    """
    resume_text = args.get("resume_text", "")
    
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
    
    # Structured extraction prompt
    prompt = f"""Parse this resume into a structured JSON format. Extract ALL information accurately.

Resume Text:
{resume_text[:10000]}

Extract and return ONLY valid JSON with this exact structure:
{{
  "personal": {{
    "name": "Full Name from resume",
    "title": "Job title or headline",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, State/Country",
    "linkedin": "linkedin URL if present",
    "github": "github URL if present",
    "website": "portfolio URL if present"
  }},
  "experience": [
    {{
      "company": "Company Name",
      "position": "Job Title",
      "date": "Start - End (e.g., Jan 2020 - Present)",
      "details": "<ul><li>Achievement or responsibility 1</li><li>Achievement 2</li></ul>"
    }}
  ],
  "education": [
    {{
      "school": "University Name",
      "degree": "Degree Type (e.g., Bachelor of Science)",
      "major": "Field of Study",
      "start_date": "Start year",
      "end_date": "End year or Expected",
      "gpa": "GPA if mentioned"
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "role": "Your role (optional)",
      "date": "Date range",
      "description": "<ul><li>What you built</li><li>Technologies used</li></ul>",
      "link": "Project URL if present"
    }}
  ],
  "skills_content": "<p><strong>Programming:</strong> Python, JavaScript, etc.</p><p><strong>Tools:</strong> Docker, AWS, etc.</p>"
}}

IMPORTANT:
- For bullet points in experience/projects, use HTML: <ul><li>point</li></ul>
- Extract ALL jobs, ALL education entries, ALL projects mentioned
- Use empty string "" for missing fields, never null
- Return ONLY the JSON, no explanation"""

    try:
        request_data = json.dumps({
            "model": "openai-gpt-oss-120b",  # Larger model for better accuracy
            "messages": [
                {"role": "system", "content": "You are an expert resume parser. Extract structured data accurately from resumes. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 3000,
            "temperature": 0.1,
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
        
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # Parse JSON from response
        try:
            # Find JSON in response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                parsed = json.loads(content[json_start:json_end])
                
                # Validate required structure
                if "personal" not in parsed:
                    parsed["personal"] = {}
                if "experience" not in parsed:
                    parsed["experience"] = []
                if "education" not in parsed:
                    parsed["education"] = []
                if "projects" not in parsed:
                    parsed["projects"] = []
                if "skills_content" not in parsed:
                    parsed["skills_content"] = ""
                
                return {
                    "statusCode": 200,
                    "body": {
                        "success": True,
                        **parsed
                    }
                }
        except json.JSONDecodeError as e:
            return {
                "statusCode": 200,
                "body": {
                    "error": f"Failed to parse LLM response: {str(e)}",
                    "raw_content": content[:1000]
                }
            }
        
        return {
            "statusCode": 200,
            "body": {
                "error": "No valid JSON found in LLM response",
                "raw_content": content[:1000]
            }
        }
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        return {
            "statusCode": 500,
            "body": {"error": f"API error: {e.code}", "details": error_body[:500]}
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": str(e)}
        }
