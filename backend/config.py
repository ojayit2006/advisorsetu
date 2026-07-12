import os

from dotenv import load_dotenv

load_dotenv()

SPEECH_KEY = os.getenv("SPEECH_KEY", "")
SPEECH_REGION = os.getenv("SPEECH_REGION", "eastus2")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

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
