"""
Quick integration test for ApplyX backend services
Tests: Deepgram STT, edge-tts TTS, Gemini AI, Concurrency Control
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.speech_service import speech_service
from app.services.interview_ai_service import interview_ai_service, InterviewPersona
from app.models.interview import InterviewType, DifficultyLevel


async def test_speech_services():
    """Test STT and TTS services"""
    print("\n" + "="*60)
    print("TESTING SPEECH SERVICES")
    print("="*60)
    
    # Health check
    health = await speech_service.health_check()
    print(f"\n📊 Speech Service Health:")
    print(f"  STT Available: {health['stt_available']} (Provider: {health['stt_provider']})")
    print(f"  TTS Available: {health['tts_available']} (Provider: {health['tts_provider']})")
    if health.get('tts_fallback'):
        print(f"  TTS Fallback: {health['tts_fallback']}")
    
    # Test TTS
    if health['tts_available']:
        print(f"\n🔊 Testing TTS with edge-tts...")
        result = await speech_service.synthesize_speech(
            text="Hello! Welcome to your mock interview. Let's begin with your first question.",
            voice="professional"
        )
        if result['success']:
            audio_size = len(result['audio']) if not isinstance(result['audio'], str) else len(result['audio']) // 1.33  # base64 ~33% overhead
            print(f"  ✅ TTS Success! Audio size: ~{int(audio_size)} bytes")
        else:
            print(f"  ❌ TTS Failed: {result['error']}")
    
    # Get voice options
    voices = await speech_service.get_voice_options()
    print(f"\n🎤 Available Voices: {len(voices)}")
    for voice in voices[:3]:
        print(f"  - {voice['name']}: {voice['description']}")


async def test_ai_service():
    """Test Gemini AI service"""
    print("\n" + "="*60)
    print("TESTING AI SERVICE (GEMINI)")
    print("="*60)
    
    # Health check
    health = await interview_ai_service.health_check()
    print(f"\n📊 AI Service Health:")
    print(f"  Available: {health['available']}")
    print(f"  Provider: {health['provider']}")
    print(f"  Model: {health['model']}")
    if health.get('concurrency_limit'):
        print(f"  Concurrency Limit: {health['concurrency_limit']}")
    
    if not health['available']:
        print("  ⚠️  AI service not configured - skipping tests")
        return
    
    # Test question generation
    print(f"\n📝 Testing Question Generation...")
    try:
        questions = await interview_ai_service.generate_questions(
            interview_type=InterviewType.BEHAVIORAL,
            job_role="Software Engineer",
            num_questions=3,
            difficulty=DifficultyLevel.INTERMEDIATE
        )
        print(f"  ✅ Generated {len(questions)} questions")
        for i, q in enumerate(questions, 1):
            print(f"  {i}. {q['question'][:80]}...")
    except Exception as e:
        print(f"  ❌ Question generation failed: {str(e)}")
    
    # Test response generation
    print(f"\n💬 Testing Response Generation...")
    try:
        response = await interview_ai_service.generate_response(
            user_transcript="I have 5 years of experience in backend development, focusing on Python and FastAPI.",
            conversation_history=[],
            current_question="Tell me about yourself",
            next_question="What are your key strengths?",
            persona=InterviewPersona.PROFESSIONAL
        )
        print(f"  ✅ Response generated:")
        print(f"     {response['response']}")
        print(f"     Should follow up: {response['should_follow_up']}")
    except Exception as e:
        print(f"  ❌ Response generation failed: {str(e)}")
    
    # Test response analysis
    print(f"\n📊 Testing Response Analysis...")
    try:
        analysis = await interview_ai_service.analyze_response(
            question="Tell me about a challenging project you worked on",
            user_transcript="I worked on a microservices migration project where we had to move from a monolith to distributed services. I led the API design and handled the authentication service migration.",
            expected_skills=["technical leadership", "problem-solving"],
            evaluation_criteria=["STAR method", "specific examples"]
        )
        print(f"  ✅ Analysis completed:")
        print(f"     Clarity: {analysis['scores']['clarity']}/100")
        print(f"     Relevance: {analysis['scores']['relevance']}/100")
        print(f"     Depth: {analysis['scores']['depth']}/100")
        print(f"     Strengths: {', '.join(analysis['strengths'][:2])}")
    except Exception as e:
        print(f"  ❌ Analysis failed: {str(e)}")


async def test_concurrency():
    """Test concurrency control with Gemini"""
    print("\n" + "="*60)
    print("TESTING CONCURRENCY CONTROL")
    print("="*60)
    
    health = await interview_ai_service.health_check()
    if not health['available'] or health['provider'] != 'gemini':
        print("  ⚠️  Gemini not configured - skipping concurrency tests")
        return
    
    print(f"\n🔄 Testing concurrent requests (limit: {health.get('concurrency_limit', 10)})...")
    
    async def make_request(idx):
        try:
            result = await interview_ai_service.generate_response(
                user_transcript=f"Test response {idx}",
                conversation_history=[],
                current_question="Test question",
                next_question="Next question",
                persona=InterviewPersona.PROFESSIONAL
            )
            return f"Request {idx}: ✅ Success"
        except Exception as e:
            return f"Request {idx}: ❌ {str(e)[:50]}"
    
    # Fire 5 concurrent requests
    tasks = [make_request(i) for i in range(5)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for result in results:
        if isinstance(result, Exception):
            print(f"  ❌ {str(result)}")
        else:
            print(f"  {result}")


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("ApplyX Backend Integration Tests")
    print("="*60)
    
    try:
        await test_speech_services()
        await test_ai_service()
        await test_concurrency()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED")
        print("="*60)
        print("\nNote: Some tests may fail if API keys are not configured.")
        print("Configure .env with GEMINI_API_KEY and DEEPGRAM_API_KEY for full functionality.\n")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
