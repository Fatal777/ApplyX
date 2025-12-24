"""
Test Deepgram STT and TTS
Run: python3 test_deepgram.py
"""

import asyncio
import os

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(".env.production")
except ImportError:
    pass

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

async def test_stt():
    """Test Deepgram Speech-to-Text"""
    print("\n" + "="*50)
    print("Testing Deepgram STT (Speech-to-Text)")
    print("="*50)
    
    if not DEEPGRAM_API_KEY:
        print("❌ DEEPGRAM_API_KEY not set!")
        return False
    
    try:
        from deepgram import DeepgramClient
        
        # v5 SDK: pass API key as keyword argument
        client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
        
        AUDIO_URL = {"url": "https://static.deepgram.com/examples/Bueller-Life-moves-702a3dbe.wav"}
        
        # Use dict for options
        options = {"model": "nova-2", "smart_format": True}
        
        print(f"📡 Transcribing sample audio...")
        
        # v5 SDK: listen.v1.media.transcribe_url()
        response = client.listen.v1.media.transcribe_url(AUDIO_URL, options)
        
        transcript = response.results.channels[0].alternatives[0].transcript
        print(f"✅ STT Working!")
        print(f"📝 Transcript: \"{transcript}\"")
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("   Try: pip3 install --upgrade deepgram-sdk")
        return False
    except Exception as e:
        print(f"❌ STT Error: {e}")
        print("   Try: pip3 install --upgrade deepgram-sdk")
        return False


async def test_tts():
    """Test Text-to-Speech (using edge-tts which is free)"""
    print("\n" + "="*50)
    print("Testing TTS (Text-to-Speech) with edge-tts")
    print("="*50)
    
    try:
        import edge_tts
        
        text = "Hello! I am your AI interviewer. Let's begin the mock interview."
        voice = "en-US-AriaNeural"
        
        print(f"🎤 Generating speech for: \"{text}\"")
        
        communicate = edge_tts.Communicate(text, voice)
        output_file = "/tmp/test_tts_output.mp3"
        
        await communicate.save(output_file)
        
        file_size = os.path.getsize(output_file)
        print(f"✅ TTS Working!")
        print(f"📁 Audio saved: {output_file} ({file_size} bytes)")
        return True
        
    except Exception as e:
        print(f"❌ TTS Error: {e}")
        return False


async def test_livekit():
    """Test LiveKit connection"""
    print("\n" + "="*50)
    print("Testing LiveKit Configuration")
    print("="*50)
    
    livekit_url = os.getenv("LIVEKIT_URL")
    livekit_api_key = os.getenv("LIVEKIT_API_KEY")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if livekit_url:
        print(f"✅ LIVEKIT_URL: {livekit_url}")
    else:
        print("❌ LIVEKIT_URL not set!")
        
    if livekit_api_key:
        print(f"✅ LIVEKIT_API_KEY: {livekit_api_key[:10]}...")
    else:
        print("❌ LIVEKIT_API_KEY not set!")
        
    if livekit_api_secret:
        print(f"✅ LIVEKIT_API_SECRET: {livekit_api_secret[:10]}...")
    else:
        print("❌ LIVEKIT_API_SECRET not set!")
    
    if not all([livekit_url, livekit_api_key, livekit_api_secret]):
        return False
    
    # Test token generation with multiple SDK versions
    try:
        # Try livekit-api package first
        try:
            from livekit.api import AccessToken, VideoGrants
            
            token = AccessToken(livekit_api_key, livekit_api_secret)
            token.with_identity("test-user").with_name("Test User")
            token.with_grants(VideoGrants(room_join=True, room="test-room"))
            jwt_token = token.to_jwt()
            
        except (ImportError, AttributeError):
            # Try livekit package with api module
            from livekit import api
            
            token = api.AccessToken(livekit_api_key, livekit_api_secret)
            token.with_identity("test-user")
            token.with_name("Test User")
            token.with_grants(api.VideoGrants(room_join=True, room="test-room"))
            jwt_token = token.to_jwt()
        
        print(f"✅ Token generation working! Token length: {len(jwt_token)}")
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("   Try: pip3 install livekit-api")
        return False
    except Exception as e:
        print(f"❌ Token generation error: {e}")
        return False


async def main():
    print("\n🧪 ApplyX Speech Services Test")
    print("================================\n")
    
    stt_ok = await test_stt()
    tts_ok = await test_tts()
    livekit_ok = await test_livekit()
    
    print("\n" + "="*50)
    print("Summary")
    print("="*50)
    print(f"Deepgram STT:  {'✅ OK' if stt_ok else '❌ Failed'}")
    print(f"Edge TTS:      {'✅ OK' if tts_ok else '❌ Failed'}")
    print(f"LiveKit:       {'✅ OK' if livekit_ok else '❌ Failed'}")
    
    if all([stt_ok, tts_ok, livekit_ok]):
        print("\n🎉 All services ready for real-time interview!")
    else:
        print("\n⚠️  Some services need configuration.")


if __name__ == "__main__":
    asyncio.run(main())
