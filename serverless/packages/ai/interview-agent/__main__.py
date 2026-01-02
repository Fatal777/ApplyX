"""
Mock Interview Agent - DigitalOcean Serverless Function
AI-powered interviewer for practice interviews
Uses DigitalOcean GenAI (GPT-oss-120b)
"""

import os
import json
import httpx


# Interview personas with different styles
PERSONAS = {
    "friendly": {
        "name": "Alex",
        "style": "warm, encouraging, supportive",
        "system_prompt": "You are Alex, a friendly interviewer who puts candidates at ease. You're warm, encouraging, and provide positive reinforcement while still asking probing follow-up questions."
    },
    "technical": {
        "name": "Dr. Chen",
        "style": "analytical, detail-oriented, thorough",
        "system_prompt": "You are Dr. Chen, a senior technical interviewer. You focus on technical depth, ask follow-up questions to understand the candidate's thinking process, and probe for specific implementation details."
    },
    "behavioral": {
        "name": "Sarah",
        "style": "conversational, interested in stories",
        "system_prompt": "You are Sarah, an HR professional conducting a behavioral interview. You're interested in specific examples, use the STAR method, and dig deeper into candidates' past experiences."
    },
    "challenging": {
        "name": "Michael",
        "style": "direct, challenging, fast-paced",
        "system_prompt": "You are Michael, a tough but fair interviewer. You challenge assumptions, ask difficult follow-ups, and push candidates to think on their feet. You're not mean, but you don't let vague answers slide."
    }
}


def call_do_genai(api_key, messages, max_tokens=400):
    """Call DO GenAI API"""
    response = httpx.post(
        "https://api.digitalocean.com/v2/gen-ai/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "gpt-oss-120b",
            "messages": messages,
            "temperature": 0.8,
            "max_tokens": max_tokens,
        },
        timeout=60.0
    )
    result = response.json()
    return result["choices"][0]["message"]["content"]


def main(args):
    """
    Process interview interaction.
    
    Args:
        action: "start" | "respond" | "feedback"
        persona: "friendly" | "technical" | "behavioral" | "challenging"
        job_role: Target job role/title
        resume_text: (Optional) Candidate's resume for context
        conversation_history: List of previous messages
        user_message: User's response to process
    """
    
    action = args.get("action", "respond")
    persona_key = args.get("persona", "friendly")
    job_role = args.get("job_role", "Software Engineer")
    resume_text = args.get("resume_text", "")
    history = args.get("conversation_history", [])
    user_message = args.get("user_message", "")
    
    # Get persona
    persona = PERSONAS.get(persona_key, PERSONAS["friendly"])
    
    # DO GenAI API key
    api_key = os.environ.get("DO_GENAI_API_KEY")
    if not api_key:
        return {
            "statusCode": 500,
            "body": {"error": "DO_GENAI_API_KEY not configured"}
        }
    
    if action == "start":
        return start_interview(api_key, persona, job_role, resume_text)
    elif action == "respond":
        return process_response(api_key, persona, job_role, history, user_message)
    elif action == "feedback":
        return generate_feedback(api_key, persona, job_role, history)
    else:
        return {
            "statusCode": 400,
            "body": {"error": f"Unknown action: {action}"}
        }


def start_interview(api_key, persona, job_role, resume_text):
    """Start a new interview session"""
    
    resume_context = f"\n\nCandidate's Resume:\n{resume_text[:2000]}" if resume_text else ""
    
    prompt = f"""{persona['system_prompt']}

You are interviewing a candidate for the position of: {job_role}
{resume_context}

Start the interview with:
1. A brief, natural greeting and introduction
2. A simple warm-up question to help them relax

Keep it conversational and under 100 words."""

    try:
        opening = call_do_genai(api_key, [{"role": "user", "content": prompt}], max_tokens=300)
        
        return {
            "statusCode": 200,
            "body": {
                "interviewer_name": persona["name"],
                "interviewer_style": persona["style"],
                "message": opening,
                "question_number": 1,
                "phase": "warmup"
            }
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": f"Failed to start interview: {str(e)}"}
        }


def process_response(api_key, persona, job_role, history, user_message):
    """Process user's response and generate next question"""
    
    messages = [
        {
            "role": "system",
            "content": f"""{persona['system_prompt']}

You are conducting an interview for: {job_role}

Guidelines:
- Ask one question at a time
- Provide brief acknowledgment of their answer before your next question
- Mix behavioral (STAR), situational, and role-specific questions
- After 6-8 questions, wrap up the interview naturally
- Keep responses under 150 words"""
        }
    ]
    
    for msg in history:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
    
    messages.append({"role": "user", "content": user_message})
    
    try:
        interviewer_response = call_do_genai(api_key, messages, max_tokens=400)
        question_count = len([m for m in history if m.get("role") == "assistant"]) + 1
        
        phase = "warmup" if question_count <= 1 else "main" if question_count <= 7 else "closing"
        
        return {
            "statusCode": 200,
            "body": {
                "message": interviewer_response,
                "question_number": question_count,
                "phase": phase,
                "is_complete": question_count >= 8
            }
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": f"Failed to process response: {str(e)}"}
        }


def generate_feedback(api_key, persona, job_role, history):
    """Generate comprehensive feedback on the interview"""
    
    conversation = "\n".join([
        f"{'Interviewer' if m.get('role') == 'assistant' else 'Candidate'}: {m.get('content', '')}"
        for m in history
    ])
    
    prompt = f"""Analyze this interview for a {job_role} position and provide comprehensive feedback.

Interview Transcript:
{conversation[:4000]}

Provide feedback in this JSON format:
{{
  "overall_score": 0-100,
  "communication": {{"score": 0-100, "feedback": "specific feedback"}},
  "content_quality": {{"score": 0-100, "feedback": "feedback on substance"}},
  "structure": {{"score": 0-100, "feedback": "feedback on organization"}},
  "confidence": {{"score": 0-100, "feedback": "feedback on delivery"}},
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area 1", "area 2"],
  "sample_improved_answer": {{
    "question": "one question they could improve on",
    "improved_answer": "example of a stronger answer"
  }}
}}"""

    try:
        messages = [
            {"role": "system", "content": "You are an expert interview coach. Provide specific, actionable feedback. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = call_do_genai(api_key, messages, max_tokens=1500)
        feedback = json.loads(response)
        
        return {
            "statusCode": 200,
            "body": feedback
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": f"Failed to generate feedback: {str(e)}"}
        }
