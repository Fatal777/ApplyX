"""Speech Service for Interview Platform - Deepgram STT + edge-tts TTS"""

import io
import base64
import asyncio
from typing import Optional, Dict, Any, Tuple
from abc import ABC, abstractmethod

import httpx
import pybreaker
from deepgram import DeepgramClient
import edge_tts

from app.core.config import settings
from app.core.resilience import (
    openai_breaker,
    elevenlabs_breaker,
    with_retry,
    get_logger,
    with_timeout,
    RetryError
)

logger = get_logger(__name__)


class STTProvider(ABC):
    """Abstract base class for Speech-to-Text providers"""
    
    @abstractmethod
    async def transcribe(self, audio_data: bytes, audio_format: str = "webm") -> Tuple[str, float]:
        """Transcribe audio to text. Returns (transcript, duration_seconds)"""
        pass


class TTSProvider(ABC):
    """Abstract base class for Text-to-Speech providers"""
    
    @abstractmethod
    async def synthesize(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """Synthesize text to speech. Returns audio bytes (mp3)"""
        pass


class DeepgramSTT(STTProvider):
    """Deepgram Nova-2 API for speech-to-text (Budget-optimized)"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        # Initialize Deepgram client with API key
        self.client = DeepgramClient(api_key=api_key)
        self.model = settings.DEEPGRAM_MODEL
    
    async def transcribe(self, audio_data: bytes, audio_format: str = "webm") -> Tuple[str, float]:
        """
        Transcribe audio using Deepgram Nova-2 API
        
        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format (webm, mp3, wav, etc.)
            
        Returns:
            Tuple of (transcript text, audio duration in seconds)
        """
        try:
            # Configure Deepgram options
            options = {
                "model": self.model,
                "language": "en",
                "smart_format": True,
                "punctuate": True,
                "utterances": False,
                "diarize": False,
            }
            
            # Make API call with retry logic
            async def _make_request():
                response = await self.client.listen.rest.v("1").transcribe_file(
                    {"buffer": audio_data},
                    options
                )
                return response
            
            try:
                result = await with_timeout(
                    with_retry(
                        _make_request,
                        max_attempts=2,
                        base_delay=1.0,
                        retryable_exceptions=(
                            Exception,  # Deepgram SDK exceptions
                        ),
                        logger=logger,
                    ),
                    timeout_seconds=60,
                    timeout_message="Deepgram transcription timed out after 60s"
                )
            except RetryError as e:
                logger.error("All retry attempts failed for Deepgram", error=str(e.last_error))
                raise SpeechServiceError(f"Transcription failed: {str(e.last_error)}")
            
            # Extract transcript and duration
            transcript = ""
            duration = 0.0
            
            if result and hasattr(result, 'results'):
                channels = result.results.channels
                if channels and len(channels) > 0:
                    alternatives = channels[0].alternatives
                    if alternatives and len(alternatives) > 0:
                        transcript = alternatives[0].transcript.strip()
                
                # Get duration from metadata
                if hasattr(result.results, 'metadata') and result.results.metadata:
                    duration = result.results.metadata.duration or 0.0
            
            logger.info(
                "Deepgram transcription successful",
                chars=len(transcript),
                duration_secs=f"{duration:.2f}"
            )
            return transcript, duration
                
        except SpeechServiceError:
            raise
        except Exception as e:
            logger.error(f"Deepgram transcription error: {str(e)}")
            raise SpeechServiceError(f"Transcription failed: {str(e)}")


class EdgeTTS(TTSProvider):
    """Microsoft edge-tts for text-to-speech (Free, high-quality)"""
    
    # Voice presets for different interview personas
    VOICE_PRESETS = {
        "professional": "en-US-JennyNeural",      # Professional female voice
        "friendly": "en-US-AriaNeural",           # Friendly female voice
        "authoritative": "en-US-GuyNeural",       # Authoritative male voice
        "default": "en-US-JennyNeural",           # Jenny as default
    }
    
    def __init__(self):
        self.default_voice = self.VOICE_PRESETS["default"]
    
    async def synthesize(
        self, 
        text: str, 
        voice_id: Optional[str] = None
    ) -> bytes:
        """
        Synthesize text to speech using edge-tts
        
        Args:
            text: Text to synthesize
            voice_id: Voice preset name or edge-tts voice ID
            
        Returns:
            Audio bytes in mp3 format
        """
        try:
            # Resolve voice ID from preset or use directly
            if voice_id in self.VOICE_PRESETS:
                resolved_voice = self.VOICE_PRESETS[voice_id]
            elif voice_id:
                resolved_voice = voice_id
            else:
                resolved_voice = self.default_voice
            
            # Create TTS communicator
            communicate = edge_tts.Communicate(text, resolved_voice)
            
            # Generate audio
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            
            if not audio_chunks:
                raise SpeechServiceError("No audio generated from edge-tts")
            
            audio_bytes = b"".join(audio_chunks)
            
            logger.info(
                "edge-tts synthesis successful",
                text_chars=len(text),
                audio_bytes=len(audio_bytes),
                voice=resolved_voice
            )
            return audio_bytes
                
        except SpeechServiceError:
            raise
        except Exception as e:
            logger.error(f"edge-tts synthesis error: {str(e)}")
            raise SpeechServiceError(f"Speech synthesis failed: {str(e)}")
    
    async def get_available_voices(self) -> list[Dict[str, Any]]:
        """Get list of available voices from edge-tts"""
        try:
            voices = await edge_tts.list_voices()
            # Filter to English voices only
            english_voices = [
                {
                    "id": v["ShortName"],
                    "name": v["ShortName"],
                    "gender": v["Gender"],
                    "locale": v["Locale"]
                }
                for v in voices
                if v["Locale"].startswith("en-")
            ]
            return english_voices[:20]  # Return first 20 English voices
        except Exception as e:
            logger.error(f"Failed to get edge-tts voices: {str(e)}")
            return []


# Legacy providers kept for backward compatibility
class OpenAIWhisperSTT(STTProvider):
    """OpenAI Whisper API for speech-to-text (LEGACY)"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_url = "https://api.openai.com/v1/audio/transcriptions"
        self.model = "whisper-1"
    
    async def transcribe(self, audio_data: bytes, audio_format: str = "webm") -> Tuple[str, float]:
        """
        Transcribe audio using OpenAI Whisper API
        
        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format (webm, mp3, wav, etc.)
            
        Returns:
            Tuple of (transcript text, audio duration in seconds)
        """
        try:
            # Prepare multipart form data
            files = {
                "file": (f"audio.{audio_format}", io.BytesIO(audio_data), f"audio/{audio_format}"),
                "model": (None, self.model),
                "response_format": (None, "verbose_json"),
                "language": (None, "en"),
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            async def _make_request():
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.api_url,
                        headers=headers,
                        files=files
                    )
                    response.raise_for_status()
                    return response.json()
            
            # Use circuit breaker + retry for resilient API calls
            try:
                with openai_breaker:
                    result = await with_timeout(
                        with_retry(
                            _make_request,
                            max_attempts=2,
                            base_delay=1.0,
                            retryable_exceptions=(
                                httpx.TimeoutException,
                                httpx.NetworkError,
                                httpx.HTTPStatusError,
                            ),
                            logger=logger,
                        ),
                        timeout_seconds=90,
                        timeout_message="Whisper transcription timed out after 90s"
                    )
            except pybreaker.CircuitBreakerError:
                logger.error("Circuit breaker open - Whisper service unavailable")
                raise SpeechServiceError("Transcription service temporarily unavailable")
            except RetryError as e:
                logger.error("All retry attempts failed for Whisper", error=str(e.last_error))
                raise SpeechServiceError(f"Transcription failed: {str(e.last_error)}")
            
            transcript = result.get("text", "").strip()
            duration = result.get("duration", 0.0)
            
            logger.info(
                "Whisper transcription successful",
                chars=len(transcript),
                duration_secs=f"{duration:.2f}"
            )
            return transcript, duration
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Whisper API HTTP error: {e.response.status_code} - {e.response.text}")
            raise SpeechServiceError(f"Transcription failed: {e.response.status_code}")
        except SpeechServiceError:
            raise
        except Exception as e:
            logger.error(f"Whisper transcription error: {str(e)}")
            raise SpeechServiceError(f"Transcription failed: {str(e)}")


class ElevenLabsTTS(TTSProvider):
    """ElevenLabs API for text-to-speech (LEGACY)"""
    
    # Default voices for different interview personas
    VOICE_PRESETS = {
        "professional": "21m00Tcm4TlvDq8ikWAM",  # Rachel - warm professional
        "friendly": "EXAVITQu4vr4xnSDxMaL",      # Bella - friendly
        "authoritative": "VR6AewLTigWG4xSOukaG", # Arnold - authoritative
        "default": "21m00Tcm4TlvDq8ikWAM",       # Rachel as default
    }
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_url = "https://api.elevenlabs.io/v1/text-to-speech"
        self.default_voice = self.VOICE_PRESETS["default"]
        
        # Voice settings for natural interview conversation
        self.voice_settings = {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    
    async def synthesize(
        self, 
        text: str, 
        voice_id: Optional[str] = None,
        model_id: str = "eleven_turbo_v2"
    ) -> bytes:
        """
        Synthesize text to speech using ElevenLabs API
        
        Args:
            text: Text to synthesize
            voice_id: ElevenLabs voice ID or preset name
            model_id: TTS model (eleven_turbo_v2 for speed, eleven_multilingual_v2 for quality)
            
        Returns:
            Audio bytes in mp3 format
        """
        try:
            # Resolve voice ID from preset or use directly
            if voice_id in self.VOICE_PRESETS:
                resolved_voice = self.VOICE_PRESETS[voice_id]
            elif voice_id:
                resolved_voice = voice_id
            else:
                resolved_voice = self.default_voice
            
            url = f"{self.api_url}/{resolved_voice}"
            
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.api_key
            }
            
            payload = {
                "text": text,
                "model_id": model_id,
                "voice_settings": self.voice_settings
            }
            
            async def _make_request():
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    return response.content
            
            # Use circuit breaker + retry for resilient API calls
            try:
                with elevenlabs_breaker:
                    audio_bytes = await with_timeout(
                        with_retry(
                            _make_request,
                            max_attempts=2,
                            base_delay=0.5,
                            retryable_exceptions=(
                                httpx.TimeoutException,
                                httpx.NetworkError,
                            ),
                            logger=logger,
                        ),
                        timeout_seconds=45,
                        timeout_message="ElevenLabs TTS timed out after 45s"
                    )
            except pybreaker.CircuitBreakerError:
                logger.error("Circuit breaker open - ElevenLabs service unavailable")
                raise SpeechServiceError("Speech synthesis service temporarily unavailable")
            except RetryError as e:
                logger.error("All retry attempts failed for ElevenLabs", error=str(e.last_error))
                raise SpeechServiceError(f"Speech synthesis failed: {str(e.last_error)}")
            
            logger.info(
                "ElevenLabs TTS successful",
                text_chars=len(text),
                audio_bytes=len(audio_bytes)
            )
            return audio_bytes
                
        except httpx.HTTPStatusError as e:
            logger.error(f"ElevenLabs API HTTP error: {e.response.status_code} - {e.response.text}")
            raise SpeechServiceError(f"Speech synthesis failed: {e.response.status_code}")
        except SpeechServiceError:
            raise
        except Exception as e:
            logger.error(f"ElevenLabs TTS error: {str(e)}")
            raise SpeechServiceError(f"Speech synthesis failed: {str(e)}")
    
    async def get_available_voices(self) -> list[Dict[str, Any]]:
        """Get list of available voices from ElevenLabs"""
        try:
            headers = {"xi-api-key": self.api_key}
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.elevenlabs.io/v1/voices",
                    headers=headers
                )
                response.raise_for_status()
                
                data = response.json()
                return data.get("voices", [])
                
        except Exception as e:
            logger.error(f"Failed to get ElevenLabs voices: {str(e)}")
            return []


class SpeechServiceError(Exception):
    """Custom exception for speech service errors"""
    pass


class SpeechService:
    """
    Unified speech service for interview platform.
    Handles both STT (Deepgram/Whisper) and TTS (edge-tts/ElevenLabs) with fallbacks.
    """
    
    def __init__(self):
        self.stt_provider: Optional[STTProvider] = None
        self.tts_provider: Optional[TTSProvider] = None
        self._initialized = False
        
        self._init_providers()
    
    def _init_providers(self):
        """Initialize STT and TTS providers based on configuration"""
        # Initialize STT - Prefer Deepgram (budget-optimized), fallback to Whisper
        deepgram_key = settings.DEEPGRAM_API_KEY
        openai_key = settings.OPENAI_API_KEY
        
        if deepgram_key:
            self.stt_provider = DeepgramSTT(deepgram_key)
            logger.info("STT initialized with Deepgram Nova-2 (budget-optimized)")
        elif openai_key:
            self.stt_provider = OpenAIWhisperSTT(openai_key)
            logger.info("STT initialized with OpenAI Whisper (legacy fallback)")
        else:
            logger.warning("No STT API key configured - STT will not work")
        
        # Initialize TTS - Prefer edge-tts (free), fallback to ElevenLabs
        # edge-tts is always available (no API key needed)
        self.tts_provider = EdgeTTS()
        logger.info("TTS initialized with edge-tts (budget-optimized, free)")
        
        # Store ElevenLabs as fallback if available
        elevenlabs_key = getattr(settings, 'ELEVENLABS_API_KEY', None)
        if elevenlabs_key:
            self._tts_fallback = ElevenLabsTTS(elevenlabs_key)
            logger.info("ElevenLabs TTS available as fallback")
        else:
            self._tts_fallback = None
        
        self._initialized = True
    
    @property
    def is_stt_available(self) -> bool:
        """Check if STT service is available"""
        return self.stt_provider is not None
    
    @property
    def is_tts_available(self) -> bool:
        """Check if TTS service is available"""
        return self.tts_provider is not None
    
    async def transcribe_audio(
        self, 
        audio_data: bytes, 
        audio_format: str = "webm"
    ) -> Dict[str, Any]:
        """
        Transcribe audio to text
        
        Args:
            audio_data: Raw audio bytes (or base64 string)
            audio_format: Audio format (webm, mp3, wav, m4a, etc.)
            
        Returns:
            Dict with transcript, duration, and success status
        """
        if not self.stt_provider:
            return {
                "success": False,
                "error": "STT service not configured",
                "transcript": "",
                "duration": 0.0
            }
        
        try:
            # Handle base64 input
            if isinstance(audio_data, str):
                # Remove data URL prefix if present
                if audio_data.startswith("data:"):
                    audio_data = audio_data.split(",", 1)[1]
                audio_data = base64.b64decode(audio_data)
            
            transcript, duration = await self.stt_provider.transcribe(audio_data, audio_format)
            
            return {
                "success": True,
                "transcript": transcript,
                "duration": duration,
                "error": None
            }
            
        except SpeechServiceError as e:
            return {
                "success": False,
                "error": str(e),
                "transcript": "",
                "duration": 0.0
            }
        except Exception as e:
            logger.error(f"Unexpected transcription error: {str(e)}")
            return {
                "success": False,
                "error": f"Transcription failed: {str(e)}",
                "transcript": "",
                "duration": 0.0
            }
    
    async def synthesize_speech(
        self, 
        text: str, 
        voice: str = "professional",
        return_base64: bool = True
    ) -> Dict[str, Any]:
        """
        Synthesize text to speech
        
        Args:
            text: Text to synthesize
            voice: Voice preset or voice ID
            return_base64: Whether to return audio as base64 string
            
        Returns:
            Dict with audio data (base64 or bytes), format, and success status
        """
        if not self.tts_provider:
            return {
                "success": False,
                "error": "TTS service not configured",
                "audio": None,
                "format": None
            }
        
        if not text or not text.strip():
            return {
                "success": False,
                "error": "No text provided",
                "audio": None,
                "format": None
            }
        
        try:
            audio_bytes = await self.tts_provider.synthesize(text, voice)
            
            if return_base64:
                audio_data = base64.b64encode(audio_bytes).decode("utf-8")
            else:
                audio_data = audio_bytes
            
            return {
                "success": True,
                "audio": audio_data,
                "format": "mp3",
                "error": None
            }
            
        except SpeechServiceError as e:
            # Try fallback to ElevenLabs if available
            if self._tts_fallback:
                try:
                    logger.info("edge-tts failed, trying ElevenLabs fallback")
                    audio_bytes = await self._tts_fallback.synthesize(text, voice)
                    
                    if return_base64:
                        audio_data = base64.b64encode(audio_bytes).decode("utf-8")
                    else:
                        audio_data = audio_bytes
                    
                    return {
                        "success": True,
                        "audio": audio_data,
                        "format": "mp3",
                        "error": None
                    }
                except Exception as fallback_error:
                    logger.error(f"Fallback TTS also failed: {str(fallback_error)}")
            
            return {
                "success": False,
                "error": str(e),
                "audio": None,
                "format": None
            }
        except Exception as e:
            logger.error(f"Unexpected TTS error: {str(e)}")
            return {
                "success": False,
                "error": f"Speech synthesis failed: {str(e)}",
                "audio": None,
                "format": None
            }
    
    async def get_voice_options(self) -> list[Dict[str, str]]:
        """Get available voice options for TTS"""
        presets = [
            {"id": "professional", "name": "Professional", "description": "Warm, professional tone"},
            {"id": "friendly", "name": "Friendly", "description": "Casual, approachable tone"},
            {"id": "authoritative", "name": "Authoritative", "description": "Confident, commanding tone"},
        ]
        
        # Optionally fetch custom voices from edge-tts
        if isinstance(self.tts_provider, EdgeTTS):
            try:
                custom_voices = await self.tts_provider.get_available_voices()
                for voice in custom_voices[:5]:  # Limit to first 5 custom voices
                    presets.append({
                        "id": voice.get("id", ""),
                        "name": voice.get("name", "Custom Voice"),
                        "description": f"{voice.get('gender', '')} - {voice.get('locale', '')}"
                    })
            except Exception as e:
                logger.warning(f"Failed to fetch custom voices: {str(e)}")
        
        return presets
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of speech services"""
        stt_provider_name = None
        if isinstance(self.stt_provider, DeepgramSTT):
            stt_provider_name = "deepgram"
        elif isinstance(self.stt_provider, OpenAIWhisperSTT):
            stt_provider_name = "whisper"
        
        tts_provider_name = None
        if isinstance(self.tts_provider, EdgeTTS):
            tts_provider_name = "edge-tts"
        elif isinstance(self.tts_provider, ElevenLabsTTS):
            tts_provider_name = "elevenlabs"
        
        return {
            "stt_available": self.is_stt_available,
            "stt_provider": stt_provider_name,
            "tts_available": self.is_tts_available,
            "tts_provider": tts_provider_name,
            "tts_fallback": "elevenlabs" if self._tts_fallback else None,
        }


# Global instance
speech_service = SpeechService()
