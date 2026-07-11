# MIA Wealth — Backend API contract (for web/ and app/ builders)

Backend: FastAPI at `http://localhost:8000` in dev (see backend/README implied by .env.example).
Runs in **MOCK_MODE** by default (no Supabase needed) — serves the seeded "Rahul Verma" demo customer.

## Demo customer
`GET /customers/default` -> `{ "customer_id": "00000000-0000-0000-0000-000000000001" }`
Use this id everywhere below unless the user has a real Supabase-backed id.

## Endpoints

- `GET /customers/{customer_id}/twin` -> `{ customer, net_worth, cash, investable_holdings_value, protection_cover, accounts[], holdings[], goals[] }`
- `GET /customers/{customer_id}/goals` -> `{ goals: [{id, name, target_amount, target_date, priority, funded_amount}] }`
- `GET /customers/{customer_id}/scenario?goal_name=&extra_monthly_contribution=&one_time_delta=` -> engine envelope `{ value: { goal, target_amount, funded_amount, months_remaining, prob_before, prob_after, months_to_80pct_before, months_to_80pct_after, timeline_shift_months, ... }, inputs_used, assumptions, confidence }`
- `GET /customers/{customer_id}/recommendations` -> `{ value: { recommendations: [{product_name, type, risk_level, cadence, amount, expected_return, reason, suitability_tag}], risk_profile, surplus_used }, ... }`
- `GET /audit-logs?limit=50` -> `{ logs: [{id, actor, action, entity_type, entity_id, pii_accessed, metadata, created_at}] }` (realtime-ish: poll, or read directly from Supabase `audit_logs` table with Realtime if SUPABASE_URL/ANON_KEY are configured — see shared/supabase/schema.sql)
- `POST /aa/consent` body `{customer_id?, fip_list?}` -> AA consent artefact `{consentHandle, status, fip_list, scope, purpose, consentExpiry, createdAt}`
- `GET /aa/fetch/{customer_id}` -> ReBIT-style FI JSON `{customer_id, fetchedAt, FI: [...]}`
- `POST /advisor-turn` body `{customer_id?, message}` -> `{ reply, cards: [{type, data}], rationale, suitability_tag, audit_id }` — this is what MIA (the avatar) calls; also callable directly from a text-chat fallback.

## MIA avatar embed

`avatar/index.html` served at backend root `/` (also servable as a static file). Embed via iframe (web) or WebView (Expo) pointed at the backend origin. It handles its own mic + voice + avatar video and calls `/advisor-turn` internally. It also does:

```js
window.parent?.postMessage({ type: 'mia-advisor-turn', payload: data }, '*')
```

after every turn, where `payload` is the same shape as `/advisor-turn`'s response — listen for this `message` event in the host page/app to render `cards` / `rationale` / `suitability_tag` alongside the avatar without re-implementing STT/TTS.

## Data model (see shared/supabase/schema.sql for full DDL)

customers, accounts, holdings, transactions, goals, recommendations, twin_snapshots, consents, product_catalog, audit_logs.

## Design language

Neo-brutalist: thick black borders, hard drop shadows (no blur), bold flat colors, big blocky sans headings, no gradients/glassmorphism. IDBI-adjacent palette: deep maroon/red primary (#7A1B1B-ish), off-white/cream background, amber/gold accent for CTAs, near-black text. High contrast, confident, "bank you trust" rather than "startup fintech pastel."

## Explainability is the moat — surface it everywhere

Every recommendation/answer must show: the `suitability_tag` as a visible pill (green=suitable, amber=needs_review, red=not_suitable), and a "Why?" affordance that reveals `rationale.inputs`, `rationale.assumptions`, `rationale.reasoning`, `rationale.risk_disclosure`. This is explicitly called out as the demo's differentiator — don't bury it in a menu.
