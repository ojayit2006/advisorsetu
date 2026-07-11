# MIA Wealth — Customer App (Expo)

Customer-facing mobile app for MIA Wealth (IDBI Bank hackathon): AA consent onboarding,
a Financial Twin dashboard, the MIA avatar (voice + chat), a live what-if "Simulate"
screen, and a first-class explainability panel behind every recommendation.

Built with Expo SDK 54 / React Native 0.81 / React 19, matching the sibling
`kumbhsaathi-mobile` reference project's toolchain (same Expo/RN/React versions,
`expo-constants`, `@react-native-async-storage/async-storage`). Navigation
(`@react-navigation`) and `react-native-webview` / `@react-native-community/slider`
are added fresh — the reference project didn't need them.

## Screens

1. **Onboarding** — explains AA data-sharing consent, calls `GET /customers/default`
   then `POST /aa/consent`, and shows the returned consent artefact.
2. **Home (Twin)** — net worth, cash/investments/protection snapshot, goal progress,
   the "You can invest ₹X this month" callout, and a recommendation list split into
   a Monthly Plan and Nudges & Opportunities.
3. **MIA** — the avatar embedded via `react-native-webview`, plus a text-chat
   fallback, rendering the structured turn payload (cards, rationale,
   suitability_tag) below the video.
4. **Simulate** — sliders for `extra_monthly_contribution` / `one_time_delta`,
   calling the scenario endpoint live (debounced) and showing before/after goal
   probability.
5. **Recommendation detail** — the explainability panel: suitability badge, inputs,
   assumptions, reasoning, risk disclosure.

## Setup

```bash
cd app
npm install
copy .env.example .env
```

### Point the app at your backend

The backend base URL is read in **one place**, `src/api.js`, in this priority order:

1. `EXPO_PUBLIC_API_BASE_URL` (from `.env`, loaded automatically by Expo — no extra
   config needed, just restart `expo start` after editing `.env`)
2. `app.json` → `expo.extra.apiBaseUrl` (fallback / default committed to the repo)
3. `http://localhost:8000` (last-resort fallback)

Edit whichever you prefer:

```env
# .env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.23:8000
```

```json
// app.json
{ "expo": { "extra": { "apiBaseUrl": "http://192.168.1.23:8000" } } }
```

**This matters most on a physical phone.** `localhost` on a phone means the phone
itself, not your laptop running the FastAPI backend — Expo Go on a phone can't reach
it. Find your computer's LAN IP (Windows: `ipconfig`, look for "IPv4 Address" under
your Wi-Fi adapter, e.g. `192.168.1.23`) and use `http://<that-ip>:8000`. Make sure
the phone and laptop are on the same Wi-Fi network, and that the backend is running
with `--host 0.0.0.0` (or FastAPI/uvicorn's default bind, whichever the backend
README specifies) so it accepts LAN connections, not just `127.0.0.1`.

If running on an emulator/simulator on the same machine as the backend, `localhost`
(iOS simulator) works fine; Android emulators need `http://10.0.2.2:8000` instead of
`localhost` — set that as `EXPO_PUBLIC_API_BASE_URL` if you're using an Android
emulator rather than a physical device or Expo web.

## Run

```bash
npx expo start
```

Then either:

- **Expo Go (recommended for judges)** — scan the QR code with the Expo Go app on a
  physical phone. Fastest path, no native build required. The MIA avatar screen
  needs microphone permission — grant it when prompted; if the WebView's mic/voice
  doesn't come up on venue Wi-Fi, use the text box under the avatar to talk to MIA
  via `/advisor-turn` directly (same structured response, no voice).
- **Dev build / simulator** — `npx expo start --ios` or `--android` if you have a
  simulator/emulator set up locally.

Static checks (no Metro/dev server boot):

```bash
npx expo-doctor
```

## Design system

All colors, border widths, hard-shadow offsets, spacing and type scales live in
`src/theme.js` — no screen hardcodes a hex value or border width. The look is
neo-brutalist: thick black borders, flat offset "shadows" (a solid black block
behind each panel, no blur), bold blocky headings, IDBI-adjacent palette (deep
maroon primary, cream background, amber/gold accents).

## Known gaps / assumptions vs. CONTRACT.md

- **No dedicated nudges/behaviour endpoint.** CONTRACT.md exposes `surplus`,
  `behaviour` and `life_event` engine output only as `cards` inside
  `POST /advisor-turn`'s response — there's no `GET /customers/{id}/behaviour` or
  `/life-events` REST endpoint. Home screen nudges are therefore derived from
  `GET /customers/{id}/recommendations`: items with `cadence: "lumpsum"` come from
  the life-event engine (idle cash / wedding signals) and are shown under "Nudges &
  Opportunities", while `cadence: "monthly"` items (from the surplus engine) are
  shown under "Your monthly investment plan". This is a real distinction already
  present in the data (see `backend/engines/suitability.py`), not fabricated data —
  but it means the Home screen won't show a spend-creep nudge unless/until a
  behaviour-engine REST endpoint exists; today spend-creep nudges only surface
  inside a MIA conversation (`cards: [{type: "behaviour", ...}]`).
- **Per-recommendation rationale is reconstructed for the Home screen's cards.**
  `GET /customers/{id}/recommendations` items only carry `reason` (string) and
  `suitability_tag` — no per-item `rationale.inputs/assumptions/risk_disclosure`
  object (that shape is only produced by the explain engine inside
  `POST /advisor-turn`). The Recommendation Detail screen reconstructs a rationale
  for these cards from the shared response envelope's `inputs_used` / `assumptions`
  plus the item's own `reason`, and shows the same static risk-disclosure copy the
  backend's `explain.py` uses. When you open "Why?" from a MIA conversation instead,
  you get the real, live `rationale` + `audit_id` from the explain engine — the
  detail screen is written to accept either shape (see the comment block at the top
  of `src/screens/RecommendationDetailScreen.js`).
- **WebView ↔ avatar bridging.** `avatar/index.html` posts turns via
  `window.parent?.postMessage(...)`, which assumes an iframe host. Inside a React
  Native WebView there's no real parent frame (`window.parent === window`), so that
  call doesn't reach RN's `onMessage` on its own. `MiaScreen.js` injects a small shim
  (`injectedJavaScriptBeforeContentLoaded`) that listens for the resulting `message`
  event on `window` and re-emits it through `window.ReactNativeWebView.postMessage`,
  without modifying `avatar/index.html`.
- Goal/customer field names, `/scenario` and `/recommendations` response shapes, and
  the `explain` engine's rationale shape were all confirmed by reading
  `backend/main.py` and `backend/engines/*.py` directly (not just CONTRACT.md's
  summary), since a couple of fields (e.g. `months_to_80pct_before/after`,
  `risk_disclosure`, exact goal fields) needed the extra precision to render
  correctly.

## Project structure

```
app/
├─ App.js                     — providers + navigation root
├─ app.json / .env.example    — Expo config + backend URL
├─ src/
│  ├─ api.js                  — single backend API helper (BASE_URL resolved once)
│  ├─ theme.js                — colors, spacing, type scale, shadow/border constants
│  ├─ context/AppContext.js   — customerId + consent, persisted to AsyncStorage
│  ├─ components/             — Panel, Button, SuitabilityBadge, ProgressBar, etc.
│  ├─ navigation/              — RootNavigator (stack) + MainTabs (bottom tabs)
│  └─ screens/                — Onboarding, TwinHome, Mia, Simulate, RecommendationDetail
```
