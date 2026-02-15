"""Interview AI Service - Question generation, response analysis, and feedback"""

import logging
import json
import asyncio
from typing import List, Dict, Any, Optional
from enum import Enum

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from app.core.config import settings
from app.models.interview import InterviewType, DifficultyLevel

logger = logging.getLogger(__name__)


class InterviewPersona(str, Enum):
    """AI interviewer persona types"""
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    CHALLENGING = "challenging"


# Interview question banks by category
BEHAVIORAL_QUESTIONS = [
    "Tell me about yourself and your background.",
    "Describe a challenging project you worked on. What was your role and how did you handle it?",
    "Give me an example of a time you had to work with a difficult team member.",
    "Tell me about a time you failed and what you learned from it.",
    "How do you prioritize tasks when you have multiple deadlines?",
    "Describe a situation where you had to learn something new quickly.",
    "Tell me about a time you went above and beyond your responsibilities.",
    "How do you handle constructive criticism?",
    "Give an example of when you demonstrated leadership.",
    "Describe a time you had to make a decision with incomplete information.",
]

TECHNICAL_THEORY_QUESTIONS = {
    "software_engineering": [
        "Explain the difference between REST and GraphQL APIs.",
        "What are SOLID principles and why are they important?",
        "Describe the differences between SQL and NoSQL databases.",
        "Explain microservices architecture and when you would use it.",
        "What is the difference between horizontal and vertical scaling?",
        "Explain the concept of CI/CD and its benefits.",
        "What are design patterns? Give examples you've used.",
        "Describe how you would ensure code quality in a project.",
    ],
    "data_science": [
        "Explain the bias-variance tradeoff in machine learning.",
        "What is the difference between supervised and unsupervised learning?",
        "How would you handle missing data in a dataset?",
        "Explain cross-validation and why it's important.",
        "What are common metrics for evaluating classification models?",
        "Describe the difference between L1 and L2 regularization.",
    ],
    "general": [
        "Walk me through your problem-solving approach.",
        "How do you stay updated with the latest technology trends?",
        "Describe your experience with agile methodologies.",
        "How do you approach debugging a complex issue?",
        "What tools and technologies are you most comfortable with?",
    ]
}


class InterviewAIService:
    """
    AI service for conducting mock interviews using Gemini 2.5 Flash.
    
    Handles:
    - Dynamic question generation based on resume and job role
    - Real-time response analysis
    - Follow-up question generation
    - Final feedback compilation
    - Concurrency control with AsyncIO Semaphore
    """
    
    def __init__(self):
        self.model = None
        self.provider = None
        self.model_name = None
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._init_ai()
    
    def _init_ai(self):
        """Initialize AI provider with Gemini (preferred) or fallback to OpenAI"""
        try:
            # Try Gemini first (budget-optimized)
            if settings.GEMINI_API_KEY:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.model_name = settings.GEMINI_MODEL
                
                # Configure Gemini model with safety settings
                generation_config = {
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": 2048,
                }
                
                safety_settings = {
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
                
                self.model = genai.GenerativeModel(
                    model_name=self.model_name,
                    generation_config=generation_config,
                    safety_settings=safety_settings,
                )
                
                self.provider = "gemini"
                
                # Initialize semaphore for concurrency control
                max_concurrent = settings.GEMINI_MAX_CONCURRENT
                self._semaphore = asyncio.Semaphore(max_concurrent)
                
                logger.info(f"Interview AI initialized with Gemini {self.model_name} (max concurrent: {max_concurrent})")
                
            # Fallback to OpenAI if Gemini not available
            elif settings.OPENAI_API_KEY:
                import openai
                openai.api_key = settings.OPENAI_API_KEY
                openai.api_base = "https://api.openai.com/v1"
                self.model = "gpt-4o-mini"
                self.provider = "openai"
                self.model_name = self.model
                logger.info(f"Interview AI initialized with OpenAI (model: {self.model})")
                
            # Fallback to AgentRouter
            elif settings.AGENTROUTER_KEY:
                import openai
                openai.api_key = settings.AGENTROUTER_KEY
                openai.api_base = "https://agentrouter.org/v1"
                self.model = "gpt-5"
                self.provider = "agentrouter"
                self.model_name = self.model
                logger.info(f"Interview AI initialized with AgentRouter")
            else:
                logger.warning("No AI API key configured for interview service")
                self.model = None
        except Exception as e:
            logger.error(f"Failed to initialize Interview AI: {str(e)}")
            self.model = None
    
    async def _call_gemini(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.7) -> str:
        """
        Call Gemini API with concurrency control
        
        Args:
            prompt: User prompt
            system_instruction: System instruction for model behavior
            temperature: Generation temperature
            
        Returns:
            Generated text response
        """
        if not self.model or self.provider != "gemini":
            raise AIServiceError("Gemini model not initialized")
        
        # Apply concurrency control
        if self._semaphore:
            # Try to acquire semaphore with timeout
            try:
                acquired = await asyncio.wait_for(
                    self._semaphore.acquire(),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                # All slots busy for >5s, return 503
                logger.warning("Gemini API concurrency limit reached - all slots busy")
                raise AIServiceError("AI service temporarily busy - please try again", status_code=503)
        
        try:
            # Create model with system instruction if provided
            if system_instruction:
                model = genai.GenerativeModel(
                    model_name=self.model_name,
                    generation_config={"temperature": temperature},
                    system_instruction=system_instruction,
                )
            else:
                model = self.model
            
            # Make async API call
            response = await model.generate_content_async(prompt)
            
            if not response or not response.text:
                raise AIServiceError("Empty response from Gemini API")
            
            return response.text
            
        finally:
            # Always release semaphore
            if self._semaphore:
                self._semaphore.release()
    
    def get_system_prompt(self, persona: InterviewPersona = InterviewPersona.PROFESSIONAL) -> str:
        """Get system prompt based on interviewer persona"""
        base_prompt = """You are an expert interviewer conducting a mock job interview. Your role is to:
1. Ask clear, professional questions
2. Listen actively to responses
3. Provide natural follow-up questions when appropriate
4. Maintain a conversational but professional tone
5. Keep responses concise (2-3 sentences max for transitions)

Important guidelines:
- Never break character as an interviewer
- Don't provide direct answers to interview questions
- Acknowledge good responses positively but briefly
- If a response is unclear, ask for clarification
- Keep the interview flowing naturally"""

        persona_additions = {
            InterviewPersona.FRIENDLY: "\n\nYou are warm and encouraging. Use a casual but professional tone. Make the candidate feel comfortable.",
            InterviewPersona.PROFESSIONAL: "\n\nYou are formal and straightforward. Focus on extracting detailed information. Be neutral but respectful.",
            InterviewPersona.CHALLENGING: "\n\nYou ask probing follow-up questions. Challenge assumptions respectfully. Push for concrete examples and metrics.",
        }
        
        return base_prompt + persona_additions.get(persona, persona_additions[InterviewPersona.PROFESSIONAL])
    
    async def generate_questions(
        self,
        interview_type: InterviewType,
        resume_text: Optional[str] = None,
        job_description: Optional[str] = None,
        job_role: Optional[str] = None,
        num_questions: int = 5,
        difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    ) -> List[Dict[str, Any]]:
        """
        Generate interview questions based on context.
        
        Returns list of question dicts with:
        - question: The question text
        - category: behavioral/technical/situational
        - expected_skills: Skills this question evaluates
        - follow_up_hints: Potential follow-up topics
        """
        if not self.model:
            return self._fallback_questions(interview_type, num_questions)
        
        try:
            prompt = self._build_question_generation_prompt(
                interview_type, resume_text, job_description, job_role, 
                num_questions, difficulty
            )
            
            system_instruction = "You are an expert interview coach who creates tailored interview questions. Always respond with valid JSON."
            
            if self.provider == "gemini":
                result_text = await self._call_gemini(prompt, system_instruction, temperature=0.7)
            else:
                # OpenAI/AgentRouter fallback
                import openai
                response = openai.ChatCompletion.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=2000,
                    timeout=30
                )
                result_text = response.choices[0].message.content
            
            # Parse JSON response
            try:
                # Find JSON in response
                if "```json" in result_text:
                    result_text = result_text.split("```json")[1].split("```")[0]
                elif "```" in result_text:
                    result_text = result_text.split("```")[1].split("```")[0]
                
                questions = json.loads(result_text)
                if isinstance(questions, dict) and "questions" in questions:
                    questions = questions["questions"]
                    
                logger.info(f"Generated {len(questions)} AI interview questions")
                return questions
                
            except json.JSONDecodeError:
                logger.warning("Failed to parse AI questions, using fallback")
                return self._fallback_questions(interview_type, num_questions)
                
        except AIServiceError:
            raise
        except Exception as e:
            logger.error(f"Error generating interview questions: {str(e)}")
            return self._fallback_questions(interview_type, num_questions)
    
    def _build_question_generation_prompt(
        self,
        interview_type: InterviewType,
        resume_text: Optional[str],
        job_description: Optional[str],
        job_role: Optional[str],
        num_questions: int,
        difficulty: DifficultyLevel
    ) -> str:
        """Build prompt for question generation"""
        prompt = f"""Generate {num_questions} interview questions for a {interview_type.value} interview.
Difficulty level: {difficulty.value}

"""
        if job_role:
            prompt += f"Target Role: {job_role}\n\n"
            
        if resume_text:
            prompt += f"Candidate's Resume Summary:\n{resume_text[:1500]}\n\n"
            
        if job_description:
            prompt += f"Job Description:\n{job_description[:1000]}\n\n"
        
        prompt += """Return a JSON array of questions in this exact format:
{
  "questions": [
    {
      "question": "The interview question text",
      "category": "behavioral" or "technical" or "situational",
      "expected_skills": ["skill1", "skill2"],
      "follow_up_hints": ["potential follow-up topic 1", "potential follow-up topic 2"],
      "evaluation_criteria": ["What makes a good answer", "Key points to look for"]
    }
  ]
}

Mix question types appropriately based on the interview type.
Tailor questions to the candidate's background if resume is provided.
Make questions progressively more challenging if difficulty is high."""

        return prompt
    
    def _fallback_questions(
        self, 
        interview_type: InterviewType, 
        num_questions: int
    ) -> List[Dict[str, Any]]:
        """Get fallback questions when AI is unavailable"""
        questions = []
        
        if interview_type in [InterviewType.BEHAVIORAL, InterviewType.MIXED]:
            for q in BEHAVIORAL_QUESTIONS[:num_questions // 2 + 1]:
                questions.append({
                    "question": q,
                    "category": "behavioral",
                    "expected_skills": ["communication", "problem-solving"],
                    "follow_up_hints": ["Ask for specific details", "Request metrics"],
                    "evaluation_criteria": ["STAR method used", "Clear examples given"]
                })
        
        if interview_type in [InterviewType.TECHNICAL_THEORY, InterviewType.MIXED]:
            tech_qs = TECHNICAL_THEORY_QUESTIONS["general"]
            remaining = num_questions - len(questions)
            for q in tech_qs[:remaining]:
                questions.append({
                    "question": q,
                    "category": "technical",
                    "expected_skills": ["technical knowledge", "analytical thinking"],
                    "follow_up_hints": ["Ask for examples", "Probe deeper on specifics"],
                    "evaluation_criteria": ["Technical accuracy", "Depth of understanding"]
                })
        
        return questions[:num_questions]
    
    async def generate_response(
        self,
        user_transcript: str,
        conversation_history: List[Dict[str, str]],
        current_question: str,
        next_question: Optional[str] = None,
        persona: InterviewPersona = InterviewPersona.PROFESSIONAL
    ) -> Dict[str, Any]:
        """
        Generate interviewer response based on user's answer.
        
        Returns:
        - response: The interviewer's response text
        - should_follow_up: Whether to ask a follow-up
        - follow_up_question: Optional follow-up question
        - transition_to_next: Whether to move to next question
        """
        if not self.model:
            return self._fallback_response(next_question)
        
        try:
            system_instruction = self.get_system_prompt(persona)
            
            # Build conversation context
            context = ""
            for msg in conversation_history[-12:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                context += f"{role}: {content}\n"
            
            # Add current context
            prompt = f"""The candidate just answered the question: "{current_question}"

Their response: "{user_transcript}"

{f"Next planned question: {next_question}" if next_question else "This was the last question."}

Provide a brief, natural interviewer response. Either:
1. Acknowledge their answer and smoothly transition to the next question
2. Ask a brief follow-up if their answer was incomplete or particularly interesting
3. If this was the last question, thank them and indicate the interview is concluding

Keep your response under 3 sentences. Be natural and conversational."""

            if self.provider == "gemini":
                response_text = await self._call_gemini(prompt, system_instruction, temperature=0.8)
            else:
                # OpenAI/AgentRouter fallback
                import openai
                messages = [{"role": "system", "content": system_instruction}]
                for msg in conversation_history[-12:]:
                    messages.append(msg)
                messages.append({"role": "user", "content": prompt})
                
                response = openai.ChatCompletion.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.8,
                    max_tokens=200,
                    timeout=15
                )
                response_text = response.choices[0].message.content.strip()
            
            # Determine if this is a follow-up or transition
            is_follow_up = "?" in response_text and next_question and next_question not in response_text
            
            return {
                "response": response_text,
                "should_follow_up": is_follow_up,
                "transition_to_next": not is_follow_up and next_question is not None,
                "is_conclusion": next_question is None
            }
            
        except AIServiceError:
            raise
        except Exception as e:
            logger.error(f"Error generating interviewer response: {str(e)}")
            return self._fallback_response(next_question)
    
    def _fallback_response(self, next_question: Optional[str]) -> Dict[str, Any]:
        """Fallback response when AI is unavailable"""
        if next_question:
            return {
                "response": f"Thank you for that answer. Let me ask you this: {next_question}",
                "should_follow_up": False,
                "transition_to_next": True,
                "is_conclusion": False
            }
        else:
            return {
                "response": "Thank you for all your responses. That concludes our interview. We'll have your feedback ready shortly.",
                "should_follow_up": False,
                "transition_to_next": False,
                "is_conclusion": True
            }
    
    async def analyze_response(
        self,
        question: str,
        user_transcript: str,
        expected_skills: List[str],
        evaluation_criteria: List[str]
    ) -> Dict[str, Any]:
        """
        Analyze a single interview response.
        
        Returns:
        - scores: Dict of skill -> score (0-100)
        - strengths: List of strong points
        - improvements: List of areas to improve
        - analysis: Detailed text analysis
        """
        if not self.model:
            return self._fallback_analysis()
        
        try:
            prompt = f"""Analyze this interview response:

Question: "{question}"

Candidate's Response: "{user_transcript}"

Expected skills to evaluate: {', '.join(expected_skills)}
Evaluation criteria: {', '.join(evaluation_criteria)}

Provide analysis in this exact JSON format:
{{
  "scores": {{
    "clarity": 0-100,
    "relevance": 0-100,
    "depth": 0-100,
    "structure": 0-100,
    "confidence": 0-100
  }},
  "skill_scores": {{
    // Score each expected skill 0-100
  }},
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area to improve 1", "area to improve 2"],
  "analysis": "2-3 sentence detailed analysis",
  "star_method_used": true/false,
  "example_provided": true/false
}}"""

            system_instruction = "You are an expert interview coach analyzing responses. Return only valid JSON."
            
            if self.provider == "gemini":
                result_text = await self._call_gemini(prompt, system_instruction, temperature=0.3)
            else:
                import openai
                response = openai.ChatCompletion.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=800,
                    timeout=20
                )
                result_text = response.choices[0].message.content
            
            # Parse JSON
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            analysis = json.loads(result_text)
            logger.info(f"Response analysis completed with scores: {analysis.get('scores', {})}")
            return analysis
            
        except AIServiceError:
            raise
        except Exception as e:
            logger.error(f"Error analyzing response: {str(e)}")
            return self._fallback_analysis()
    
    def _fallback_analysis(self) -> Dict[str, Any]:
        """Fallback analysis when AI is unavailable"""
        return {
            "scores": {
                "clarity": 70,
                "relevance": 70,
                "depth": 60,
                "structure": 65,
                "confidence": 70
            },
            "skill_scores": {},
            "strengths": ["Response provided"],
            "improvements": ["Consider adding specific examples", "Use the STAR method"],
            "analysis": "Analysis unavailable - AI service not configured.",
            "star_method_used": False,
            "example_provided": False
        }
    
    async def generate_final_feedback(
        self,
        interview_type: InterviewType,
        job_role: Optional[str],
        responses: List[Dict[str, Any]],
        response_analyses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate comprehensive final interview feedback.
        
        Args:
            interview_type: Type of interview conducted
            job_role: Target job role
            responses: List of questions and transcripts
            response_analyses: List of individual response analyses
            
        Returns comprehensive feedback dict
        """
        if not self.model:
            return self._fallback_final_feedback(response_analyses)
        
        try:
            # Compile interview summary
            interview_summary = []
            for i, (resp, analysis) in enumerate(zip(responses, response_analyses)):
                interview_summary.append({
                    "question": resp.get("question", f"Question {i+1}"),
                    "response_excerpt": resp.get("transcript", "")[:200],
                    "scores": analysis.get("scores", {}),
                    "strengths": analysis.get("strengths", []),
                    "improvements": analysis.get("improvements", [])
                })
            
            prompt = f"""Generate comprehensive interview feedback based on this {interview_type.value} interview{"for " + job_role + " role" if job_role else ""}.

Interview Summary:
{json.dumps(interview_summary, indent=2)}

Provide feedback in this exact JSON format:
{{
  "overall_score": 0-100,
  "category_scores": {{
    "communication": 0-100,
    "technical_knowledge": 0-100,
    "problem_solving": 0-100,
    "behavioral": 0-100,
    "professionalism": 0-100
  }},
  "summary": "2-3 sentence overall summary",
  "top_strengths": ["strength 1", "strength 2", "strength 3"],
  "priority_improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "detailed_feedback": {{
    "communication": "Specific feedback on communication skills",
    "content": "Specific feedback on answer content and depth",
    "structure": "Specific feedback on answer structure (STAR method, etc.)",
    "confidence": "Specific feedback on confidence and delivery"
  }},
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ],
  "interview_readiness": "ready" | "almost_ready" | "needs_practice",
  "next_steps": "What the candidate should focus on next"
}}"""

            system_instruction = "You are an expert interview coach providing constructive feedback. Return only valid JSON."
            
            if self.provider == "gemini":
                result_text = await self._call_gemini(prompt, system_instruction, temperature=0.4)
            else:
                import openai
                response = openai.ChatCompletion.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.4,
                    max_tokens=1500,
                    timeout=30
                )
                result_text = response.choices[0].message.content
            
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            feedback = json.loads(result_text)
            logger.info(f"Generated final feedback with overall score: {feedback.get('overall_score', 0)}")
            return feedback
            
        except AIServiceError:
            raise
        except Exception as e:
            logger.error(f"Error generating final feedback: {str(e)}")
            return self._fallback_final_feedback(response_analyses)
    
    def _fallback_final_feedback(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fallback feedback when AI is unavailable"""
        # Calculate average scores from individual analyses
        all_scores = [a.get("scores", {}) for a in analyses]
        avg_score = 70
        if all_scores:
            clarity_avg = sum(s.get("clarity", 70) for s in all_scores) / len(all_scores)
            relevance_avg = sum(s.get("relevance", 70) for s in all_scores) / len(all_scores)
            avg_score = (clarity_avg + relevance_avg) / 2
        
        return {
            "overall_score": avg_score,
            "category_scores": {
                "communication": 70,
                "technical_knowledge": 70,
                "problem_solving": 70,
                "behavioral": 70,
                "professionalism": 70
            },
            "summary": "Interview completed. AI analysis unavailable - basic scoring provided.",
            "top_strengths": ["Completed all questions"],
            "priority_improvements": [
                "Practice with the STAR method",
                "Add specific examples to your answers",
                "Quantify achievements where possible"
            ],
            "detailed_feedback": {
                "communication": "AI analysis unavailable",
                "content": "AI analysis unavailable",
                "structure": "AI analysis unavailable",
                "confidence": "AI analysis unavailable"
            },
            "recommendations": [
                "Practice mock interviews regularly",
                "Record yourself and review",
                "Prepare specific examples for common questions"
            ],
            "interview_readiness": "needs_practice",
            "next_steps": "Configure AI service for detailed feedback"
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of interview AI service"""
        return {
            "available": self.model is not None,
            "provider": self.provider,
            "model": self.model_name,
            "concurrency_limit": getattr(settings, "GEMINI_MAX_CONCURRENT", 5) if self.provider == "gemini" else None,
        }


class AIServiceError(Exception):
    """Custom exception for AI service errors"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


# Global instance
interview_ai_service = InterviewAIService()
