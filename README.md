# MIA Wealth

Avatar-based AI wealth advisor powered by the **Financial Twin** — a continuously-updated, explainable model of a customer's complete financial life.

## Architecture

```
CUSTOMER APP (Expo)   ──┐
RM CONSOLE (Next.js)  ──┼── API ──▶ FastAPI Backend
       │ embeds         │
  MIA AVATAR (Tavus PAL)
       │ transcript
       ▼
  FastAPI ── /advisor-turn ──▶ ORCHESTRATOR (LLM + tools)
                                  ├─ Unification / Financial Twin
                                  ├─ Surplus · Scenario Simulation
                                  ├─ Behaviour · Life-Event Detection
                                  ├─ Suitability / Recommendations
                                  └─ Explainability / Compliance ──▶ Audit Log
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 + TypeScript + Tailwind CSS |
| **Backend** | FastAPI + Python 3.11 |
| **LLM** | Google Gemini 2.0 Flash |
| **Data** | Realistic mock financial data ||

## Project Structure

```
mia-wealth/
├─ backend/        FastAPI — 7 engines, LLM orchestrator, avatar endpoints
├─ web/            Next.js RM console — Customer 360, Recommendations, Audit, Co-pilot
├─ app/            Expo customer mobile app — Twin Home, MIA, Simulate, Goals
├─ avatar/         MIA avatar page 
└─ shared/         Schema + seed data for Supabase
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Configure LLM API key
uvicorn main:app --reload --port 8001
```

Verify:

```bash
curl http://localhost:8001/customers/default
curl -X POST http://localhost:8001/advisor-turn \
  -H "Content-Type: application/json" \
  -d '{"message": "How much can I invest this month?"}'
```

### Web Console

```bash
cd web
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
npm run dev
```

Open **http://localhost:3000**

### MIA Avatar

The avatar loads directly in the RM Co-pilot page. Click **Start conversation** to begin voice interaction.

## Features

### 7 Financial Engines

| Engine | What It Does |
|---|---|
| **Unification** | Aggregates accounts, holdings, transactions into one Financial Twin |
| **Surplus** | Calculates monthly investable surplus (income - outflows - safety buffer) |
| **Scenario Simulation** | Monte Carlo goal-probability with live what-if adjustments |
| **Behaviour Detection** | Flags spend creep and panic-selling patterns |
| **Life-Event Detection** | Identifies wedding signals, idle cash, and life-stage triggers |
| **Suitability** | Risk-matched product recommendations from catalog |
| **Explainability** | Structured rationale + suitability tag + immutable audit trail |

### RM Console Screens

- **Customer 360** — Financial Twin: net worth, cash, holdings, goals, asset allocation
- **Simulate** — Live what-if scenario planner with Monte Carlo probability
- **Recommendations** — Suitability-matched product feed with realtime updates
- **Audit & Compliance** — Every decision logged with actor, action, and PII tracking
- **Co-pilot** — MIA avatar panel + text fallback + live rationale display

### Explainability Layer

Every recommendation carries:
- **Suitability tag** — `suitable` / `needs_review` / `not_suitable`
- **Structured rationale** — inputs → assumptions → reasoning → risk disclosure
- **Audit log entry** — immutable record with actor, action, and metadata

## Deployment

- **Frontend:** Deploy `web/` on Vercel (`NEXT_PUBLIC_BACKEND_URL` → backend URL)
- **Backend:** Deploy `backend/` on Render (Python, `uvicorn main:app`)
- **Avatar:** Tavus PAL deployment configured via Tavus dashboard

Detailed API contract in [`CONTRACT.md`](CONTRACT.md). Architecture plan in [`PLAN.md`](PLAN.md).
