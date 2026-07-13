# MIA Wealth — Bank / RM Web Console

Next.js (App Router, Tailwind v4, TypeScript) console for the MIA Wealth hackathon demo. Talks to the
FastAPI backend documented in `../CONTRACT.md`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in as needed:

| Var | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | No (defaults to `http://localhost:8000`) | FastAPI backend origin — also used as the MIA avatar iframe `src` on `/copilot`. |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Enables live Postgres Realtime on the Recommendations and Audit pages. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Same as above. |

If the Supabase vars are left blank, the Recommendations and Audit pages automatically fall back to
polling the REST endpoints every 5 seconds — the app never crashes without Supabase configured.

## Screens

- `/` — landing / judge pitch.
- `/customer` — Customer 360 (Financial Twin: net worth, cash, holdings, protection cover, accounts, goals).
- `/recommendations` — realtime-or-polled recommendation feed with suitability tags + "Why?" rationale.
- `/audit` — audit & compliance trail (the explainability "moat").
- `/copilot` — MIA avatar iframe + live rationale/suitability panel driven by `postMessage` events, plus a
  text-chat fallback that calls `/advisor-turn` directly.

## Structure

- `lib/api.ts` — single fetch helper wrapping every backend endpoint from `CONTRACT.md`. Reads
  `NEXT_PUBLIC_BACKEND_URL` here only — never hardcode the backend origin elsewhere.
- `lib/types.ts` — TypeScript types for every response shape in `CONTRACT.md`.
- `lib/supabase.ts` — Supabase client, `null` and non-throwing if env vars are absent.
- `lib/mappers.ts` — normalizes raw `recommendations` table rows (Realtime payloads) into the same
  display shape the REST envelope uses.
- `components/` — shared UI: `SuitabilityPill`, `WhyPanel` (the explainability affordance), stat/goal/
  recommendation/audit cards, `Sidebar`.
