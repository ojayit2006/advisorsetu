# MIA Wealth — IDBI Bank Hackathon

Avatar-based AI wealth advisor. MIA (the avatar) is the interface; the **Financial Twin** — a
continuously-updated, explainable model of the customer's whole financial life — is the moat.
Full architecture/rationale in [`PLAN.md`](PLAN.md); backend API contract in [`CONTRACT.md`](CONTRACT.md).

```
web/      Next.js bank/RM console  (Customer 360, Recommendation feed, Audit, RM co-pilot, Landing)
app/      Expo customer app       (Onboarding/AA consent, Twin Home, MIA, Simulate, Rec detail)
avatar/   MIA avatar page         (Azure Avatar WebRTC + STT, reused verbatim from kumbhsaathi)
backend/  FastAPI brain           (7 engines, orchestrator, AA mock, avatar endpoints)
shared/supabase/  schema.sql + seed.py for the real Postgres/Supabase project
```

## Fastest path to a working demo: MOCK_MODE (no accounts needed)

The backend runs **without Supabase** by default — it serves a deterministic seeded customer
("Rahul Verma") straight out of `backend/aa_mock/fixtures.py`. This is the resilience path called
out in `PLAN.md`'s risk register ("Live API flakiness → mock-mode flag → deterministic canned
engine outputs") — it's not a fallback, it's the recommended way to run the demo.

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env
# fill in at minimum: GEMINI_API_KEY (for the orchestrator LLM; GROQ_API_KEY as an optional fallback)
#                      SPEECH_KEY + SPEECH_REGION (for the MIA avatar; leave blank to skip voice)
uvicorn main:app --reload --port 8000
```

Verify it's alive:

```bash
curl http://localhost:8000/customers/default
curl http://localhost:8000/customers/00000000-0000-0000-0000-000000000001/twin
curl -X POST http://localhost:8000/advisor-turn -H "Content-Type: application/json" \
     -d '{"message": "How much can I invest this month?"}'
```

Open `http://localhost:8000/` in a browser to see the MIA avatar directly (needs `SPEECH_KEY`/
`SPEECH_REGION` set to actually connect; without them it'll show a connection error but the
`/advisor-turn` text API still works standalone).

## Going to real Supabase (optional, for judges who want to see live persistence/realtime)

1. Create a Supabase project. Run `shared/supabase/schema.sql` in the SQL editor.
2. Fill `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in `backend/.env` (unsets `MOCK_MODE`
   automatically — the backend switches to real Supabase reads/writes).
3. Seed the demo customer: `cd shared/supabase && pip install requests python-dotenv && python seed.py`
   (or `python seed.py --dry-run` to preview without writing).
4. The web console's Recommendation feed and Audit page will pick up Postgres Realtime
   automatically if you also give them `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Web console

```bash
cd web
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
npm run dev
```

## Customer app (Expo)

```bash
cd app
npm install
npx expo start
```
Point the app's backend URL config at your machine's LAN IP (not `localhost`) if testing on a
physical device via Expo Go — see `app/README.md`.

## Demo script (5 min, one customer, one brain)

0:00 AA consent → "complete picture" · 1:00 "How much can I invest?" → surplus + Why · 2:00 "What
if I buy a car?" → home goal probability drops live · 2:45 idle-cash + wedding nudge · 3:30
dining-creep nudge · 4:15 "Why trust this?" → suitability tag + audit log · 4:45 business case.
Switch to the web console once to show the RM feed + audit trail updating in realtime.

## What's real vs. mocked

- **Real, computed live (not scripted):** Surplus, Monte Carlo goal-probability simulation,
  spend-creep detection, life-event/idle-cash rules, suitability filtering, and the full
  explainability/audit trail — all run against the seeded transaction history in
  `backend/aa_mock/fixtures.py`, not hardcoded numbers.
- **Mocked by design (documented, not hidden):** live Account Aggregator (real ReBIT-shaped JSON,
  fake consent handshake — see `backend/aa_mock/aa_service.py`); RAG over `product_catalog`/
  `reg_rules.md` is keyword-scored, not pgvector embeddings (same call signature, swappable later).
