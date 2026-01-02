"""Resume AI Suggestions - DigitalOcean Serverless Function"""

import os
import json

def main(args):
    try:
        import httpx
    except ImportError:
        return {"statusCode": 500, "body": {"error": "httpx not installed"}}
    
    resume_text = args.get("resume_text", "")
    if not resume_text:
        return {"statusCode": 400, "body": {"error": "resume_text is required"}}
    
    api_key = os.environ.get("DO_GENAI_API_KEY")
    if not api_key:
        return {"statusCode": 500, "body": {"error": "API key not configured"}}
    
    prompt = f"""Analyze this resume and provide improvement suggestions in JSON format:
Resume: {resume_text[:4000]}

Return ONLY valid JSON:
{{"suggestions": [{{"section": "experience", "suggestion": "...", "reason": "..."}}], "overall_score": 75}}"""

    try:
        response = httpx.post(
            "https://inference.do-ai.run/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "llama3.3-70b-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 1500,
            },
            timeout=25.0
        )
        
        result = response.json()
        
        if "error" in result:
            return {"statusCode": 500, "body": {"error": str(result["error"])}}
        
        content = result["choices"][0]["message"]["content"]
        
        # Try to parse as JSON, return raw if fails
        try:
            parsed = json.loads(content)
            return {"statusCode": 200, "body": parsed}
        except:
            return {"statusCode": 200, "body": {"raw_response": content}}
        
    except Exception as e:
        return {"statusCode": 500, "body": {"error": str(e)}}
