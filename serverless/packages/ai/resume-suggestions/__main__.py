"""
Resume AI Suggestions - DigitalOcean Serverless Function
Generates AI-powered improvement suggestions for resumes
Uses DigitalOcean GenAI (GPT-oss-120b)
"""

import os
import json
import httpx


def main(args):
    """
    Generate AI suggestions for resume improvement.
    
    Args:
        resume_text: The full text content of the resume
        job_description: (Optional) Target job description for tailored suggestions
        section: (Optional) Specific section to focus on (experience, skills, summary)
    
    Returns:
        List of improvement suggestions with type, original, suggested, and reason
    """
    
    # Get inputs
    resume_text = args.get("resume_text", "")
    job_description = args.get("job_description", "")
    section = args.get("section", "all")
    
    if not resume_text:
        return {
            "statusCode": 400,
            "body": {"error": "resume_text is required"}
        }
    
    # DO GenAI endpoint
    api_key = os.environ.get("DO_GENAI_API_KEY")
    if not api_key:
        return {
            "statusCode": 500,
            "body": {"error": "DO_GENAI_API_KEY not configured"}
        }
    
    # Build the prompt
    focus_section = f"Focus especially on the {section} section." if section != "all" else ""
    jd_context = f"\n\nTarget Job Description:\n{job_description}" if job_description else ""
    
    prompt = f"""You are an expert resume consultant. Analyze this resume and provide specific, actionable improvement suggestions.

Resume:
{resume_text[:6000]}
{jd_context}

{focus_section}

Provide 5-8 specific suggestions. For each suggestion, include:
1. The section it applies to (experience, skills, summary, education, format)
2. The type of change (improve, add, remove, rewrite, quantify)
3. The original text (if applicable, keep short)
4. Your suggested improvement
5. Brief reason why this helps

Focus on:
- Adding quantifiable achievements (numbers, percentages, metrics)
- Using stronger action verbs
- Improving clarity and impact
- ATS optimization and keywords
- Eliminating weak or vague language
{"- Tailoring to the job description" if job_description else ""}

Respond with valid JSON only:
{{
  "suggestions": [
    {{
      "section": "experience|skills|summary|education|format",
      "type": "improve|add|remove|rewrite|quantify",
      "original": "original text if applicable",
      "suggested": "your improved version",
      "reason": "why this improvement helps"
    }}
  ],
  "overall_score": 0-100,
  "top_strengths": ["strength 1", "strength 2"],
  "priority_improvements": ["improvement 1", "improvement 2"]
}}"""

    try:
        # Call DO GenAI API
        response = httpx.post(
            "https://api.digitalocean.com/v2/gen-ai/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-oss-120b",
                "messages": [
                    {
                        "role": "system", 
                        "content": "You are an expert career coach and resume writer. Provide specific, actionable feedback that helps candidates stand out. Always respond with valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 2000,
            },
            timeout=30.0
        )
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        suggestions = json.loads(content)
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": result
        }
        
    except json.JSONDecodeError as e:
        return {
            "statusCode": 500,
            "body": {"error": f"Failed to parse AI response: {str(e)}"}
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": f"AI processing failed: {str(e)}"}
        }
