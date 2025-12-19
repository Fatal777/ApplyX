"""
Minimal API Key Validation Test
Tests if Gemini and Deepgram keys are valid and working
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.speech_service import speech_service
from app.services.interview_ai_service import interview_ai_service


async def test_api_keys():
    """Quick test to validate API keys"""
    print("\n" + "="*60)
    print("API KEY VALIDATION TEST")
    print("="*60)
    
    # Test 1: Speech Services Health Check
    print("\n1️⃣ Testing Speech Services...")
    health = await speech_service.health_check()
    print(f"   STT Provider: {health.get('stt_provider', 'None')}")
    print(f"   TTS Provider: {health.get('tts_provider', 'None')}")
    
    # Test 2: TTS (Free - edge-tts)
    print("\n2️⃣ Testing TTS (edge-tts - Free)...")
    try:
        result = await speech_service.synthesize_speech(
            text="Hello",
            voice="professional"
        )
        if result['success']:
            print(f"   ✅ TTS Working! Generated {len(result['audio'])//1000}KB audio")
        else:
            print(f"   ❌ TTS Failed: {result['error']}")
    except Exception as e:
        print(f"   ❌ TTS Error: {str(e)}")
    
    # Test 3: AI Service Health Check
    print("\n3️⃣ Testing AI Service...")
    ai_health = await interview_ai_service.health_check()
    print(f"   Provider: {ai_health.get('provider', 'None')}")
    print(f"   Model: {ai_health.get('model', 'None')}")
    print(f"   Available: {ai_health.get('available', False)}")
    
    # Test 4: Gemini AI (Minimal - 1 request only)
    if ai_health.get('available'):
        print("\n4️⃣ Testing Gemini AI (1 minimal request)...")
        try:
            response = await interview_ai_service.generate_response(
                user_transcript="Python",
                conversation_history=[],
                current_question="What's your favorite language?",
                next_question=None
            )
            if response.get('response'):
                print(f"   ✅ Gemini Working! Response: '{response['response'][:60]}...'")
            else:
                print(f"   ❌ No response generated")
        except Exception as e:
            error_msg = str(e)
            if "quota" in error_msg.lower() or "429" in error_msg:
                print(f"   ⚠️  Quota exceeded (API key valid, but rate limited)")
            else:
                print(f"   ❌ Gemini Error: {error_msg[:100]}")
    
    print("\n" + "="*60)
    print("✅ API KEY TEST COMPLETED")
    print("="*60)
    print("\nNote: If Gemini shows quota errors, the key is valid")
    print("but you've hit rate limits. Wait 30-60 seconds.\n")


if __name__ == "__main__":
    asyncio.run(test_api_keys())
