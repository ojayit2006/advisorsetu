import type { Recommendation, Rationale, SuitabilityTag } from "./types";

// Raw row shape of the `recommendations` Postgres table (shared/supabase/schema.sql).
// This is *not* the same shape as the REST /customers/{id}/recommendations envelope
// documented in CONTRACT.md (which is display-ready: product_name, risk_level, cadence,
// amount, expected_return, reason). Supabase Realtime pushes raw table rows, so this
// mapper normalizes a DB row into the same display shape the REST envelope uses,
// reading display fields out of `action_payload` where available and falling back
// sensibly when they aren't. Adjust here if the backend's action_payload schema
// differs once it's pinned down.
export interface DbRecommendationRow {
  id: string;
  customer_id: string;
  type: string;
  title: string;
  body: string;
  action_payload?: Record<string, unknown> | null;
  suitability_tag: SuitabilityTag;
  rationale?: Rationale | null;
  status?: string;
  created_at: string;
}

export function mapDbRecommendation(row: DbRecommendationRow): Recommendation {
  const payload = row.action_payload ?? {};
  return {
    id: row.id,
    product_name: (payload.product_name as string) ?? row.title,
    type: row.type,
    risk_level: (payload.risk_level as string) ?? "—",
    cadence: (payload.cadence as string) ?? undefined,
    amount: (payload.amount as number) ?? 0,
    expected_return: (payload.expected_return as number) ?? undefined,
    reason: row.body,
    suitability_tag: row.suitability_tag,
    rationale: row.rationale ?? undefined,
  };
}
