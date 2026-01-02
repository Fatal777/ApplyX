"""
Resume AI Suggestions - DigitalOcean Serverless Function
Uses DigitalOcean GenAI (inference.do-ai.run)
"""

import os
import json
import httpx


def main(args):
    resume_text = args.get("resume_text", "")
    job_description = args.get("job_description", "")
    section = args.get("section", "all")
    
    if not resume_text:
        return {
            "statusCode": 400,
            "body": {"error": "resume_text is required"}
        }
    
    api_key = os.environ.get("DO_GENAI_API_KEY")
    if not api_key:
        return {
            "statusCode": 500,
            "body": {"error": "DO_GENAI_API_KEY not configured"}
        }
    
    focus_section = f"Focus especially on the {section} section." if section != "all" else ""
    jd_context = f"\n\nTarget Job Description:\n{job_description}" if job_description else ""
    
    prompt = f"""Analyze this resume and provide specific improvement suggestions.

Resume:
{resume_text[:6000]}
{jd_context}

{focus_section}

Provide 5-8 suggestions in JSON format:
{{
  "suggestions": [
    {{"section": "experience", "type": "improve", "original": "...", "suggested": "...", "reason": "..."}}
  ],
  "overall_score": 75,
  "top_strengths": ["strength 1"],
  "priority_improvements": ["improvement 1"]
}}"""

    try:
        response = httpx.post(
            "https://inference.do-ai.run/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama3.3-70b-instruct",
                "messages": [
                    {"role": "system", "content": "You are an expert resume writer. Respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 2000,
            },
            timeout=30.0
        )
        
        result = response.json()
        
        if "error" in result:
            return {"statusCode": 500, "body": {"error": result["error"]}}
        
        content = result["choices"][0]["message"]["content"]
        suggestions = json.loads(content)
        
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": suggestions
        }
        
    except json.JSONDecodeError as e:
        return {"statusCode": 500, "body": {"error": f"JSON parse error: {str(e)}", "raw": content[:500]}}
    except Exception as e:
        return {"statusCode": 500, "body": {"error": f"Request failed: {str(e)}"}}
