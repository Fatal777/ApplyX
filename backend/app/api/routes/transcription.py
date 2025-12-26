"""
Real-time Transcription WebSocket
Streams audio to Deepgram for live speech-to-text transcription
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from websockets import connect as ws_connect
from websockets.exceptions import ConnectionClosed

from app.core.config import settings

router = APIRouter(prefix="/transcription", tags=["transcription"])
logger = logging.getLogger(__name__)

DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen"


class DeepgramConnection:
    """Manages WebSocket connection to Deepgram for real-time STT"""
    
    def __init__(self, client_ws: WebSocket):
        self.client_ws = client_ws
        self.deepgram_ws: Optional[any] = None
        self.is_running = False
        
    async def connect(self) -> bool:
        """Connect to Deepgram WebSocket"""
        if not settings.DEEPGRAM_API_KEY:
            logger.error("DEEPGRAM_API_KEY not configured")
            return False
            
        # Build Deepgram URL with parameters
        params = [
            "model=nova-2",
            "language=en",
            "smart_format=true",
            "interim_results=true",  # Get results as user speaks
            "utterance_end_ms=1000",
            "vad_events=true",
            "encoding=linear16",
            "sample_rate=16000",
            "channels=1"
        ]
        url = f"{DEEPGRAM_WS_URL}?{'&'.join(params)}"
        
        try:
            headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}
            self.deepgram_ws = await ws_connect(url, extra_headers=headers)
            self.is_running = True
            logger.info("Connected to Deepgram WebSocket")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Deepgram: {e}")
            return False
    
    async def receive_from_deepgram(self):
        """Receive transcription results from Deepgram and forward to client"""
        try:
            async for message in self.deepgram_ws:
                if not self.is_running:
                    break
                    
                data = json.loads(message)
                
                # Extract transcription from response
                if data.get("type") == "Results":
                    channel = data.get("channel", {})
                    alternatives = channel.get("alternatives", [])
                    
                    if alternatives:
                        transcript = alternatives[0].get("transcript", "")
                        is_final = data.get("is_final", False)
                        speech_final = data.get("speech_final", False)
                        
                        if transcript:
                            # Send to frontend
                            await self.client_ws.send_json({
                                "type": "transcript",
                                "text": transcript,
                                "is_final": is_final,
                                "speech_final": speech_final
                            })
                            
                elif data.get("type") == "UtteranceEnd":
                    await self.client_ws.send_json({
                        "type": "utterance_end"
                    })
                    
        except ConnectionClosed:
            logger.info("Deepgram connection closed")
        except Exception as e:
            logger.error(f"Error receiving from Deepgram: {e}")
        finally:
            self.is_running = False
    
    async def send_audio(self, audio_data: bytes):
        """Send audio data to Deepgram"""
        if self.deepgram_ws and self.is_running:
            try:
                await self.deepgram_ws.send(audio_data)
            except Exception as e:
                logger.error(f"Error sending audio to Deepgram: {e}")
                
    async def close(self):
        """Close the Deepgram connection"""
        self.is_running = False
        if self.deepgram_ws:
            try:
                await self.deepgram_ws.close()
            except:
                pass


@router.websocket("/stream")
async def websocket_transcription(websocket: WebSocket):
    """
    WebSocket endpoint for real-time transcription
    
    Client sends: Raw audio bytes (PCM 16-bit, 16kHz, mono)
    Server sends: JSON with transcript and metadata
    """
    await websocket.accept()
    logger.info("Client connected for transcription")
    
    deepgram = DeepgramConnection(websocket)
    
    try:
        # Connect to Deepgram
        if not await deepgram.connect():
            await websocket.send_json({
                "type": "error",
                "message": "Failed to connect to transcription service"
            })
            await websocket.close()
            return
        
        # Start receiving from Deepgram in background
        receive_task = asyncio.create_task(deepgram.receive_from_deepgram())
        
        # Send ready signal to client
        await websocket.send_json({"type": "ready"})
        
        # Receive audio from client and forward to Deepgram
        try:
            while deepgram.is_running:
                # Receive binary audio data from client
                data = await websocket.receive()
                
                if "bytes" in data:
                    await deepgram.send_audio(data["bytes"])
                elif "text" in data:
                    # Handle control messages
                    msg = json.loads(data["text"])
                    if msg.get("type") == "stop":
                        break
                        
        except WebSocketDisconnect:
            logger.info("Client disconnected")
            
    except Exception as e:
        logger.error(f"Transcription WebSocket error: {e}")
        
    finally:
        await deepgram.close()
        logger.info("Transcription session ended")


@router.get("/status")
async def transcription_status():
    """Check if transcription service is available"""
    return {
        "available": bool(settings.DEEPGRAM_API_KEY),
        "provider": "deepgram" if settings.DEEPGRAM_API_KEY else None
    }
