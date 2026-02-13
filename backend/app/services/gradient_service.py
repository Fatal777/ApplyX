"""
Gradient ADK Service
Thin HTTP client for the deployed DigitalOcean Gradient evaluation agent.
Handles:
  - Pre-interview question plan generation
  - Post-interview feedback / scoring
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(60.0, connect=10.0)  # generous for LLM generation


class GradientServiceError(Exception):
    """Raised when the Gradient agent returns an error."""

    def __init__(self, message: str, status_code: int = 500):
        self.status_code = status_code
        super().__init__(message)


class GradientService:
    """
    Client for the deployed Gradient ADK evaluation agent.

    The agent is deployed via ``gradient agent deploy`` and exposes a
    REST endpoint at ``GRADIENT_EVAL_AGENT_URL/run``.
    """

    def __init__(self) -> None:
        self.agent_url: str = settings.GRADIENT_EVAL_AGENT_URL or ""
        self.api_token: str = settings.GRADIENT_MODEL_ACCESS_KEY or ""
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        return self._client

    async def _call_agent(self, prompt: str) -> str:
        """POST prompt to the Gradient agent and return the response text."""
        if not self.agent_url:
            raise GradientServiceError(
                "GRADIENT_EVAL_AGENT_URL not configured", status_code=503
            )

        client = await self._get_client()

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"

        try:
            resp = await client.post(
                f"{self.agent_url.rstrip('/')}/run",
                json={"prompt": prompt},
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")

        except httpx.HTTPStatusError as exc:
            logger.error(
                "Gradient agent HTTP %d: %s",
                exc.response.status_code,
                exc.response.text[:200],
            )
            raise GradientServiceError(
                f"Gradient agent error: {exc.response.status_code}",
                status_code=exc.response.status_code,
            )
        except httpx.RequestError as exc:
            logger.error("Gradient agent request failed: %s", exc)
            raise GradientServiceError(f"Connection error: {exc}", status_code=503)

    # ── Public methods ──────────────────────────────────────────────────

    async def generate_question_plan(
        self,
        job_role: str,
        difficulty: str = "intermediate",
        interview_type: str = "mixed",
        num_questions: int = 6,
        resume_summary: Optional[str] = None,
        job_description: Optional[str] = None,
    ) -> str:
        """
        Ask the Gradient agent to generate a structured question plan.
        Returns raw JSON string from the agent.
        """
        from app.agents.interview_prompts import build_question_generation_prompt

        prompt = build_question_generation_prompt(
            job_role=job_role,
            difficulty=difficulty,
            interview_type=interview_type,
            num_questions=num_questions,
            resume_summary=resume_summary,
            job_description=job_description,
        )
        return await self._call_agent(prompt)

    async def generate_feedback(
        self,
        job_role: str,
        transcript: str,
        difficulty: str = "intermediate",
    ) -> str:
        """
        Ask the Gradient agent to evaluate an interview transcript.
        Returns raw JSON string with scores and feedback.
        """
        from app.agents.interview_prompts import build_evaluation_prompt

        prompt = build_evaluation_prompt(
            job_role=job_role,
            transcript=transcript,
            difficulty=difficulty,
        )
        return await self._call_agent(prompt)

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Module-level singleton
gradient_service = GradientService()
