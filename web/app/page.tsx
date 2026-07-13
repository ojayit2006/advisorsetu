import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="font-display font-bold text-xl tracking-tight">
          MIA <span className="text-maroon">Wealth</span>
        </div>
        <Link href="/customer" className="neo-btn neo-btn-primary px-5 py-2 text-sm">
          Enter RM Console →
        </Link>
      </header>

      <section className="px-6 md:px-10 py-16 md:py-24 max-w-5xl">
        <div className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-6">
          MIA Wealth · Built for IDBI Bank
        </div>
        <h1 className="font-display font-black text-5xl md:text-7xl leading-[0.95] tracking-tight max-w-3xl">
          An AI advisor that shows its work.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-ink/70 max-w-2xl">
          MIA is a talking, listening wealth avatar backed by the <strong>Financial Twin</strong> — a
          living, consent-fed model of a customer&apos;s whole financial life across every bank and
          AA-linked account. It doesn&apos;t just recommend. It explains, tags suitability, and logs every
          decision for the regulator.
        </p>
        <div className="mt-8 flex gap-4 flex-wrap">
          <Link href="/customer" className="neo-btn neo-btn-primary px-6 py-3">
            See the Financial Twin
          </Link>
          <Link href="/copilot" className="neo-btn neo-btn-accent px-6 py-3">
            Talk to MIA
          </Link>
        </div>
      </section>

      <section className="px-6 md:px-10 py-12 grid md:grid-cols-2 gap-6 max-w-5xl">
        <div className="neo-card p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-maroon mb-2">What it is</div>
          <h2 className="font-display font-bold text-2xl mb-3">Avatar + Financial Twin</h2>
          <p className="text-sm text-ink/70">
            A voice-and-video avatar (Azure) fronts a FastAPI orchestrator that unifies accounts,
            holdings, goals and behaviour into one Twin, then reasons over it with an engine stack:
            surplus, scenario simulation, behaviour, life-events, suitability — one brain, three surfaces
            (customer app, this console, the avatar).
          </p>
        </div>
        <div className="neo-card p-6" style={{ borderTop: "3px solid var(--color-maroon)" }}>
          <div className="text-xs font-bold uppercase tracking-widest text-maroon mb-2">The moat</div>
          <h2 className="font-display font-bold text-2xl mb-3">Explainability &amp; compliance, by default</h2>
          <p className="text-sm text-ink/70">
            Every recommendation and every MIA answer carries a visible <strong>suitability tag</strong>{" "}
            (suitable / needs review / not suitable) and a structured rationale — inputs, assumptions,
            reasoning, risk disclosure — written to an immutable audit log. Not a settings toggle: the
            default.
          </p>
        </div>
      </section>

      <section className="px-6 md:px-10 py-12 max-w-5xl">
        <div className="text-xs font-bold uppercase tracking-widest text-maroon mb-4">
          Architecture · one brain, reused everywhere
        </div>
        <div className="neo-card-cream p-6 font-mono text-[11px] md:text-sm overflow-x-auto">
          <pre className="whitespace-pre">{`CUSTOMER APP (Expo)   ──┐
BANK CONSOLE (Next.js) ──┼──HTTPS/Realtime──▶ SUPABASE (Postgres + Realtime)
        │  embeds         │
   MIA AVATAR (Azure WebRTC + STT)
        │  transcript
        ▼
   FastAPI  ── /advisor-turn ──▶  ORCHESTRATOR (LLM + tools)
                                     ├─ Unification / Twin
                                     ├─ Surplus · Scenario Sim
                                     ├─ Behaviour · Life-Event
                                     ├─ Suitability / Recommend
                                     └─ Explainability / Compliance ──▶ audit_logs`}</pre>
        </div>
      </section>

      <section className="px-6 md:px-10 py-16 max-w-5xl">
        <div
          className="neo-card p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          style={{ background: "var(--color-ink)", color: "var(--color-cream)" }}
        >
          <div>
            <h2 className="font-display font-bold text-2xl">See it on one customer, live.</h2>
            <p className="text-sm text-cream/70 mt-1">
              Customer 360 · Recommendation feed · Audit trail · RM co-pilot — all synced in real time.
            </p>
          </div>
          <Link href="/customer" className="neo-btn neo-btn-accent px-6 py-3 whitespace-nowrap">
            Open the console →
          </Link>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-6 border-t border-line text-xs text-ink/50 mt-auto">
        MIA Wealth — built for the IDBI Bank hackathon. Distributor + educational framing; not investment
        advice.
      </footer>
    </div>
  );
}
