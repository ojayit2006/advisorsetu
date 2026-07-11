// Single API helper module — every backend call in the app goes through here.
// Do NOT hardcode the backend URL anywhere else; change it via .env
// (EXPO_PUBLIC_API_BASE_URL) or app.json's extra.apiBaseUrl instead.
//
// See CONTRACT.md at the repo root for the full endpoint list/response shapes this
// file wraps. Response shapes below are quoted from that contract + the backend
// source read while building this app (backend/main.py, backend/engines/*.py).

import Constants from "expo-constants";

function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const fromExtra =
    Constants.expoConfig?.extra?.apiBaseUrl ||
    Constants.manifest2?.extra?.expoClient?.extra?.apiBaseUrl ||
    Constants.manifest?.extra?.apiBaseUrl;
  const url = fromEnv || fromExtra || "http://localhost:8000";
  return url.replace(/\/+$/, "");
}

export const BASE_URL = resolveBaseUrl();

// MIA avatar page — served at the backend origin root ("/"), a self-contained
// page (mic/voice/avatar video + its own /advisor-turn calls). Embed via WebView.
export const AVATAR_URL = `${BASE_URL}/`;

class ApiError extends Error {
  constructor(message, { status, path } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

async function request(path, { method = "GET", body, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let resp;
  try {
    resp = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new ApiError(`Request to ${path} timed out. Is the backend reachable at ${BASE_URL}?`, { path });
    }
    throw new ApiError(
      `Could not reach the backend at ${BASE_URL}${path}. If you're on a physical device, ` +
        `make sure EXPO_PUBLIC_API_BASE_URL / app.json "extra.apiBaseUrl" is your computer's LAN IP, not localhost.`,
      { path }
    );
  }
  clearTimeout(timer);

  const text = await resp.text();
  const data = text ? safeJsonParse(text) : null;

  if (!resp.ok) {
    const message = (data && (data.error || data.detail)) || `Request to ${path} failed (${resp.status})`;
    throw new ApiError(message, { status: resp.status, path });
  }
  return data;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

function toQueryString(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

export const api = {
  baseUrl: BASE_URL,
  avatarUrl: AVATAR_URL,

  /** -> { customer_id } — the seeded "Rahul Verma" demo customer. */
  getDefaultCustomer: () => request("/customers/default"),

  /** -> { customer, net_worth, cash, investable_holdings_value, protection_cover, accounts[], holdings[], goals[] } */
  getTwin: (customerId) => request(`/customers/${customerId}/twin`),

  /** -> { goals: [{id, name, target_amount, target_date, priority, funded_amount}] } */
  getGoals: (customerId) => request(`/customers/${customerId}/goals`),

  /**
   * -> engine envelope { value: { goal, target_amount, funded_amount, months_remaining,
   *    prob_before, prob_after, months_to_80pct_before, months_to_80pct_after,
   *    timeline_shift_months, extra_monthly_contribution, one_time_delta },
   *    inputs_used, assumptions, confidence }
   */
  getScenario: (customerId, { goalName, extraMonthlyContribution = 0, oneTimeDelta = 0 } = {}) =>
    request(
      `/customers/${customerId}/scenario?${toQueryString({
        goal_name: goalName,
        extra_monthly_contribution: extraMonthlyContribution,
        one_time_delta: oneTimeDelta,
      })}`
    ),

  /**
   * -> { value: { recommendations: [{product_name, type, risk_level, cadence, amount,
   *    expected_return, reason, suitability_tag}], risk_profile, surplus_used },
   *    inputs_used, assumptions, confidence }
   */
  getRecommendations: (customerId) => request(`/customers/${customerId}/recommendations`),

  /** -> { logs: [{id, actor, action, entity_type, entity_id, pii_accessed, metadata, created_at}] } */
  getAuditLogs: (limit = 50) => request(`/audit-logs?limit=${limit}`),

  /** body { customer_id?, fip_list? } -> { consentHandle, status, fip_list, scope, purpose, consentExpiry, createdAt } */
  postAaConsent: ({ customerId, fipList }) =>
    request("/aa/consent", { method: "POST", body: { customer_id: customerId, fip_list: fipList } }),

  /** -> ReBIT-style FI JSON { customer_id, fetchedAt, FI: [...] } */
  getAaFetch: (customerId) => request(`/aa/fetch/${customerId}`),

  /**
   * body { customer_id?, message } -> { reply, cards: [{type, data}], rationale, suitability_tag, audit_id }
   * Text-chat fallback for MIA — same shape as the avatar's internal call, used when
   * voice/WebRTC isn't available (venue Wi-Fi risk, per PLAN.md risk register).
   */
  postAdvisorTurn: ({ customerId, message }) =>
    request("/advisor-turn", { method: "POST", body: { customer_id: customerId, message } }),
};

export { ApiError };
