"""Speech Service for Interview Platform - Whisper STT + ElevenLabs TTS"""

import logging
import io
import base64
import asyncio
from typing import Optional, Dict, Any, Tuple
from abc import ABC, abstractmethod

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


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


class OpenAIWhisperSTT(STTProvider):
    """OpenAI Whisper API for speech-to-text"""
    
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
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    files=files
                )
                response.raise_for_status()
                
                result = response.json()
                transcript = result.get("text", "").strip()
                duration = result.get("duration", 0.0)
                
                logger.info(f"Whisper transcription successful: {len(transcript)} chars, {duration:.2f}s")
                return transcript, duration
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Whisper API HTTP error: {e.response.status_code} - {e.response.text}")
            raise SpeechServiceError(f"Transcription failed: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Whisper transcription error: {str(e)}")
            raise SpeechServiceError(f"Transcription failed: {str(e)}")


class ElevenLabsTTS(TTSProvider):
    """ElevenLabs API for text-to-speech"""
    
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
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                
                audio_bytes = response.content
                logger.info(f"ElevenLabs TTS successful: {len(text)} chars -> {len(audio_bytes)} bytes")
                return audio_bytes
                
        except httpx.HTTPStatusError as e:
            logger.error(f"ElevenLabs API HTTP error: {e.response.status_code} - {e.response.text}")
            raise SpeechServiceError(f"Speech synthesis failed: {e.response.status_code}")
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
    Handles both STT (Whisper) and TTS (ElevenLabs) with fallbacks.
    """
    
    def __init__(self):
        self.stt_provider: Optional[STTProvider] = None
        self.tts_provider: Optional[TTSProvider] = None
        self._initialized = False
        
        self._init_providers()
    
    def _init_providers(self):
        """Initialize STT and TTS providers based on configuration"""
        # Initialize Whisper STT (uses OpenAI API)
        openai_key = settings.OPENAI_API_KEY
        if openai_key:
            self.stt_provider = OpenAIWhisperSTT(openai_key)
            logger.info("Whisper STT initialized with OpenAI API")
        else:
            logger.warning("OpenAI API key not configured - STT will not work")
        
        # Initialize ElevenLabs TTS
        elevenlabs_key = getattr(settings, 'ELEVENLABS_API_KEY', None)
        if elevenlabs_key:
            self.tts_provider = ElevenLabsTTS(elevenlabs_key)
            logger.info("ElevenLabs TTS initialized")
        else:
            logger.warning("ElevenLabs API key not configured - TTS will not work")
        
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
            voice: Voice preset or ElevenLabs voice ID
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
        
        # Optionally fetch custom voices from ElevenLabs
        if isinstance(self.tts_provider, ElevenLabsTTS):
            try:
                custom_voices = await self.tts_provider.get_available_voices()
                for voice in custom_voices[:5]:  # Limit to first 5 custom voices
                    presets.append({
                        "id": voice.get("voice_id", ""),
                        "name": voice.get("name", "Custom Voice"),
                        "description": voice.get("description", "Custom voice")
                    })
            except Exception as e:
                logger.warning(f"Failed to fetch custom voices: {str(e)}")
        
        return presets
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of speech services"""
        return {
            "stt_available": self.is_stt_available,
            "stt_provider": "whisper" if self.is_stt_available else None,
            "tts_available": self.is_tts_available,
            "tts_provider": "elevenlabs" if self.is_tts_available else None,
        }


# Global instance
speech_service = SpeechService()
