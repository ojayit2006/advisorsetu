import os

from dotenv import load_dotenv

load_dotenv()

SPEECH_KEY = os.getenv("SPEECH_KEY", "")
SPEECH_REGION = os.getenv("SPEECH_REGION", "eastus2")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_KEY = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY

# MOCK_MODE=1 (default when Supabase isn't configured, or forced via env) serves the
# seeded Rahul Verma fixture from disk instead of hitting Supabase — keeps the demo
# alive on flaky venue Wi-Fi. See backend/aa_mock/fixtures.py.
MOCK_MODE = os.getenv("MOCK_MODE", "").lower() in ("1", "true", "yes") or not (SUPABASE_URL and SUPABASE_KEY)

DEMO_ACTOR = os.getenv("DEMO_ACTOR", "mia-wealth-app")
