"""Resume AI Suggestions - DigitalOcean Serverless Function"""

import os
import json
import urllib.request
import urllib.error

def main(args):
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
        data = json.dumps({
            "model": "llama3.3-70b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 1500,
        }).encode('utf-8')
        
        req = urllib.request.Request(
            "https://inference.do-ai.run/v1/chat/completions",
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
        
        with urllib.request.urlopen(req, timeout=25) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if "error" in result:
            return {"statusCode": 500, "body": {"error": str(result["error"])}}
        
        content = result["choices"][0]["message"]["content"]
        
        try:
            parsed = json.loads(content)
            return {"statusCode": 200, "body": parsed}
        except:
            return {"statusCode": 200, "body": {"raw_response": content}}
        
    except urllib.error.HTTPError as e:
        return {"statusCode": 500, "body": {"error": f"HTTP {e.code}: {e.reason}"}}
    except Exception as e:
        return {"statusCode": 500, "body": {"error": str(e)}}
