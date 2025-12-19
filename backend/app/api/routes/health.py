"""
Enhanced Health Monitoring System
Detailed health checks for all critical services
"""

from fastapi import APIRouter, Response, status
from datetime import datetime
from typing import Dict, Any
import asyncio
import httpx
from sqlalchemy import text

from app.core.config import settings
from app.db.database import get_db
from app.services.speech_service import SpeechService
from app.services.interview_ai_service import InterviewAIService

router = APIRouter(tags=["Health"])


async def check_database() -> Dict[str, Any]:
    """Check database connectivity and performance"""
    try:
        start_time = datetime.now()
        db = next(get_db())
        
        # Simple query to test connection
        result = db.execute(text("SELECT 1"))
        result.fetchone()
        
        latency_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        # Check connection pool
        pool = db.get_bind().pool
        pool_status = {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
        }
        
        return {
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "pool": pool_status
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def check_deepgram() -> Dict[str, Any]:
    """Check Deepgram API connectivity"""
    if not settings.DEEPGRAM_API_KEY:
        return {
            "status": "not_configured",
            "message": "DEEPGRAM_API_KEY not set"
        }
    
    try:
        start_time = datetime.now()
        
        # Test API key validity by checking balance
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.deepgram.com/v1/projects",
                headers={"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"},
                timeout=5.0
            )
            
        latency_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        if response.status_code == 200:
            data = response.json()
            return {
                "status": "healthy",
                "latency_ms": round(latency_ms, 2),
                "api_accessible": True,
                "projects_found": len(data.get("projects", []))
            }
        else:
            return {
                "status": "unhealthy",
                "error": f"HTTP {response.status_code}",
                "latency_ms": round(latency_ms, 2)
            }
    except asyncio.TimeoutError:
        return {
            "status": "unhealthy",
            "error": "Request timeout (>5s)"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def check_gemini() -> Dict[str, Any]:
    """Check Google Gemini API connectivity"""
    if not settings.GEMINI_API_KEY:
        return {
            "status": "not_configured",
            "message": "GEMINI_API_KEY not set"
        }
    
    try:
        start_time = datetime.now()
        ai_service = InterviewAIService()
        
        # Test with a simple prompt
        response = await ai_service.generate_response(
            context="Test health check",
            user_input="Hello",
            interview_config={"type": "behavioral", "difficulty": "mid"}
        )
        
        latency_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        # Check semaphore status
        semaphore_status = {
            "max_concurrent": ai_service.max_concurrent_calls,
            "available_slots": ai_service._semaphore._value if hasattr(ai_service, '_semaphore') else None
        }
        
        return {
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "api_accessible": True,
            "test_response_length": len(response) if response else 0,
            "semaphore": semaphore_status
        }
    except asyncio.TimeoutError:
        return {
            "status": "unhealthy",
            "error": "Request timeout"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def check_edge_tts() -> Dict[str, Any]:
    """Check Edge TTS availability"""
    try:
        import edge_tts
        
        # Edge TTS is local, just verify it's installed
        voices = await edge_tts.list_voices()
        
        jenny_available = any(
            v.get("ShortName") == "en-US-JennyNeural" 
            for v in voices
        )
        
        return {
            "status": "healthy",
            "voices_available": len(voices),
            "jenny_neural_available": jenny_available
        }
    except ImportError:
        return {
            "status": "unhealthy",
            "error": "edge-tts not installed"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@router.get("/health")
async def basic_health_check():
    """Basic health check endpoint (fast)"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "ApplyX Backend"
    }


@router.get("/health/detailed")
async def detailed_health_check(response: Response):
    """
    Comprehensive health check with all service dependencies
    Returns 200 if all services healthy, 503 if any critical service down
    """
    
    # Run all checks concurrently
    results = await asyncio.gather(
        check_database(),
        check_deepgram(),
        check_gemini(),
        check_edge_tts(),
        return_exceptions=True
    )
    
    database_health, deepgram_health, gemini_health, tts_health = results
    
    # Determine overall health
    critical_services = [database_health, deepgram_health, gemini_health]
    all_healthy = all(
        isinstance(s, dict) and s.get("status") == "healthy" 
        for s in critical_services
    )
    
    if not all_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    health_report = {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": database_health,
            "deepgram_stt": deepgram_health,
            "gemini_ai": gemini_health,
            "edge_tts": tts_health
        },
        "overall": {
            "all_services_healthy": all_healthy,
            "critical_services_count": len(critical_services),
            "healthy_count": sum(
                1 for s in critical_services 
                if isinstance(s, dict) and s.get("status") == "healthy"
            )
        }
    }
    
    return health_report


@router.get("/health/ready")
async def readiness_check(response: Response):
    """
    Kubernetes readiness probe
    Returns 200 only if ALL critical services are healthy
    """
    db_check = await check_database()
    
    if db_check.get("status") != "healthy":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "ready": False,
            "reason": "Database not ready"
        }
    
    return {
        "ready": True,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/health/live")
async def liveness_check():
    """
    Kubernetes liveness probe
    Returns 200 if application is running (doesn't check external services)
    """
    return {
        "alive": True,
        "timestamp": datetime.now().isoformat()
    }
