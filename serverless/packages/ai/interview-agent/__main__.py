"""
Mock Interview Agent - DigitalOcean Serverless Function
AI-powered interviewer for practice interviews
"""

import os
import json
from openai import OpenAI


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
    
    Returns:
        next_question or feedback depending on action
    """
    
    action = args.get("action", "respond")
    persona_key = args.get("persona", "friendly")
    job_role = args.get("job_role", "Software Engineer")
    resume_text = args.get("resume_text", "")
    history = args.get("conversation_history", [])
    user_message = args.get("user_message", "")
    
    # Get persona
    persona = PERSONAS.get(persona_key, PERSONAS["friendly"])
    
    # Initialize OpenAI client
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {
            "statusCode": 500,
            "body": {"error": "OpenAI API key not configured"}
        }
    
    client = OpenAI(api_key=api_key)
    
    if action == "start":
        return start_interview(client, persona, job_role, resume_text)
    elif action == "respond":
        return process_response(client, persona, job_role, history, user_message)
    elif action == "feedback":
        return generate_feedback(client, persona, job_role, history)
    else:
        return {
            "statusCode": 400,
            "body": {"error": f"Unknown action: {action}"}
        }


def start_interview(client, persona, job_role, resume_text):
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
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=300,
        )
        
        opening = response.choices[0].message.content
        
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


def process_response(client, persona, job_role, history, user_message):
    """Process user's response and generate next question"""
    
    # Build conversation
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
    
    # Add conversation history
    for msg in history:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
    
    # Add current message
    messages.append({
        "role": "user",
        "content": user_message
    })
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.8,
            max_tokens=400,
        )
        
        interviewer_response = response.choices[0].message.content
        question_count = len([m for m in history if m.get("role") == "assistant"]) + 1
        
        # Determine phase
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


def generate_feedback(client, persona, job_role, history):
    """Generate comprehensive feedback on the interview"""
    
    # Format conversation for analysis
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
  "communication": {{
    "score": 0-100,
    "feedback": "specific feedback on communication skills"
  }},
  "content_quality": {{
    "score": 0-100,
    "feedback": "feedback on the substance of answers"
  }},
  "structure": {{
    "score": 0-100,
    "feedback": "feedback on answer organization (STAR method usage, etc)"
  }},
  "confidence": {{
    "score": 0-100,
    "feedback": "feedback on confidence and delivery"
  }},
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area 1", "area 2", "area 3"],
  "sample_improved_answer": {{
    "question": "one question they could improve on",
    "their_answer_summary": "brief summary of what they said",
    "improved_answer": "example of a stronger answer"
  }}
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert interview coach. Provide specific, actionable feedback."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1500,
        )
        
        feedback = json.loads(response.choices[0].message.content)
        
        return {
            "statusCode": 200,
            "body": feedback
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": f"Failed to generate feedback: {str(e)}"}
        }
