"""
LiveKit Interview Agent
Real-time AI interviewer using LiveKit Agents with Deepgram STT and TTS
"""

import asyncio
import logging
from typing import Optional

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, openai, silero

from app.core.config import settings

logger = logging.getLogger("interview-agent")


def get_interview_prompt(job_role: str = "Software Engineer", difficulty: str = "intermediate") -> str:
    """Generate the AI interviewer system prompt based on role and difficulty"""
    
    difficulty_context = {
        "beginner": "Ask simpler questions suitable for entry-level candidates. Be encouraging and supportive.",
        "intermediate": "Ask standard interview questions appropriate for mid-level candidates.",
        "advanced": "Ask challenging questions suitable for senior candidates. Probe deeper on technical details.",
    }
    
    return f"""You are an experienced technical interviewer conducting a mock interview for a {job_role} position.

Your personality:
- Professional but friendly
- Encouraging but honest
- Clear and articulate
- Patient with candidates

Interview guidelines:
- {difficulty_context.get(difficulty, difficulty_context["intermediate"])}
- Ask one question at a time
- Listen carefully to responses
- Provide brief acknowledgment before moving to next question
- Ask follow-up questions when appropriate
- Keep responses concise (under 30 seconds when spoken)
- After 5-7 questions, conclude the interview professionally

Start by introducing yourself briefly and asking the first question.
Do NOT use markdown formatting or special characters in your responses.
Speak naturally as if you're having a real conversation."""


async def create_interview_agent(
    ctx: JobContext,
    job_role: str = "Software Engineer",
    difficulty: str = "intermediate",
) -> VoiceAssistant:
    """Create a VoiceAssistant configured for interview"""
    
    # Initialize AI components
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=get_interview_prompt(job_role, difficulty),
    )
    
    # Create the voice assistant
    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=deepgram.STT(
            api_key=settings.DEEPGRAM_API_KEY,
            model="nova-2",
            language="en",
        ),
        llm=openai.LLM(
            api_key=settings.OPENAI_API_KEY,
            model="gpt-4o-mini",  # Fast and cost-effective
        ),
        tts=openai.TTS(
            api_key=settings.OPENAI_API_KEY,
            voice="alloy",  # Professional voice
        ),
        chat_ctx=initial_ctx,
        allow_interruptions=True,
        interrupt_speech_duration=0.5,
        interrupt_min_words=2,
        preemptive_synthesis=True,
    )
    
    return assistant


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the interview agent"""
    
    logger.info(f"Interview agent starting for room: {ctx.room.name}")
    
    # Parse room metadata for interview config
    job_role = ctx.room.metadata.get("job_role", "Software Engineer") if ctx.room.metadata else "Software Engineer"
    difficulty = ctx.room.metadata.get("difficulty", "intermediate") if ctx.room.metadata else "intermediate"
    
    # Wait for participant to connect
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # Wait for the candidate to join
    participant = await ctx.wait_for_participant()
    logger.info(f"Candidate joined: {participant.identity}")
    
    # Create and start the interview agent
    assistant = await create_interview_agent(ctx, job_role, difficulty)
    
    # Start the assistant
    assistant.start(ctx.room, participant)
    
    # Initial greeting - start the interview
    await assistant.say(
        f"Hello! I'm your AI interviewer today. We'll be conducting a mock interview for a {job_role} position. "
        "Please take a moment to get comfortable, and then we'll begin. "
        "Are you ready to start?"
    )
    
    # Keep the agent running
    await asyncio.sleep(3600)  # 1 hour max session


def run_agent():
    """Run the interview agent worker"""
    
    if not settings.LIVEKIT_URL or not settings.LIVEKIT_API_KEY:
        logger.error("LiveKit is not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET")
        return
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
            ws_url=settings.LIVEKIT_URL,
        )
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_agent()
