import type {
  DefaultCustomerResponse,
  TwinResponse,
  GoalsResponse,
  ScenarioResponse,
  RecommendationsResponse,
  AuditLogsResponse,
  ConsentArtefact,
  AAFetchResponse,
  AdvisorTurnResponse,
  TavusConversationResponse,
  TavusPollResponse,
} from "./types";

// Single source of truth for the backend origin. Never hardcode this
// elsewhere — import BACKEND_URL or the `api` helper instead.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Could not reach MIA backend at ${BACKEND_URL}${path}. Is it running?`,
      0
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      `${init?.method || "GET"} ${path} failed: ${res.status} ${body}`.trim(),
      res.status
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  backendUrl: BACKEND_URL,

  getDefaultCustomer: () => request<DefaultCustomerResponse>("/customers/default"),

  getTwin: (customerId: string) =>
    request<TwinResponse>(`/customers/${customerId}/twin`),

  getGoals: (customerId: string) =>
    request<GoalsResponse>(`/customers/${customerId}/goals`),

  getScenario: (
    customerId: string,
    params: {
      goal_name?: string;
      extra_monthly_contribution?: number;
      one_time_delta?: number;
    } = {}
  ) => {
    const qs = new URLSearchParams();
    if (params.goal_name) qs.set("goal_name", params.goal_name);
    if (params.extra_monthly_contribution !== undefined)
      qs.set("extra_monthly_contribution", String(params.extra_monthly_contribution));
    if (params.one_time_delta !== undefined)
      qs.set("one_time_delta", String(params.one_time_delta));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<ScenarioResponse>(`/customers/${customerId}/scenario${suffix}`);
  },

  getRecommendations: (customerId: string) =>
    request<RecommendationsResponse>(`/customers/${customerId}/recommendations`),

  getAuditLogs: (limit = 50) =>
    request<AuditLogsResponse>(`/audit-logs?limit=${limit}`),

  postConsent: (body: { customer_id?: string; fip_list?: string[] }) =>
    request<ConsentArtefact>("/aa/consent", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getAAFetch: (customerId: string) =>
    request<AAFetchResponse>(`/aa/fetch/${customerId}`),

  postAdvisorTurn: (body: { customer_id?: string; message: string }) =>
    request<AdvisorTurnResponse>("/advisor-turn", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Tavus AI Avatar */

  createTavusConversation: (body?: { customer_id?: string }) =>
    request<TavusConversationResponse>("/tavus/conversations", {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),

  getTavusResponses: (conversationId: string, sinceTurnId?: string) => {
    const qs = sinceTurnId ? `?since_turn_id=${sinceTurnId}` : "";
    return request<TavusPollResponse>(`/tavus/response/${conversationId}${qs}`);
  },

  endTavusConversation: (conversationId: string) =>
    request<{ status: string }>(`/tavus/conversations/${conversationId}/end`, {
      method: "POST",
    }),
};
