"""AI Service using AgentRouter (GPT-5) for resume analysis and suggestions"""

import logging
from typing import List, Dict, Any, Optional
import openai
import pybreaker
from app.core.config import settings
from app.core.resilience import (
    openai_breaker,
    with_retry,
    get_logger,
    with_timeout,
    RetryError
)

logger = get_logger(__name__)


class AIService:
    """Service for AI-powered resume analysis and suggestions using GPT-5"""
    
    def __init__(self):
        """Initialize AI service with configurable provider"""
        self.model = None
        self.provider = None
        
        try:
            provider_config = settings.AI_PROVIDER.lower() if hasattr(settings, 'AI_PROVIDER') else "openai"
            
            if provider_config == "openai" and settings.OPENAI_API_KEY:
                self._init_openai()
            elif provider_config == "agentrouter" or not settings.OPENAI_API_KEY:
                self._init_agentrouter()
            else:
                logger.warning(f"Unknown AI provider '{provider_config}', trying OpenAI then AgentRouter")
                if settings.OPENAI_API_KEY:
                    self._init_openai()
                else:
                    self._init_agentrouter()
                    
        except Exception as e:
            logger.error(f"Failed to initialize AI service: {str(e)}")
            self.model = None
    
    def _init_openai(self):
        """Initialize OpenAI provider"""
        try:
            openai.api_key = settings.OPENAI_API_KEY
            openai.api_base = "https://api.openai.com/v1"
            openai.api_type = "open_ai"  # Explicitly set API type
            self.model = getattr(settings, 'OPENAI_MODEL', 'gpt-4')
            self.provider = "openai"
            logger.info(f"AI Service initialized with OpenAI (model: {self.model})")
            
            # Test the connection
            try:
                openai.Model.list()
                logger.info("OpenAI API connection test successful")
            except Exception as e:
                logger.warning(f"OpenAI API test failed: {str(e)}")
                logger.info("Attempting AgentRouter fallback")
                self._init_agentrouter()
        except Exception as e:
            logger.error(f"OpenAI initialization failed: {str(e)}")
            self._init_agentrouter()
    
    def _init_agentrouter(self):
        """Initialize AgentRouter as fallback"""
        try:
            # Use the property from settings that checks both env variables
            api_key = settings.AGENTROUTER_KEY
            
            if not api_key:
                logger.warning("AgentRouter API key not configured (tried AGENTROUTER_API_KEY and AGENT_ROUTER_TOKEN)")
                self.model = None
                return
            
            openai.api_key = api_key
            openai.api_base = 'https://agentrouter.org/v1'  # Fixed AgentRouter URL
            openai.api_type = "open_ai"  # AgentRouter uses OpenAI-compatible API
            self.model = 'gpt-5'  # AgentRouter only supports gpt-5
            self.provider = "agentrouter"
            logger.info(f"AI Service initialized with AgentRouter (model: {self.model})")
            logger.info(f"AgentRouter base URL: {openai.api_base}")
            logger.info(f"API Key configured: {api_key[:10]}...{api_key[-4:]}")
            
            # Test the connection
            try:
                openai.Model.list()
                logger.info("AgentRouter API connection test successful")
            except Exception as e:
                logger.warning(f"AgentRouter API test failed: {str(e)}")
                logger.warning("This may be normal if AgentRouter doesn't support model listing")
                # Don't fail completely - the actual chat completion might still work
        except Exception as e:
            logger.error(f"AgentRouter initialization failed: {str(e)}")
            self.model = None
    
    async def generate_resume_suggestions(
        self, 
        resume_text: str, 
        analysis_data: Dict[str, Any],
        job_description: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Generate AI-powered suggestions for resume improvement"""
        if not self.model:
            logger.warning("No AI model available, using fallback suggestions")
            return self._fallback_suggestions(analysis_data)
        
        try:
            keywords = analysis_data.get('extracted_keywords', [])
            if isinstance(keywords, str):
                keywords = [k.strip() for k in keywords.split(',')]
            
            logger.info(
                "Generating AI suggestions",
                provider=self.provider,
                model=self.model,
                keywords_count=len(keywords)
            )
            prompt = self._build_suggestion_prompt(resume_text, analysis_data, job_description, keywords)
            
            # Use circuit breaker + retry + timeout for resilient API calls
            async def _make_api_call():
                return openai.ChatCompletion.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert ATS resume consultant. Analyze resumes based on extracted keywords and provide specific, actionable suggestions. Always include priority (high/medium/low), category, issue, suggestion, and example."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.7,
                    max_tokens=2500,
                    timeout=30
                )
            
            # Wrap with circuit breaker and retry
            try:
                # Circuit breaker protects against cascading failures
                with openai_breaker:
                    response = await with_timeout(
                        with_retry(
                            _make_api_call,
                            max_attempts=2,
                            base_delay=1.0,
                            retryable_exceptions=(
                                openai.error.RateLimitError,
                                openai.error.Timeout,
                                openai.error.APIConnectionError,
                                ConnectionError,
                                TimeoutError,
                            ),
                            logger=logger,
                        ),
                        timeout_seconds=45,
                        timeout_message=f"AI request timed out after 45s ({self.provider})"
                    )
            except pybreaker.CircuitBreakerError:
                logger.error(
                    "Circuit breaker open - AI service unavailable",
                    provider=self.provider,
                    breaker_state=str(openai_breaker.current_state)
                )
                return self._fallback_suggestions(analysis_data)
            except RetryError as e:
                logger.error(
                    "All retry attempts failed for AI service",
                    provider=self.provider,
                    attempts=e.attempts,
                    last_error=str(e.last_error)
                )
                return self._fallback_suggestions(analysis_data)
            
            suggestions_text = response.choices[0].message.content
            logger.info(f"Received AI response from {self.provider}, parsing suggestions...")
            parsed = self._parse_suggestions(suggestions_text, analysis_data)
            
            # Ensure all suggestions have required fields
            for sug in parsed:
                if 'priority' not in sug or not sug['priority']:
                    sug['priority'] = 'medium'
                if 'category' not in sug:
                    sug['category'] = 'General'
                if 'issue' not in sug:
                    sug['issue'] = sug.get('suggestion', 'Improvement needed')
            
            logger.info(f"Successfully generated {len(parsed)} AI suggestions")
            return parsed if parsed else self._fallback_suggestions(analysis_data)
            
        except openai.error.AuthenticationError as e:
            logger.error(f"Authentication failed with {self.provider}: {str(e)}")
            logger.error("Check your API key configuration")
            return self._fallback_suggestions(analysis_data)
        except openai.error.RateLimitError as e:
            logger.error(f"Rate limit exceeded with {self.provider}: {str(e)}")
            return self._fallback_suggestions(analysis_data)
        except openai.error.APIError as e:
            logger.error(f"API error with {self.provider}: {str(e)}")
            return self._fallback_suggestions(analysis_data)
        except Exception as e:
            logger.error(f"Unexpected error generating AI suggestions with {self.provider}: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            return self._fallback_suggestions(analysis_data)
    
    def _build_suggestion_prompt(
        self, 
        resume_text: str, 
        analysis_data: Dict[str, Any],
        job_description: Optional[str],
        keywords: List[str]
    ) -> str:
        """Build the prompt for AI analysis"""
        scores = analysis_data.get('scores', {})
        ats_score = scores.get('ats_score', analysis_data.get('ats_score', 0))
        overall_score = scores.get('overall_score', analysis_data.get('overall_score', 0))
        
        prompt = f"""Analyze this resume and provide 6-8 specific, actionable improvement suggestions based on the extracted keywords and content.

Resume Text (first 2500 chars):
{resume_text[:2500]}

Extracted Keywords from Resume:
{', '.join(keywords[:30]) if keywords else 'No keywords extracted'}

Current Analysis Scores:
- Overall Score: {overall_score:.1f}/100
- ATS Score: {ats_score:.1f}/100
- Completeness: {scores.get('completeness_score', 0):.1f}/100
- Impact Score: {scores.get('impact_score', 0):.1f}/100
- Skills Score: {scores.get('skills_score', 0):.1f}/100

"""
        
        if job_description:
            prompt += f"""Target Job Description:
{job_description[:1000]}

Focus suggestions on matching the job requirements and keywords.
"""
        
        prompt += """
Provide suggestions in this EXACT format for each (no markdown, no numbering):

CATEGORY: [Content/Formatting/Keywords/Skills/Experience]
PRIORITY: [high/medium/low]
ISSUE: [Brief description of the problem found in THIS resume]
SUGGESTION: [Specific action to take based on THIS resume's content]
EXAMPLE: [Concrete example using content from THIS resume]

(blank line between suggestions)

IMPORTANT:
1. Base suggestions on the ACTUAL resume content and keywords shown above
2. Reference specific sections or keywords from the resume
3. Provide concrete examples using the resume's context
4. Focus on ATS optimization using the extracted keywords
5. Suggest adding missing important keywords
6. Recommend quantifying achievements mentioned in the resume
7. Improve action verbs in existing experience
8. Ensure priority is lowercase (high/medium/low)
"""
        
        return prompt
    
    def _parse_suggestions(self, suggestions_text: str, analysis_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse AI response into structured suggestions"""
        suggestions = []
        current_suggestion = {}
        
        for line in suggestions_text.split('\n'):
            line = line.strip()
            if not line:
                if current_suggestion and len(current_suggestion) >= 3:  # At least category, priority, issue
                    suggestions.append(current_suggestion)
                    current_suggestion = {}
                continue
            
            if line.startswith('CATEGORY:'):
                current_suggestion['category'] = line.replace('CATEGORY:', '').strip()
            elif line.startswith('PRIORITY:'):
                current_suggestion['priority'] = line.replace('PRIORITY:', '').strip().lower()
            elif line.startswith('ISSUE:'):
                current_suggestion['issue'] = line.replace('ISSUE:', '').strip()
            elif line.startswith('SUGGESTION:'):
                current_suggestion['suggestion'] = line.replace('SUGGESTION:', '').strip()
            elif line.startswith('EXAMPLE:'):
                current_suggestion['example'] = line.replace('EXAMPLE:', '').strip()
        
        # Add last suggestion if exists and valid
        if current_suggestion and len(current_suggestion) >= 3:
            suggestions.append(current_suggestion)
        
        return suggestions
    
    def _fallback_suggestions(self, analysis_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Enhanced fallback suggestions when AI is not available"""
        suggestions = []
        
        scores = analysis_data.get('scores', {})
        ats_score = scores.get('ats_score', analysis_data.get('ats_score', 0))
        overall_score = scores.get('overall_score', analysis_data.get('overall_score', 0))
        keywords = analysis_data.get('extracted_keywords', [])
        
        if isinstance(keywords, str):
            keywords = [k.strip() for k in keywords.split(',') if k.strip()]
        
        if ats_score < 70:
            suggestions.append({
                'category': 'ATS Optimization',
                'priority': 'high',
                'issue': 'ATS compatibility issues detected',
                'suggestion': 'Use standard section headers (Experience, Education, Skills) and avoid complex formatting, tables, or graphics',
                'example': 'Change "Work History" to "Experience" and use simple bullet points instead of columns'
            })
        
        if overall_score < 70:
            suggestions.append({
                'category': 'Content',
                'priority': 'high',
                'issue': 'Resume appears incomplete or lacks essential sections',
                'suggestion': 'Add missing standard sections: Contact Information, Summary/Objective, Experience, Education, Skills',
                'example': 'Include a professional summary at the top highlighting your key strengths and career goals'
            })
        
        if len(keywords) < 10:
            suggestions.append({
                'category': 'Keywords',
                'priority': 'medium',
                'issue': 'Limited industry-specific keywords detected',
                'suggestion': 'Incorporate more relevant keywords from your industry and job descriptions',
                'example': f'Add keywords like: {", ".join(keywords[:5]) if keywords else "Python, JavaScript, React, SQL, etc."}'
            })
        
        if scores.get('impact_score', 0) < 60:
            suggestions.append({
                'category': 'Experience',
                'priority': 'medium',
                'issue': 'Experience section lacks quantifiable achievements',
                'suggestion': 'Replace generic descriptions with specific, measurable accomplishments',
                'example': 'Change "Managed team projects" to "Led cross-functional team of 8, delivering 3 major projects 20% under budget"'
            })
        
        if scores.get('skills_score', 0) < 60:
            suggestions.append({
                'category': 'Skills',
                'priority': 'medium',
                'issue': 'Skills section needs expansion or categorization',
                'suggestion': 'Organize skills into categories (Technical, Soft Skills, Tools) and include proficiency levels',
                'example': 'Technical: Python (Advanced), SQL (Intermediate) | Tools: Git, Docker, AWS'
            })
        
        suggestions.append({
            'category': 'Formatting',
            'priority': 'low',
            'issue': 'Resume formatting could be optimized for readability',
            'suggestion': 'Use consistent font (Arial, Calibri, or Times New Roman), 10-12pt size, and proper spacing',
            'example': 'Use bullet points consistently, left-align text, and keep resume to 1-2 pages'
        })
        
        suggestions.append({
            'category': 'Content',
            'priority': 'low',
            'issue': 'Resume length and conciseness optimization',
            'suggestion': 'Keep resume concise (1 page for <10 years experience, 2 pages for more) while including all relevant information',
            'example': 'Focus on last 10-15 years of experience and most relevant achievements'
        })
        
        suggestions.append({
            'category': 'Contact',
            'priority': 'low',
            'issue': 'Contact information presentation',
            'suggestion': 'Include full contact details at the top: name, phone, email, LinkedIn, and location',
            'example': 'John Smith | (555) 123-4567 | john@email.com | linkedin.com/in/johnsmith | New York, NY'
        })
        
        logger.info(f"Generated {len(suggestions)} fallback suggestions")
        return suggestions
    
    async def generate_pdf_edit_suggestions(
        self,
        resume_text: str,
        section_to_improve: str,
        current_content: str
    ) -> Dict[str, Any]:
        """Generate specific edit suggestions for PDF editor"""
        if not self.model:
            return {
                'improved_text': current_content,
                'explanation': 'AI service not configured',
                'changes': []
            }
        
        try:
            prompt = f"""Improve this resume section:

Section: {section_to_improve}
Current Text:
{current_content}

Provide:
1. Improved version with better action verbs, quantification, and impact
2. Brief explanation of changes
3. List of specific changes made

Format as JSON:
{{
  "improved_text": "...",
  "explanation": "...",
  "changes": ["change 1", "change 2"]
}}
"""
            
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional resume writer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000,
                timeout=30
            )
            
            import json
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            logger.error(f"Error generating PDF edit suggestions: {str(e)}")
            return {
                'improved_text': current_content,
                'explanation': f'Error: {str(e)}',
                'changes': []
            }


# Global instance
ai_service = AIService()