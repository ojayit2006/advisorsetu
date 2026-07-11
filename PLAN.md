# MIA Wealth — End-to-End Build Plan (IDBI Bank Hackathon)

**Product:** MIA (avatar interface) powered by the **Financial Twin** — a living, consent-fed,
forward-looking model of the customer's whole financial life, delivered as a **customer mobile app**
+ a **bank/RM web console**, on one FastAPI + Supabase backend.

**Assumptions:** 24-hour hackathon · team of ~3 (Saaheer = backend/integration, Ojayit = frontend/web,
Prem = pitch/QA) · build on the existing `kumbh-saathi-final` repo (MIA avatar + FastAPI + Supabase +
audit spine reused).

---

## 0. What we are building (3 surfaces + 1 brain)

| Surface | What it is | Built from |
|---|---|---|
| **The App** (customer) | MIA avatar advisory, Twin dashboard, voice + chat, live what-if simulations, proactive nudges | Expo RN (reuse `kumbhsaathi-mobile`) + MIA via WebView |
| **The Website** (bank/RM) | Customer 360, recommendation feed, audit/compliance trail, RM co-pilot | Next.js (reuse `kumbhsaathi-command-center`) |
| **MIA** | Azure Avatar (WebRTC) + Azure STT voice loop | Reuse `kumbhsaathi-ipad/index.html` + `/stt-ws` |
| **The Brain** | FastAPI backend: orchestrator + 7 engines + Financial Twin | Reuse `kumbhsaathi-ipad/main.py`, swap domain |

## 1. Scope control (24h)

- **IN:** AA data unification into Twin · Investable Surplus · Scenario Simulation (goal probability) ·
  Suitability/Recommendation · Explainability + compliance tag + audit log · MIA speaking it all ·
  one polished demo customer synced live across app + console.
- **PARTIAL:** Behaviour + Life-Event/Opportunity engines (rule-based over seeded transactions).
- **OUT (roadmap):** live Account Aggregator (use realistic mock w/ real FI schema) · agentic execution ·
  household Twin · production auth/security.

## 2. Architecture & stack

```
CUSTOMER APP (Expo)  -+
BANK CONSOLE (Next.js)-+--HTTPS/Realtime--> SUPABASE (Postgres + Realtime + pgvector)
       | embeds        |
   MIA AVATAR (Azure WebRTC + STT)
       | transcript
       v
  FastAPI  -- /advisor-turn -->  ORCHESTRATOR (LLM + tools + RAG)
                                    +- Engine: Unification/KG
                                    +- Engine: Surplus
                                    +- Engine: Scenario Sim
                                    +- Engine: Behaviour
                                    +- Engine: Life-Event/Opportunity
                                    +- Engine: Suitability/Reco
                                    +- Engine: Explainability/Compliance --> audit_logs
  DATA PLANE: Account Aggregator MOCK (real FI-schema JSON) + IDBI core feed
```

Committed choices:
- Backend: FastAPI (Python) — reused.
- DB/Realtime/Vector: Supabase (Postgres + Realtime + pgvector) — reused.
- Reasoning LLM: Claude (Sonnet) tool-calling for orchestrator + engine reasoning; OpenAI wiring as fallback.
- Avatar/Voice: Azure Avatar + Azure STT — reused.
- App: Expo RN; MIA embedded via react-native-webview.
- Website: Next.js (App Router) on Vercel.
- Charts: Recharts. Forecasting: numpy/pandas (recurring detection + Monte Carlo goal probability).
- Hosting: Vercel (web) · Render/Railway (FastAPI) · Supabase cloud · Azure (avatar).
- Design: neo-brutalist, IDBI-adjacent palette.

## 3. Repo structure

```
mia-wealth/
├─ backend/                 # FastAPI (from ipad/main.py)
│  ├─ main.py               # /advisor-turn, /stt-ws (reuse), /ice-token (reuse)
│  ├─ orchestrator.py       # LLM tool-calling loop
│  ├─ engines/  unification.py surplus.py scenario.py behaviour.py life_event.py suitability.py explain.py
│  ├─ aa_mock/              # Account Aggregator mock responses (FI schema JSON)
│  ├─ rag/                  # product_catalog + reg_rules embeddings
│  └─ prompts/system_advisor.md
├─ web/                     # Next.js bank/RM console (from command-center)
├─ app/                     # Expo customer app (from kumbhsaathi-mobile)
├─ avatar/                  # MIA page (from ipad/index.html)
├─ shared/supabase/         # schema.sql + seed.py
└─ PLAN.md
```

## 4. Data model (Supabase)

```sql
customers(id, name, dob, risk_profile, monthly_income_est, created_at)
accounts(id, customer_id, institution, source['idbi'|'aa'], type, balance, currency)
holdings(id, customer_id, account_id, asset_class, name, units, value, as_of)
transactions(id, customer_id, account_id, ts, amount, direction, category, merchant, is_recurring)
goals(id, customer_id, name, target_amount, target_date, priority, funded_amount)
recommendations(id, customer_id, type, title, body, action_payload jsonb,
                suitability_tag, rationale jsonb, status, created_at)   -- was live_cases
twin_snapshots(id, customer_id, as_of, net_worth, investable_surplus, health_score,
               cashflow_forecast jsonb, goal_probabilities jsonb)
consents(id, customer_id, aa_handle, fip_list jsonb, scope, status, expiry)
product_catalog(id, name, type, risk_level, min_amount, expected_return, doc_ref, embedding vector)
audit_logs(...)   -- REUSE create_audit_log RPC
```

Seed: one flagship customer "Rahul Verma" — 4 institutions, ~120 realistic transactions (salary, rent,
EMI, SIP, dining creep, jewellery purchase, ₹2.1L idle savings), 2 goals (home 2028, car 2027).
Deterministic numbers so the demo hits exact figures every run.

## 5. Account Aggregator mock
`aa_mock/` returns real AA FI-schema JSON (Deposit, Mutual Funds, Equities, Insurance per ReBIT) behind
`POST /aa/fetch`, gated by a fake consent handshake `POST /aa/consent`. Unification treats mock and live
identically (swap later). Lets us show a real consent artefact + FIP list without live AA in 24h.

## 6. The 7 engines (MVP depth)

| Engine | MVP logic | Returns |
|---|---|---|
| Unification/KG | Load AA mock + IDFC feed -> normalize -> net worth | Twin state, net worth |
| Surplus | avg income - recurring outflows - safety buffer | {surplus, breakdown[]} |
| Scenario Sim | Monte Carlo goal probability + what-if deltas | {goal, prob_before, prob_after, timeline_shift} |
| Behaviour | category spend vs trailing avg -> creep %; panic proxy | {nudges[]} |
| Life-Event/Opportunity | merchant-signal rules + idle-cash rule | {triggers[]} |
| Suitability/Reco | surplus + risk_profile -> filter catalog -> rank by impact | {recommendations[]} |
| Explainability/Compliance | wrap rec: inputs->assumptions->reasoning->risk + suitability tag; audit | {rationale, suitability_tag, audit_id} |

Engine response envelope: `{ "value": {...}, "inputs_used": [...], "assumptions": [...], "confidence": 0.0 }`

## 7. The advisor turn (orchestrator)
`POST /advisor-turn {customer_id, message}`:
1. Load Twin snapshot (pre-computed).
2. Claude with tool defs = engines + RAG over product_catalog/reg_rules.
3. Model plans -> calls engines -> composes explained answer.
4. Persist recommendation + write audit log.
5. Return `{reply, cards[], rationale, suitability_tag, audit_id}`.
6. MIA speaks reply; app renders cards + explainability panel.

System prompt enforces advice/education boundary (distributor + educational, suitability-matched, never "guaranteed").

## 8. MIA integration
Reuse avatar + `/stt-ws` verbatim. Change only: transcript -> `/advisor-turn`; retitle; embed page in
Expo (WebView) and web console (panel).

## 9. Customer app screens (Expo)
1. Onboarding / AA consent. 2. Twin Home (net worth, health, "invest Rs X this month", nudges).
3. MIA (avatar + voice + chat). 4. Simulate (what-if sliders -> live goal-probability chart).
5. Recommendation detail (Why? explainability panel + compliance tag).

## 10. Web console screens (Next.js)
1. Customer 360 (Twin visualized). 2. Recommendation feed (realtime). 3. Audit & Compliance.
4. RM co-pilot (light). 5. Landing (one-screen judge pitch).

## 11. Explainability & compliance layer
Every recommendation carries structured rationale + suitability_tag, written to audit_logs, surfaced as a
glowing tag in app + console. This is the moat — demo it explicitly.

## 12. Hour-by-hour timeline (24h)

| Block | Backend (Saaheer) | Frontend (Ojayit) | Pitch/QA (Prem) |
|---|---|---|---|
| H0-2 Setup | Supabase project, schema.sql, env, keys | Scaffold web+app, Supabase client, MIA standalone | Narrative + IDBI/SEBI/AA facts |
| H2-6 Data+MIA | AA mock + Unification + seed.py (Rahul) | Twin Home + Customer 360; MIA embedded | Demo script v1 + exact numbers |
| H6-12 Core engines | Surplus + Scenario + Suitability + /advisor-turn | Simulate screen + charts; MIA->advisor-turn | Seed clean demo figures; test |
| H12-16 Intelligence+trust | Behaviour + Life-Event; Explainability + audit | Nudge cards; Why? panel + tag; console feed (realtime) | Deck; rehearse beats 1-3 |
| H16-20 Integrate+polish | End-to-end on Rahul; mock-mode flag | UI polish; app<->console realtime sync | Full run-through, time to 5 min |
| H20-22 Harden | Deploy backend; cache Twin snapshot | Deploy web (Vercel) + app build | Rehearse x3 |
| H22-24 Buffer | Freeze; demo-path bugs only | Record backup demo video | Final deck + Q&A prep |

## 13. Demo (5 min) — one customer, one brain
0:00 AA consent -> "complete picture" · 1:00 "How much can I invest?" -> Rs 18,200 + Why · 2:00 "What if
I buy a Rs 15L car?" -> home goal 71%->52% live · 2:45 idle-cash + wedding nudge · 3:30 dining-creep
behaviour nudge · 4:15 "Why trust this?" -> compliance tag + audit · 4:45 business case. Switch to web
console once to show RM feed + audit updating in realtime.

## 14. Risk register
| Risk | Mitigation |
|---|---|
| Live API flakiness | Mock-mode flag -> deterministic canned engine outputs |
| Avatar/WebRTC fails on venue Wi-Fi | Recorded backup video; text-chat fallback |
| LLM latency | Pre-compute Twin snapshot; stream reply; cache tool results |
| Scope creep | Scope lock; behaviour/life-event stay rule-based |
| "Is this SEBI-legal?" | Distributor + education framing in prompt + pitch |

## 15. Deliverables checklist
Working app build · deployed web console · deployed backend · seeded demo customer · MIA talking ·
explainability + audit visible · mock-mode + backup video · pitch deck · 60-sec narrative ·
architecture slide showing reuse.

## 16. Immediate next 3 steps
1. Confirm repo location + create `mia-wealth/` scaffold from the three reused projects.
2. Stand up Supabase schema.sql + seed.py for Rahul.
3. Convert `booth-intake` -> `advisor-turn` with the Surplus engine as the first working tool.
