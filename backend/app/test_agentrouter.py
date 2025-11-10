"""
Test script for AgentRouter API
Place this file in backend/app/ directory
Run from backend directory: python -m app.test_agentrouter
Or run from backend/app: python test_agentrouter.py
"""

import openai
import os
import sys
from pathlib import Path

# Add parent directory to path to import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables from backend root
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def test_agentrouter():
    """Test AgentRouter API connection and basic functionality"""
    
    print("=" * 60)
    print("AgentRouter API Test")
    print("=" * 60)
    print()
    
    # Get API key from environment
    api_key = os.getenv('AGENTROUTER_API_KEY') or os.getenv('AGENT_ROUTER_TOKEN')
    
    if not api_key:
        print("❌ ERROR: AGENTROUTER_API_KEY or AGENT_ROUTER_TOKEN not found in environment!")
        print("\nPlease set one of these in your .env file:")
        print("AGENTROUTER_API_KEY=your_key_here")
        print("or")
        print("AGENT_ROUTER_TOKEN=your_key_here")
        return
    
    print(f"✓ API Key found: {api_key[:10]}...{api_key[-4:]}")
    print()
    
    # Configure OpenAI client for AgentRouter
    openai.api_key = api_key
    openai.api_base = "https://agentrouter.org/v1"
    model = "gpt-5"
    
    print(f"Configuration:")
    print(f"  Base URL: {openai.api_base}")
    print(f"  Model: {model}")
    print()
    
    # Test 1: Simple completion
    print("-" * 60)
    print("Test 1: Simple Chat Completion")
    print("-" * 60)
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant."
                },
                {
                    "role": "user",
                    "content": "Say 'Hello, AgentRouter is working!' if you receive this message."
                }
            ],
            temperature=0.7,
            max_tokens=50
        )
        
        print("✓ Chat completion successful!")
        print(f"Response: {response.choices[0].message.content}")
        print(f"Tokens used: {response.usage.total_tokens}")
        print()
        
    except openai.error.AuthenticationError as e:
        print("❌ Authentication failed!")
        print(f"Error: {str(e)}")
        print("\nPlease check your API key at: https://agentrouter.org/console/token")
        return
    except openai.error.APIError as e:
        print("❌ API Error!")
        print(f"Error: {str(e)}")
        return
    except Exception as e:
        print("❌ Unexpected error!")
        print(f"Error type: {type(e).__name__}")
        print(f"Error: {str(e)}")
        return
    
    # Test 2: Resume analysis (similar to your actual use case)
    print("-" * 60)
    print("Test 2: Resume Analysis Simulation")
    print("-" * 60)
    try:
        prompt = """Analyze this resume and provide 3 specific suggestions.

Resume Text:
Software Engineer with 5 years experience in Python and JavaScript.
Worked on web applications. Led team projects.

Extracted Keywords:
Python, JavaScript, web applications, team leadership

Current Scores:
- Overall Score: 65/100
- ATS Score: 58/100

Provide suggestions in this EXACT format:

CATEGORY: [Content/Formatting/Keywords/Skills/Experience]
PRIORITY: [high/medium/low]
ISSUE: [Brief description of the problem]
SUGGESTION: [Specific action to take]
EXAMPLE: [Concrete example]

(blank line between suggestions)
"""
        
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert ATS resume consultant. Provide specific, actionable suggestions."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        print("✓ Resume analysis successful!")
        print("\nAI Generated Suggestions:")
        print("-" * 60)
        print(response.choices[0].message.content)
        print("-" * 60)
        print(f"\nTokens used: {response.usage.total_tokens}")
        print()
        
    except Exception as e:
        print("❌ Resume analysis failed!")
        print(f"Error: {str(e)}")
        return
    
    # Summary
    print("=" * 60)
    print("✓ All tests passed successfully!")
    print("=" * 60)
    print("\nYour .env file should have:")
    print("AI_PROVIDER=agentrouter")
    print(f"AGENTROUTER_API_KEY={api_key[:10]}...{api_key[-4:]}")
    print("\nOr:")
    print("AI_PROVIDER=agentrouter")
    print(f"AGENT_ROUTER_TOKEN={api_key[:10]}...{api_key[-4:]}")
    print("\nYour AIService is now ready to use AgentRouter!")
    print()


if __name__ == "__main__":
    test_agentrouter()