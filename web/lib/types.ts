// Response types for the MIA Wealth backend, mirrored from CONTRACT.md and
// shared/supabase/schema.sql. Where CONTRACT.md left a shape ambiguous, the
// field is marked optional and a comment explains the assumption made.

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export type AccountSource = "idbi" | "aa";

export type AccountType =
  | "savings"
  | "current"
  | "fixed_deposit"
  | "mutual_fund"
  | "equity"
  | "insurance"
  | "credit_card"
  | "loan";

export type AssetClass =
  | "equity"
  | "debt"
  | "hybrid"
  | "gold"
  | "real_estate"
  | "cash"
  | "insurance";

export type GoalPriority = "low" | "medium" | "high";

export type SuitabilityTag = "suitable" | "needs_review" | "not_suitable";

export type RecommendationType =
  | "invest"
  | "rebalance"
  | "protect"
  | "save"
  | "alert"
  | "opportunity";

export interface Customer {
  id: string;
  name: string;
  dob?: string | null;
  risk_profile: RiskProfile;
  monthly_income_est?: number | null;
  created_at?: string;
}

export interface Account {
  id: string;
  customer_id: string;
  institution: string;
  source: AccountSource;
  type: AccountType;
  balance: number;
  currency: string;
  created_at?: string;
}

export interface Holding {
  id: string;
  customer_id: string;
  account_id?: string | null;
  asset_class: AssetClass;
  name: string;
  units?: number | null;
  value: number;
  as_of: string;
}

export interface Goal {
  id: string;
  customer_id?: string;
  name: string;
  target_amount: number;
  target_date: string;
  priority: GoalPriority;
  funded_amount: number;
  created_at?: string;
}

export interface DefaultCustomerResponse {
  customer_id: string;
}

// GET /customers/{id}/twin
export interface TwinResponse {
  customer: Customer;
  net_worth: number;
  cash: number;
  investable_holdings_value: number;
  protection_cover: number;
  accounts: Account[];
  holdings: Holding[];
  goals: Goal[];
}

// GET /customers/{id}/goals
export interface GoalsResponse {
  goals: Goal[];
}

// Shared "engine response envelope" shape (PLAN.md section 6):
// { value, inputs_used, assumptions, confidence }
export interface EngineEnvelope<T> {
  value: T;
  inputs_used?: string[];
  assumptions?: string[];
  confidence?: number;
}

export interface ScenarioValue {
  goal: string;
  target_amount: number;
  funded_amount: number;
  months_remaining: number;
  prob_before: number;
  prob_after: number;
  months_to_80pct_before: number;
  months_to_80pct_after: number;
  timeline_shift_months: number;
  [key: string]: unknown;
}

// GET /customers/{id}/scenario
export type ScenarioResponse = EngineEnvelope<ScenarioValue>;

// Structured rationale — the explainability "moat" (CONTRACT.md, PLAN.md section 11).
// Every recommendation/answer is supposed to carry inputs / assumptions / reasoning /
// risk_disclosure. CONTRACT.md's documented /recommendations envelope shape does not
// spell out a per-item `rationale` field (only product_name/type/risk_level/cadence/
// amount/expected_return/reason/suitability_tag), but the `recommendations` table
// (schema.sql) *does* have a `rationale jsonb` column, and the explainability
// requirement is unambiguous that this must be shown per-item. We treat `rationale`
// as optional-but-expected on each Recommendation, and the UI (see WhyPanel) falls
// back to the envelope-level inputs_used/assumptions/confidence + the item's own
// `reason` string when a per-item rationale isn't present, so nothing ever breaks.
export interface Rationale {
  inputs?: string[];
  assumptions?: string[];
  reasoning?: string;
  risk_disclosure?: string;
  [key: string]: unknown;
}

export interface Recommendation {
  id?: string;
  product_name: string;
  type: RecommendationType | string;
  risk_level: "low" | "moderate" | "high" | string;
  cadence?: string | null;
  amount: number;
  expected_return?: number | null;
  reason: string;
  suitability_tag: SuitabilityTag;
  rationale?: Rationale;
}

export interface RecommendationsValue {
  recommendations: Recommendation[];
  risk_profile: RiskProfile;
  surplus_used: number;
}

// GET /customers/{id}/recommendations
export type RecommendationsResponse = EngineEnvelope<RecommendationsValue>;

export interface AuditLog {
  id: string;
  actor: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  pii_accessed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// GET /audit-logs
export interface AuditLogsResponse {
  logs: AuditLog[];
}

// POST /aa/consent
export interface ConsentArtefact {
  consentHandle: string;
  status: string;
  fip_list: string[];
  scope: string;
  purpose: string;
  consentExpiry: string;
  createdAt: string;
}

// GET /aa/fetch/{customer_id}
export interface AAFetchResponse {
  customer_id: string;
  fetchedAt: string;
  FI: unknown[];
}

export interface AdvisorTurnCard {
  type: string;
  data: Record<string, unknown>;
}

// POST /advisor-turn
export interface AdvisorTurnResponse {
  reply: string;
  cards: AdvisorTurnCard[];
  rationale: Rationale;
  suitability_tag: SuitabilityTag;
  audit_id: string;
}

// window.postMessage payload emitted by avatar/index.html after every turn
export interface MiaAdvisorTurnMessage {
  type: "mia-advisor-turn";
  payload: AdvisorTurnResponse;
}
