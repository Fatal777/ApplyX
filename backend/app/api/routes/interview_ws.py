"""
WebSocket Routes for Real-time Interview Sessions
Enables live audio streaming, real-time transcription, and instant feedback
"""

import logging
import json
import asyncio
import base64
from typing import Dict, Optional, Set
from datetime import datetime
from enum import Enum

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from fastapi.websockets import WebSocketState
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.models.user import User
from app.models.interview import (
    InterviewSession,
    InterviewResponse,
    InterviewStatus,
)
from app.services.speech_service import speech_service
from app.services.interview_ai_service import interview_ai_service
from app.schemas.interview import InterviewPersona
from app.core.security import verify_supabase_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/interview", tags=["Interview WebSocket"])


# ============== WebSocket Message Types ==============

class WSMessageType(str, Enum):
    # Client -> Server
    AUDIO_CHUNK = "audio_chunk"
    AUDIO_END = "audio_end"
    TEXT_RESPONSE = "text_response"
    SKIP_QUESTION = "skip_question"
    END_INTERVIEW = "end_interview"
    PING = "ping"
    
    # Server -> Client
    TRANSCRIPTION = "transcription"
    TRANSCRIPTION_PARTIAL = "transcription_partial"
    AI_RESPONSE = "ai_response"
    AI_RESPONSE_AUDIO = "ai_response_audio"
    QUESTION = "question"
    FEEDBACK_INSTANT = "feedback_instant"
    INTERVIEW_COMPLETE = "interview_complete"
    ERROR = "error"
    PONG = "pong"
    CONNECTION_ACK = "connection_ack"


class WSMessage(BaseModel):
    type: WSMessageType
    data: Optional[dict] = None
    timestamp: Optional[str] = None


# ============== Connection Manager ==============

class InterviewConnectionManager:
    """
    Manages WebSocket connections for interview sessions.
    Handles connection lifecycle, broadcasting, and session state.
    """
    
    def __init__(self):
        # session_id -> WebSocket
        self.active_connections: Dict[int, WebSocket] = {}
        # session_id -> audio buffer
        self.audio_buffers: Dict[int, bytearray] = {}
        # session_id -> transcription task
        self.transcription_tasks: Dict[int, asyncio.Task] = {}
        # session_id -> last activity timestamp
        self.last_activity: Dict[int, datetime] = {}
    
    async def connect(self, websocket: WebSocket, session_id: int, user_id: int) -> bool:
        """Accept and register a new WebSocket connection."""
        try:
            await websocket.accept()
            
            # Check if session already has an active connection
            if session_id in self.active_connections:
                old_ws = self.active_connections[session_id]
                if old_ws.client_state == WebSocketState.CONNECTED:
                    await old_ws.close(code=4001, reason="New connection established")
            
            self.active_connections[session_id] = websocket
            self.audio_buffers[session_id] = bytearray()
            self.last_activity[session_id] = datetime.utcnow()
            
            logger.info(f"WebSocket connected: session={session_id}, user={user_id}")
            
            # Send connection acknowledgment
            await self.send_message(session_id, WSMessage(
                type=WSMessageType.CONNECTION_ACK,
                data={
                    "session_id": session_id,
                    "user_id": user_id,
                    "status": "connected"
                }
            ))
            
            return True
            
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            return False
    
    async def disconnect(self, session_id: int):
        """Clean up connection resources."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        
        if session_id in self.audio_buffers:
            del self.audio_buffers[session_id]
        
        if session_id in self.transcription_tasks:
            task = self.transcription_tasks.pop(session_id)
            if not task.done():
                task.cancel()
        
        if session_id in self.last_activity:
            del self.last_activity[session_id]
        
        logger.info(f"WebSocket disconnected: session={session_id}")
    
    async def send_message(self, session_id: int, message: WSMessage):
        """Send a message to a specific session."""
        if session_id not in self.active_connections:
            return
        
        websocket = self.active_connections[session_id]
        if websocket.client_state != WebSocketState.CONNECTED:
            return
        
        try:
            message.timestamp = datetime.utcnow().isoformat()
            await websocket.send_json(message.dict())
        except Exception as e:
            logger.error(f"Failed to send message to session {session_id}: {e}")
    
    async def send_error(self, session_id: int, error: str, code: str = "UNKNOWN_ERROR"):
        """Send an error message to a session."""
        await self.send_message(session_id, WSMessage(
            type=WSMessageType.ERROR,
            data={"error": error, "code": code}
        ))
    
    def append_audio(self, session_id: int, audio_data: bytes):
        """Append audio chunk to session buffer."""
        if session_id in self.audio_buffers:
            self.audio_buffers[session_id].extend(audio_data)
            self.last_activity[session_id] = datetime.utcnow()
    
    def get_audio_buffer(self, session_id: int) -> bytes:
        """Get and clear the audio buffer for a session."""
        if session_id in self.audio_buffers:
            audio = bytes(self.audio_buffers[session_id])
            self.audio_buffers[session_id] = bytearray()
            return audio
        return b""
    
    def is_connected(self, session_id: int) -> bool:
        """Check if a session has an active connection."""
        if session_id not in self.active_connections:
            return False
        return self.active_connections[session_id].client_state == WebSocketState.CONNECTED


# Global connection manager
manager = InterviewConnectionManager()


# ============== Authentication ==============

async def get_ws_user(token: str, db: Session) -> Optional[User]:
    """Authenticate WebSocket connection using JWT token."""
    try:
        payload = verify_supabase_token(token)
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        user = db.query(User).filter(User.supabase_id == user_id).first()
        return user
        
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        return None


async def verify_session_access(session_id: int, user_id: int, db: Session) -> Optional[InterviewSession]:
    """Verify user has access to the interview session."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == user_id
    ).first()
    
    if not session:
        return None
    
    if session.status not in [InterviewStatus.SCHEDULED, InterviewStatus.IN_PROGRESS]:
        return None
    
    return session


# ============== WebSocket Handlers ==============

async def handle_audio_chunk(session_id: int, data: dict, db: Session):
    """Handle incoming audio chunk from client."""
    try:
        audio_b64 = data.get("audio")
        if not audio_b64:
            await manager.send_error(session_id, "No audio data provided", "INVALID_AUDIO")
            return
        
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_b64)
        manager.append_audio(session_id, audio_bytes)
        
        # Optional: Send partial transcription for real-time feedback
        # This would require streaming transcription API
        
    except Exception as e:
        logger.error(f"Error handling audio chunk: {e}")
        await manager.send_error(session_id, str(e), "AUDIO_PROCESSING_ERROR")


async def handle_audio_end(session_id: int, data: dict, db: Session):
    """Handle end of audio recording, process transcription."""
    try:
        # Get accumulated audio
        audio_data = manager.get_audio_buffer(session_id)
        
        if len(audio_data) < 1000:  # Minimum audio length
            await manager.send_error(session_id, "Audio too short", "AUDIO_TOO_SHORT")
            return
        
        # Encode for API
        audio_b64 = base64.b64encode(audio_data).decode('utf-8')
        audio_format = data.get("format", "webm")
        
        # Transcribe audio
        result = await speech_service.transcribe_audio(
            audio_data=audio_b64,
            audio_format=audio_format
        )
        
        if result["success"]:
            await manager.send_message(session_id, WSMessage(
                type=WSMessageType.TRANSCRIPTION,
                data={
                    "transcript": result["transcript"],
                    "duration": result.get("duration", 0),
                    "confidence": result.get("confidence", 0.9)
                }
            ))
        else:
            await manager.send_error(
                session_id, 
                result.get("error", "Transcription failed"),
                "TRANSCRIPTION_ERROR"
            )
        
    except Exception as e:
        logger.error(f"Error processing audio end: {e}")
        await manager.send_error(session_id, str(e), "TRANSCRIPTION_ERROR")


async def handle_text_response(session_id: int, data: dict, db: Session):
    """
    Handle user's text response (either typed or from transcription).
    Process with AI and generate interviewer response.
    """
    try:
        transcript = data.get("transcript", "").strip()
        question_number = data.get("question_number", 1)
        
        if not transcript:
            await manager.send_error(session_id, "Empty response", "EMPTY_RESPONSE")
            return
        
        # Get session
        session = db.query(InterviewSession).filter(
            InterviewSession.id == session_id
        ).first()
        
        if not session:
            await manager.send_error(session_id, "Session not found", "SESSION_NOT_FOUND")
            return
        
        config = session.config or {}
        questions = config.get("questions", [])
        current_q_idx = question_number - 1
        
        if current_q_idx < 0 or current_q_idx >= len(questions):
            await manager.send_error(session_id, "Invalid question number", "INVALID_QUESTION")
            return
        
        current_question = questions[current_q_idx]
        next_question = questions[current_q_idx + 1] if current_q_idx + 1 < len(questions) else None
        
        # Get conversation history
        previous_responses = db.query(InterviewResponse).filter(
            InterviewResponse.session_id == session_id
        ).order_by(InterviewResponse.question_number).all()
        
        conversation_history = []
        for resp in previous_responses[-3:]:
            conversation_history.append({"role": "assistant", "content": resp.question_text})
            conversation_history.append({"role": "user", "content": resp.transcript})
        
        # Generate AI response
        ai_response = await interview_ai_service.generate_response(
            user_transcript=transcript,
            conversation_history=conversation_history,
            current_question=current_question["question"],
            next_question=next_question["question"] if next_question else None,
            persona=InterviewPersona(config.get("persona", "professional"))
        )
        
        # Analyze response (async)
        analysis = await interview_ai_service.analyze_response(
            question=current_question["question"],
            user_transcript=transcript,
            expected_skills=current_question.get("expected_skills", []),
            evaluation_criteria=current_question.get("evaluation_criteria", [])
        )
        
        # Save response to database
        interview_response = InterviewResponse(
            session_id=session_id,
            question_number=question_number,
            question_text=current_question["question"],
            transcript=transcript,
            audio_duration=data.get("duration", 0),
            ai_analysis=analysis,
            scores=analysis.get("scores", {})
        )
        db.add(interview_response)
        db.commit()
        
        # Send instant feedback
        await manager.send_message(session_id, WSMessage(
            type=WSMessageType.FEEDBACK_INSTANT,
            data={
                "question_number": question_number,
                "scores": analysis.get("scores", {}),
                "key_points": analysis.get("key_points_covered", []),
                "missed_points": analysis.get("missed_points", [])
            }
        ))
        
        # Send AI response text
        is_conclusion = ai_response.get("is_conclusion", False) or next_question is None
        
        await manager.send_message(session_id, WSMessage(
            type=WSMessageType.AI_RESPONSE,
            data={
                "response": ai_response["response"],
                "is_follow_up": ai_response.get("should_follow_up", False),
                "is_conclusion": is_conclusion,
                "next_question_number": question_number + 1 if not is_conclusion else None
            }
        ))
        
        # Generate and send TTS audio
        try:
            tts_result = await speech_service.synthesize_speech(
                text=ai_response["response"],
                voice=config.get("persona", "professional")
            )
            if tts_result["success"]:
                await manager.send_message(session_id, WSMessage(
                    type=WSMessageType.AI_RESPONSE_AUDIO,
                    data={
                        "audio": tts_result["audio"],
                        "format": "mp3"
                    }
                ))
        except Exception as e:
            logger.warning(f"TTS failed for session {session_id}: {e}")
        
        # If there's a next question, send it
        if next_question and ai_response.get("transition_to_next"):
            await manager.send_message(session_id, WSMessage(
                type=WSMessageType.QUESTION,
                data={
                    "question_number": question_number + 1,
                    "question": next_question["question"],
                    "category": next_question.get("category", "general"),
                    "total_questions": len(questions)
                }
            ))
        
    except Exception as e:
        logger.error(f"Error processing text response: {e}")
        await manager.send_error(session_id, str(e), "RESPONSE_PROCESSING_ERROR")


async def handle_end_interview(session_id: int, data: dict, db: Session):
    """Handle interview end request, generate final feedback."""
    try:
        session = db.query(InterviewSession).filter(
            InterviewSession.id == session_id
        ).first()
        
        if not session:
            await manager.send_error(session_id, "Session not found", "SESSION_NOT_FOUND")
            return
        
        # Get all responses
        responses = db.query(InterviewResponse).filter(
            InterviewResponse.session_id == session_id
        ).order_by(InterviewResponse.question_number).all()
        
        if not responses:
            await manager.send_error(session_id, "No responses found", "NO_RESPONSES")
            return
        
        # Prepare data
        response_data = [
            {"question": r.question_text, "transcript": r.transcript}
            for r in responses
        ]
        analysis_data = [r.ai_analysis or {} for r in responses]
        config = session.config or {}
        
        # Generate final feedback
        feedback_data = await interview_ai_service.generate_final_feedback(
            interview_type=session.interview_type,
            job_role=config.get("job_role"),
            responses=response_data,
            response_analyses=analysis_data
        )
        
        # Save feedback
        from app.models.interview import InterviewFeedback
        feedback = InterviewFeedback(
            session_id=session_id,
            overall_score=feedback_data.get("overall_score", 0),
            category_scores=feedback_data.get("category_scores", {}),
            strengths=feedback_data.get("top_strengths", []),
            improvements=feedback_data.get("priority_improvements", []),
            detailed_feedback=feedback_data.get("detailed_feedback", {}),
            recommendations=feedback_data.get("recommendations", [])
        )
        db.add(feedback)
        
        # Update session
        session.status = InterviewStatus.COMPLETED
        session.completed_at = datetime.utcnow()
        db.commit()
        
        # Send completion message
        await manager.send_message(session_id, WSMessage(
            type=WSMessageType.INTERVIEW_COMPLETE,
            data={
                "session_id": session_id,
                "overall_score": feedback.overall_score,
                "category_scores": feedback.category_scores,
                "strengths": feedback.strengths[:3],
                "improvements": feedback.improvements[:3],
                "feedback_id": feedback.id
            }
        ))
        
        logger.info(f"Interview {session_id} completed via WebSocket, score: {feedback.overall_score}")
        
    except Exception as e:
        logger.error(f"Error ending interview: {e}")
        await manager.send_error(session_id, str(e), "COMPLETION_ERROR")


# ============== Main WebSocket Endpoint ==============

@router.websocket("/{session_id}")
async def interview_websocket(
    websocket: WebSocket,
    session_id: int,
    token: str = Query(..., description="JWT authentication token")
):
    """
    WebSocket endpoint for real-time interview sessions.
    
    Protocol:
    1. Connect with JWT token for authentication
    2. Receive CONNECTION_ACK on successful auth
    3. Exchange messages using WSMessageType protocol
    4. Handle disconnection gracefully
    
    Message Types (Client -> Server):
    - audio_chunk: Stream audio data (base64 encoded)
    - audio_end: Signal end of audio recording
    - text_response: Submit text response (typed or transcribed)
    - skip_question: Skip current question
    - end_interview: End the interview and get feedback
    - ping: Keep-alive ping
    
    Message Types (Server -> Client):
    - transcription: Final transcription result
    - transcription_partial: Partial/streaming transcription
    - ai_response: AI interviewer's text response
    - ai_response_audio: AI response as audio (base64 mp3)
    - question: Next question details
    - feedback_instant: Real-time feedback on answer
    - interview_complete: Final feedback summary
    - error: Error message
    - pong: Keep-alive pong
    - connection_ack: Connection confirmed
    """
    db = next(get_db())
    
    try:
        # Authenticate user
        user = await get_ws_user(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
            return
        
        # Verify session access
        session = await verify_session_access(session_id, user.id, db)
        if not session:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session not found or access denied")
            return
        
        # Update session status
        if session.status == InterviewStatus.SCHEDULED:
            session.status = InterviewStatus.IN_PROGRESS
            db.commit()
        
        # Connect
        connected = await manager.connect(websocket, session_id, user.id)
        if not connected:
            return
        
        # Message loop
        while True:
            try:
                raw_message = await websocket.receive_json()
                message = WSMessage(**raw_message)
                
                # Route message to appropriate handler
                if message.type == WSMessageType.AUDIO_CHUNK:
                    await handle_audio_chunk(session_id, message.data or {}, db)
                
                elif message.type == WSMessageType.AUDIO_END:
                    await handle_audio_end(session_id, message.data or {}, db)
                
                elif message.type == WSMessageType.TEXT_RESPONSE:
                    await handle_text_response(session_id, message.data or {}, db)
                
                elif message.type == WSMessageType.SKIP_QUESTION:
                    # Handle skip - just send next question
                    config = session.config or {}
                    questions = config.get("questions", [])
                    current = (message.data or {}).get("question_number", 1)
                    if current < len(questions):
                        next_q = questions[current]
                        await manager.send_message(session_id, WSMessage(
                            type=WSMessageType.QUESTION,
                            data={
                                "question_number": current + 1,
                                "question": next_q["question"],
                                "category": next_q.get("category", "general"),
                                "total_questions": len(questions)
                            }
                        ))
                
                elif message.type == WSMessageType.END_INTERVIEW:
                    await handle_end_interview(session_id, message.data or {}, db)
                    break  # Close connection after interview ends
                
                elif message.type == WSMessageType.PING:
                    await manager.send_message(session_id, WSMessage(type=WSMessageType.PONG))
                
                else:
                    logger.warning(f"Unknown message type: {message.type}")
                    
            except json.JSONDecodeError:
                await manager.send_error(session_id, "Invalid JSON message", "INVALID_JSON")
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await manager.send_error(session_id, str(e), "MESSAGE_PROCESSING_ERROR")
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
    finally:
        await manager.disconnect(session_id)
        db.close()


# ============== Health Check ==============

@router.get("/status")
async def websocket_status():
    """Get WebSocket service status."""
    return {
        "status": "healthy",
        "active_connections": len(manager.active_connections),
        "sessions": list(manager.active_connections.keys())
    }
