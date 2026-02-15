"""
LiveKit Interview Agent — v1.3 Agent-class API
Real-time AI mock-interviewer using:
  - STT:  Deepgram Nova-3
  - LLM:  DO Gradient Serverless Inference (Llama 3.3-70B) via OpenAI-compat
  - TTS:  Deepgram Aura (aura-asteria-en)
  - VAD:  Silero
  - NC:   LiveKit noise-cancellation (BVC)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Any, Optional

from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    RunContext,
    function_tool,
    room_io,
)
from livekit.plugins import deepgram, noise_cancellation, openai, silero

from app.agents.interview_prompts import build_interviewer_instructions, PERSONA_VOICE

load_dotenv(".env.local")
load_dotenv(".env")

logger = logging.getLogger("interview-agent")

# ── Environment helpers ─────────────────────────────────────────────────────

_LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
_LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
_LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
_DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
_GRADIENT_KEY = os.getenv("GRADIENT_MODEL_ACCESS_KEY", "") or os.getenv("DO_GENAI_API_KEY", "")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
_GRADIENT_EVAL_URL = os.getenv("GRADIENT_EVAL_AGENT_URL", "")  # deployed Gradient agent endpoint


def _llm_base_url() -> str | None:
    """Return the base URL for the LLM provider."""
    if _GRADIENT_KEY:
        return "https://inference.do-ai.run/v1"
    return None  # use default OpenAI


def _llm_api_key() -> str:
    return _GRADIENT_KEY or _OPENAI_KEY or ""


def _llm_model() -> str:
    if _GRADIENT_KEY:
        return "llama3.3-70b-instruct"
    return "gpt-4.1-mini"


# ── InterviewerAgent ────────────────────────────────────────────────────────


class InterviewerAgent(Agent):
    """
    A voice AI interviewer that:
    - Asks questions one at a time
    - Listens, pauses while candidate speaks, then responds
    - Tracks question progress via tools
    - Triggers post-interview evaluation via Gradient ADK
    """

    def __init__(
        self,
        job_role: str = "General",
        difficulty: str = "intermediate",
        persona: str = "professional",
        interview_type: str = "mixed",
        num_questions: int = 6,
        resume_summary: str | None = None,
        job_description: str | None = None,
    ) -> None:
        self._job_role = job_role
        self._difficulty = difficulty
        self._persona = persona
        self._num_questions = num_questions
        self._question_index = 0
        self._started_at: float = 0.0
        self._ended = False
        self._responses: list[dict[str, Any]] = []

        instructions = build_interviewer_instructions(
            job_role=job_role,
            difficulty=difficulty,
            persona=persona,
            interview_type=interview_type,
            num_questions=num_questions,
            resume_summary=resume_summary,
            job_description=job_description,
        )
        super().__init__(instructions=instructions)

    # ── Tools the LLM can call ──────────────────────────────────────────

    @function_tool()
    async def advance_question(self, context: RunContext) -> str:
        """Call this after the candidate finishes answering to move to the next question.

        Returns:
            A status string with the current question number.
        """
        self._question_index += 1
        remaining = self._num_questions - self._question_index
        logger.info(
            "Question advanced → %d / %d (remaining: %d)",
            self._question_index,
            self._num_questions,
            remaining,
        )

        # Notify frontend via data channel
        room = agents.get_job_context().room
        await room.local_participant.publish_data(
            json.dumps({
                "type": "question_progress",
                "current": self._question_index,
                "total": self._num_questions,
            }).encode(),
        )

        if remaining <= 0:
            # Start safety-net timers in case LLM forgets to call end_interview
            asyncio.create_task(self._auto_end_after_delay(10.0))
            asyncio.create_task(self._auto_end_after_delay(20.0))  # second safety net
            return (
                f"All {self._num_questions} questions are now COMPLETE. "
                "You MUST immediately say your closing statement and then call end_interview. "
                "Do NOT ask any more questions. Do NOT wait for the candidate. "
                "Say goodbye and call end_interview NOW."
            )
        return (
            f"Question {self._question_index} of {self._num_questions}. "
            f"{remaining} questions remaining."
        )

    @function_tool()
    async def rate_response(
        self,
        context: RunContext,
        score: int,
        notes: str,
    ) -> None:
        """Silently rate the candidate's last response (1-10). Do NOT speak the rating aloud.

        Args:
            score: Rating from 1 (poor) to 10 (excellent).
            notes: Brief evaluation notes for the feedback report.
        """
        self._responses.append({
            "question_index": self._question_index,
            "score": score,
            "notes": notes,
            "timestamp": time.time(),
        })
        logger.info("Response rated: Q%d → %d/10", self._question_index, score)

    @function_tool()
    async def end_interview(self, context: RunContext) -> str:
        """Call this when the interview is complete (after the closing statement).

        Triggers feedback generation and notifies the frontend.
        """
        if self._ended:
            return "Interview already ended."
        self._ended = True
        duration = time.time() - self._started_at if self._started_at else 0

        summary = {
            "type": "interview_complete",
            "questions_asked": self._question_index,
            "duration_seconds": round(duration),
            "response_scores": self._responses,
        }

        room = agents.get_job_context().room
        await room.local_participant.publish_data(
            json.dumps(summary).encode(),
        )

        logger.info(
            "Interview ended. Duration: %.0fs, Questions: %d",
            duration,
            self._question_index,
        )
        return "Interview session ended. Feedback data has been sent to the backend."

    # ── Lifecycle hook ──────────────────────────────────────────────────

    async def on_enter(self) -> None:
        """Called when the agent joins the session."""
        self._started_at = time.time()
        self._ended = False
        logger.info("InterviewerAgent entered session")

    async def _auto_end_after_delay(self, delay: float = 15.0) -> None:
        """Safety net: auto-end the interview if the LLM fails to call end_interview."""
        await asyncio.sleep(delay)
        if not self._ended:
            logger.warning("Auto-ending interview — LLM did not call end_interview within %.0fs", delay)
            self._ended = True
            duration = time.time() - self._started_at if self._started_at else 0
            summary = {
                "type": "interview_complete",
                "questions_asked": self._question_index,
                "duration_seconds": round(duration),
                "response_scores": self._responses,
            }
            try:
                room = agents.get_job_context().room
                await room.local_participant.publish_data(
                    json.dumps(summary).encode(),
                )
                logger.info("Auto-end: interview_complete message sent")
            except Exception as exc:
                logger.error("Auto-end failed to publish data: %s", exc)


# ── Agent Server & Session wiring ───────────────────────────────────────────

server = AgentServer()


@server.rtc_session()
async def interview_session(ctx: agents.JobContext):
    """
    Called for every new room dispatched to this agent server.
    Reads room metadata to configure the interview, then starts a voice session.
    """
    logger.info("Agent dispatched → room=%s", ctx.room.name)

    # Connect to the room first so room state (including metadata) is synced
    # Without this, ctx.room.metadata may be empty on dispatch.
    try:
        await ctx.connect()
        logger.info("Connected to room, metadata synced")
    except Exception as conn_err:
        logger.warning("ctx.connect() failed or unavailable: %s", conn_err)

    logger.info("Room metadata raw: %s", repr(ctx.room.metadata))

    # Parse config from room metadata (set when the room is created via API)
    meta: dict[str, Any] = {}
    if ctx.room.metadata:
        try:
            meta = json.loads(ctx.room.metadata)
        except (json.JSONDecodeError, TypeError):
            meta = {}

    # If metadata is still empty, try waiting briefly for room sync
    if not meta:
        logger.warning("Metadata empty after connect, waiting 2s for room sync...")
        await asyncio.sleep(2)
        if ctx.room.metadata:
            try:
                meta = json.loads(ctx.room.metadata)
            except (json.JSONDecodeError, TypeError):
                meta = {}

    logger.info("Parsed meta: job_role=%s, difficulty=%s, persona=%s, type=%s",
                meta.get("job_role"), meta.get("difficulty"),
                meta.get("persona"), meta.get("interview_type"))

    agent = InterviewerAgent(
        job_role=meta.get("job_role", "General"),
        difficulty=meta.get("difficulty", "intermediate"),
        persona=meta.get("persona", "professional"),
        interview_type=meta.get("interview_type", "mixed"),
        num_questions=meta.get("num_questions", 6),
        resume_summary=meta.get("resume_summary"),
        job_description=meta.get("job_description"),
    )

    # Select persona-specific voice
    persona = meta.get("persona", "professional")
    tts_voice = PERSONA_VOICE.get(persona, "aura-asteria-en")
    logger.info("Using TTS voice '%s' for persona '%s'", tts_voice, persona)

    # Build the voice session with industry-best pipeline
    session = AgentSession(
        # STT — Deepgram Nova-3 with enhanced settings
        stt=deepgram.STT(
            api_key=_DEEPGRAM_API_KEY,
            model="nova-3",
            language="en",
            smart_format=True,
            punctuate=True,
            filler_words=False,
            keyterm=["interviewer", "candidate", "resume", "experience"],
        ),
        # LLM — DO Gradient (Llama 3.3-70B) via OpenAI-compatible API
        llm=openai.LLM(
            api_key=_llm_api_key(),
            model=_llm_model(),
            base_url=_llm_base_url(),
        ),
        # TTS — Deepgram Aura, voice selected per persona
        tts=deepgram.TTS(
            api_key=_DEEPGRAM_API_KEY,
            model=tts_voice,
        ),
        # VAD — Silero voice activity detection
        vad=silero.VAD.load(
            min_speech_duration=0.25,
            min_silence_duration=0.5,
        ),
        # Interruption & turn settings — tuned for interview cadence
        allow_interruptions=True,
        min_interruption_duration=0.8,
        resume_false_interruption=True,
        min_endpointing_delay=1.0,
        max_endpointing_delay=5.0,
    )

    await session.start(
        room=ctx.room,
        agent=agent,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                # Enhanced noise cancellation for the participant's mic
                noise_cancellation=noise_cancellation.BVC(),
            ),
        ),
    )

    # Kick off the opening greeting
    await session.generate_reply(
        instructions="Greet the candidate with your opening line and wait for them to say they are ready."
    )


# ── CLI entry point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    agents.cli.run_app(server)
