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

/* GET /api/cycles/latest
   Most recent ingestion cycle summary. Returns: { cycle: {...} }. */
export async function getLatestCycleSummary() {
  return apiFetch("/api/cycles/latest");
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
   Kick off an ingestion cycle. `mode` is e.g. "manual". */
export async function triggerIngestion(mode = "manual") {
  return apiFetch("/api/ingestion/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}
