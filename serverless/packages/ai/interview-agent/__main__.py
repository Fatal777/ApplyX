"""Mock Interview Agent - DigitalOcean Serverless Function"""

import os
import json
import urllib.request
import urllib.error

PERSONAS = {
    "friendly": {"name": "Alex", "style": "warm, encouraging"},
    "technical": {"name": "Dr. Chen", "style": "analytical, detail-oriented"},
    "behavioral": {"name": "Sarah", "style": "conversational, interested in stories"},
    "challenging": {"name": "Michael", "style": "direct, challenging"}
}

def call_llm(api_key, messages, max_tokens=400):
    data = json.dumps({
        "model": "llama3.3-70b-instruct",
        "messages": messages,
        "temperature": 0.8,
        "max_tokens": max_tokens,
    }).encode('utf-8')
    
    req = urllib.request.Request(
        "https://inference.do-ai.run/v1/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )
    
    with urllib.request.urlopen(req, timeout=55) as response:
        result = json.loads(response.read().decode('utf-8'))
    
    return result["choices"][0]["message"]["content"]

def main(args):
    action = args.get("action", "respond")
    persona_key = args.get("persona", "friendly")
    job_role = args.get("job_role", "Software Engineer")
    history = args.get("conversation_history", [])
    user_message = args.get("user_message", "")
    
    persona = PERSONAS.get(persona_key, PERSONAS["friendly"])
    
    api_key = os.environ.get("DO_GENAI_API_KEY")
    if not api_key:
        return {"statusCode": 500, "body": {"error": "API key not configured"}}
    
    try:
        if action == "start":
            prompt = f"You are {persona['name']}, a {persona['style']} interviewer for {job_role}. Start with a greeting and warm-up question. Keep it under 100 words."
            opening = call_llm(api_key, [{"role": "user", "content": prompt}], 300)
            return {
                "statusCode": 200,
                "body": {
                    "interviewer_name": persona["name"],
                    "message": opening,
                    "question_number": 1,
                    "phase": "warmup"
                }
            }
        
        elif action == "respond":
            messages = [{"role": "system", "content": f"You are {persona['name']}, interviewing for {job_role}. Ask one question at a time. Keep under 150 words."}]
            for m in history:
                messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
            messages.append({"role": "user", "content": user_message})
            
            response = call_llm(api_key, messages)
            q_count = len([m for m in history if m.get("role") == "assistant"]) + 1
            
            return {
                "statusCode": 200,
                "body": {
                    "message": response,
                    "question_number": q_count,
                    "phase": "main" if q_count <= 7 else "closing",
                    "is_complete": q_count >= 8
                }
            }
        
        elif action == "feedback":
            convo = "\n".join([f"{'Interviewer' if m.get('role')=='assistant' else 'Candidate'}: {m.get('content','')}" for m in history])
            prompt = f"Analyze this {job_role} interview and give JSON feedback: overall_score (0-100), strengths (list), improvements (list).\n\n{convo[:3000]}"
            
            feedback = call_llm(api_key, [{"role": "user", "content": prompt}], 1000)
            try:
                return {"statusCode": 200, "body": json.loads(feedback)}
            except:
                return {"statusCode": 200, "body": {"raw_response": feedback}}
        
        else:
            return {"statusCode": 400, "body": {"error": f"Unknown action: {action}"}}
    
    except Exception as e:
        return {"statusCode": 500, "body": {"error": str(e)}}
