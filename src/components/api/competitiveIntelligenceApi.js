// ═══════════════════════════════════════════════════════════════════════
// competitiveIntelligenceApi.js
// LOCATION : src/components/api/competitiveIntelligenceApi.js
// ONLY JOB : Talk to the Competitive Intelligence FastAPI backend.
//            (Backend_intelligence_hub/competitive_intelligence/backend/main.py)
//
//            The UI sends ONLY a connector_id. All external URLs, auth
//            tokens, and secrets live in the FastAPI backend — never here.
//
// BACKEND ENDPOINTS:
//   GET  /health                  → liveness probe
//   GET  /api/connectors          → list registered connector IDs + labels
//   POST /api/connector/fetch     → generic fetch (returns ConnectorResponse)
// ═══════════════════════════════════════════════════════════════════════

/* ─────────────────────────────────────────────────────────
   CONFIG — single place to point at the backend.
   uvicorn main:app --reload --port 8000  ⇒ http://localhost:8000
   Override with REACT_APP_API_BASE in .env for other environments.
───────────────────────────────────────────────────────── */
export const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:8000";

/* ─────────────────────────────────────────────────────────
   CENTRAL FETCH HELPER
   Handles JSON parsing + error extraction in one place so the
   backend's { "detail": "..." } error shape surfaces cleanly.
───────────────────────────────────────────────────────── */
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || `Error ${res.status}`);
  }
  return res.json();
}

/* ─────────────────────────────────────────────────────────
   POST /api/connector/fetch
   The single generic call the UI makes. Sends only connector_id;
   the backend resolves the real endpoint, auth, and params,
   calls the external source, normalises it, and returns a
   standard ConnectorResponse:

     {
       connector_id, label, source_type, status,
       fetched_at, response_time_ms, records,
       latest_record, raw_payload, error
     }

   status is one of "success" | "error" | "disabled".
───────────────────────────────────────────────────────── */
export async function callConnectorAPI(connectorId, extraParams = {}) {
  return apiFetch("/api/connector/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connector_id: connectorId,
      extra_params: extraParams,
    }),
  });
}

/* ─────────────────────────────────────────────────────────
   GET /api/connectors
   Lists all registered connector IDs, labels, and source types.
   Returns: { connectors: [{ id, label, source, disabled }, ...] }
───────────────────────────────────────────────────────── */
export async function listConnectors() {
  const data = await apiFetch("/api/connectors");
  return data.connectors;
}

/* ─────────────────────────────────────────────────────────
   GET /api/connectors/status
   Real-time status of every connector. The backend probes all
   sources concurrently and returns live status + the timestamp
   each was checked — the dashboard renders from this instead of
   hardcoded values.
   Returns: {
     checked_at,
     connectors: [{ id, label, source, status, records,
                    last_checked, response_time_ms, error }, ...]
   }
   status is one of "success" | "error" | "disabled".
───────────────────────────────────────────────────────── */
export async function getConnectorsStatus() {
  return apiFetch("/api/connectors/status");
}

/* ─────────────────────────────────────────────────────────
   GET /health
   Liveness probe. Returns { status: "ok", timestamp }.
───────────────────────────────────────────────────────── */
export async function checkHealth() {
  return apiFetch("/health");
}

/* ─────────────────────────────────────────────────────────
   COMPETITOR INVENTORY ENDPOINTS
   Consumed by CompetitorInventory.jsx. NOTE: endpoint paths
   below follow the backend's REST convention — verify they
   match the FastAPI routes in
   Backend_intelligence_hub/competitive_intelligence/backend/main.py
───────────────────────────────────────────────────────── */

/** Build a query string from an object, skipping undefined/null/"" values. */
function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.append(key, value);
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

/* GET /api/inventory
   Filterable competitor inventory list.
   Params: data_category, competitor_name, new_this_cycle,
           low_confidence, page_size.
   Returns: { items: [...], total }. */
export async function getInventory(params = {}) {
  return apiFetch(`/api/inventory${buildQuery(params)}`);
}

/* GET /api/inventory/stats
   Aggregate counts. Returns: { by_category: {...}, ... }. */
export async function getInventoryStats() {
  return apiFetch("/api/inventory/stats");
}

/* GET /api/ingestion/cycles/latest/summary
   Most recent ingestion cycle summary.
   Returns: { cycle, ad_summaries, pending_count, quarantine_count }.
   404 until the first cycle has run — caller treats that as "no cycle yet". */
export async function getLatestCycleSummary() {
  return apiFetch("/api/ingestion/cycles/latest/summary");
}

/* GET /api/ad-summaries
   Observed ad-activity summaries. Returns: { summaries: [...] }. */
export async function getAdSummaries() {
  return apiFetch("/api/ad-summaries");
}

/* GET /api/pending
   Items awaiting review. Returns: { items: [...] }. */
export async function getPendingItems() {
  return apiFetch("/api/pending");
}

/* GET /api/quarantine
   Quarantined / rejected items. Returns: { items: [...] }. */
export async function getQuarantine() {
  return apiFetch("/api/quarantine");
}

/* POST /api/ingestion/trigger
   Kick off an ingestion cycle. The backend runs the full cycle synchronously
   and returns: { message, cycle_id, status, total_items_ingested,
   pending_count, quarantined_count, connector_failures, item_counts }.
   `triggeredBy` is logged on the cycle record.
   `sources`      (optional) limits which source TYPES run — null = all four.
   `connectorIds` (optional) ingests only those specific connectors — this is
   what the connector cards send so the agent ingests exactly the connector
   the user selected. Takes precedence over `sources`. */
export async function triggerIngestion(triggeredBy = "manual", sources = null, connectorIds = null) {
  return apiFetch("/api/ingestion/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ triggered_by: triggeredBy, sources, connector_ids: connectorIds }),
  });
}

/* GET /api/ingestion/logs
   Structured ingestion run log (newest first) — every run, successful or
   failed, with item counts per Data Category and connector failure reasons.
   Returns: { total, logs: [cycleRecord, ...] }. */
export async function getRunLogs(limit = 50) {
  return apiFetch(`/api/ingestion/logs${buildQuery({ limit })}`);
}

/* GET /api/ingestion/logs/download
   Download the full ingestion run log as a file (pdf | txt | json). Streams the
   response as a Blob and triggers a browser download. Defaults to PDF. */
export async function downloadRunLog(format = "pdf") {
  const res = await fetch(`${API_BASE}/api/ingestion/logs/download?format=${format}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  const blob = await res.blob();
  // Pull the server-provided filename from Content-Disposition when present.
  const cd = res.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const extMap = { json: "json", txt: "log", pdf: "pdf" };
  const filename = match ? match[1] : `ingestion_run_log.${extMap[format] || "pdf"}`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/* POST /api/competitor/ask
   Ask the AI agent about a tracked competitor. Grounded only on the classified
   inventory. The agent may describe ad channels, messaging, activity duration,
   and frequency trends — but never ad spend/budget (spend questions are
   refused). Returns: { competitor_name, question, answer, refused,
   grounded_on, generated_by }. */
export async function askCompetitor(competitorName, question) {
  return apiFetch("/api/competitor/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ competitor_name: competitorName, question }),
  });
}

/* POST /api/comparison/analyze   (US 2.3 — Comparative Claims Analysis)
   The UI sends ONLY the competitor content (+ optional label). The backend
   fetches ALL Veeva-approved claims server-side, runs the AI comparison agent,
   and returns a CompareResponse:
     { competitor_name, veeva_claims_count, generated_by,
       comparison_table: [{ claim_category, veeva_claim, competitor_claim,
                            comparison_summary, gap_analysis }, ...],
       gap_assessment: { similarities_and_differences,
                         competitive_strengths_and_weaknesses,
                         missing_or_underrepresented_claims,
                         content_enhancement_opportunities } } */
export async function analyzeComparison(competitorContent, competitorName = "") {
  return apiFetch("/api/comparison/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      competitor_content: competitorContent,
      competitor_name: competitorName,
    }),
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   US 2.4 — Competitive Intelligence Dashboard  (prefix /api/dashboard)
   Consumed by CompetitiveManageGaps.jsx.
═══════════════════════════════════════════════════════════════════════ */

function postJson(endpoint, body = {}) {
  return apiFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* GET /api/dashboard — gap matrix + whitespace + parity + counts (filterable). */
export function getDashboard(filters = {}) {
  return apiFetch(`/api/dashboard${buildQuery(filters)}`);
}

/* POST /api/dashboard/run — run the gap-analysis agent and build a new version. */
export function runDashboardAnalysis(body = {}) {
  return postJson("/api/dashboard/run", body);
}

/* POST /api/dashboard/refresh — role-gated refresh (Brand Manager | Campaign Strategist). */
export function refreshDashboard(role, triggeredBy = "manual") {
  return postJson("/api/dashboard/refresh", { role, triggered_by: triggeredBy });
}

export function getGap(gapId)              { return apiFetch(`/api/dashboard/gaps/${gapId}`); }
export function convertGap(gapId, user = "Brand Manager")  { return postJson(`/api/dashboard/gaps/${gapId}/convert`, { user }); }
export function dismissGap(gapId, reason, user = "Brand Manager") { return postJson(`/api/dashboard/gaps/${gapId}/dismiss`, { reason, user }); }
export function deferGap(gapId, user = "Brand Manager")    { return postJson(`/api/dashboard/gaps/${gapId}/defer`, { user }); }
export function requestGapAnalysis(gapId, user = "Brand Manager", note = null) { return postJson(`/api/dashboard/gaps/${gapId}/request-analysis`, { user, note }); }
export function getWhitespace()   { return apiFetch("/api/dashboard/whitespace"); }
export function getParity()       { return apiFetch("/api/dashboard/parity"); }
export function getGapReport()    { return apiFetch("/api/dashboard/report"); }
export function getWatchList()    { return apiFetch("/api/dashboard/watch-list"); }
export function getDashboardAudit() { return apiFetch("/api/dashboard/audit"); }

/* ═══════════════════════════════════════════════════════════════════════
   US 2.5 — Competitive Alerts  (prefix /api/alerts)
   Consumed by CompetitiveAlertDashboard.jsx.
═══════════════════════════════════════════════════════════════════════ */

/* POST /api/alerts/detect — run new-entrant / regulatory-event detection. */
export function detectAlerts(triggeredBy = "scheduler") {
  return postJson("/api/alerts/detect", { triggered_by: triggeredBy });
}

/* GET /api/alerts — list all alerts. Returns { total, alerts: [...] }. */
export async function listAlerts() {
  const data = await apiFetch("/api/alerts");
  return data.alerts || [];
}

export function getAlert(alertId)                 { return apiFetch(`/api/alerts/${alertId}`); }
export function acknowledgeAlert(alertId, user = "Brand Manager")   { return postJson(`/api/alerts/${alertId}/acknowledge`, { user }); }
export function convertAlertUrgent(alertId, user = "Brand Manager") { return postJson(`/api/alerts/${alertId}/convert-urgent`, { user }); }
export function escalateAlert(alertId, user = "Brand Manager")      { return postJson(`/api/alerts/${alertId}/escalate`, { user }); }
export function getAlertNotifications() { return apiFetch("/api/alerts/meta/notifications"); }
export function getAlertAudit()         { return apiFetch("/api/alerts/meta/audit"); }
