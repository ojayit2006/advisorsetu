import os

from dotenv import load_dotenv

load_dotenv()

SPEECH_KEY = os.getenv("SPEECH_KEY", "")
SPEECH_REGION = os.getenv("SPEECH_REGION", "eastus2")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Fallback orchestrator LLM if Gemini errors (quota, outage, etc.) — OpenAI-compatible, no extra SDK needed.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# NVIDIA AI API (OpenAI-compatible)
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_KEY = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY

MOCK_MODE = os.getenv("MOCK_MODE", "").lower() in ("1", "true", "yes") or not (SUPABASE_URL and SUPABASE_KEY)

TAVUS_API_KEY = os.getenv("TAVUS_API_KEY", "")
TAVUS_REPLICA_ID = os.getenv("TAVUS_REPLICA_ID", "")
TAVUS_API_BASE = "https://tavusapi.com/v2"
TAVUS_WEBHOOK_BASE_URL = os.getenv("TAVUS_WEBHOOK_BASE_URL", "").rstrip("/") or "http://localhost:8000"

DEMO_ACTOR = os.getenv("DEMO_ACTOR", "mia-wealth-app")
