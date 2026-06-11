// Intelligence Hub API client. Auth: X-API-KEY header matches INTERNAL_API_KEY
// on the server. Base URL + key from .env.
//
// Story tags below indicate which user story introduced each endpoint:
//   [SHARED] [US 1.3] [US 1.4] [US 1.6] [US 1.8]
 
import axios from "axios";
 
const BASE_URL = (process.env.REACT_APP_INTELLIGENCE_HUB_URL || "").replace(/\/$/, "");
const API_KEY  = process.env.REACT_APP_INTELLIGENCE_HUB_KEY || "";
 
if (!BASE_URL) {
  console.warn("[intelligenceHubApi] REACT_APP_INTELLIGENCE_HUB_URL is not set.");
}
if (!API_KEY) {
  console.warn("[intelligenceHubApi] REACT_APP_INTELLIGENCE_HUB_KEY is not set.");
}
 
const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
  timeout: 90_000,
});
 
// /ingestion/run runs Veeva fetch + Claims fetch + GPT-5 extraction
// serially; allow up to 6 minutes before the client gives up.
const INGESTION_RUN_TIMEOUT_MS = 360_000;
 
// Enrich errors with method + URL + status so UI banners can show where
// the request went, not just the bare message.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg = error?.config || {};
    const fullUrl = `${cfg.baseURL || ""}${cfg.url || ""}`;
    if (fullUrl) {
      const status = error?.response?.status;
      error.message = status
        ? `${error.message} (${cfg.method?.toUpperCase() || "GET"} ${fullUrl} → ${status})`
        : `${error.message} (${cfg.method?.toUpperCase() || "GET"} ${fullUrl})`;
    }
    return Promise.reject(error);
  }
);
 
// [SHARED]
export const getHealth = () => client.get("/health");
 
// [US 1.3] Ingestion
export const runIngestion = (request) =>
  client.post("/ingestion/run", request, { timeout: INGESTION_RUN_TIMEOUT_MS });
 
export const getRun = (runId) =>
  client.get(`/ingestion/${encodeURIComponent(runId)}`);
 
export const listRuns = () => client.get("/ingestion/runs");
 
// [US 1.3] Draft profile
export const getProfile = (profileId) =>
  client.get(`/profile/${encodeURIComponent(profileId)}`);
 
export const getDraftByRun = (runId) =>
  client.get(`/profile/draft/${encodeURIComponent(runId)}`);
 
// [US 1.3] Per-section review.
// section ∈ { messaging_pillars | tone_parameters | claims_inventory | prohibited_territory }
export const acceptSection = (profileId, section, user) =>
  client.post(
    `/profile/${encodeURIComponent(profileId)}/sections/${encodeURIComponent(section)}/accept`,
    { user }
  );
 
export const editSection = (profileId, section, newValue, user, editReason) =>
  client.post(
    `/profile/${encodeURIComponent(profileId)}/sections/${encodeURIComponent(section)}/edit`,
    { new_value: newValue, user, edit_reason: editReason }
  );
 
export const flagSection = (profileId, section, user, flagReason) =>
  client.post(
    `/profile/${encodeURIComponent(profileId)}/sections/${encodeURIComponent(section)}/flag`,
    { user, flag_reason: flagReason }
  );
 
// [US 1.3] Activation-readiness gate.
// Returns activation_blockers: zero_claims_extracted | section_flagged | section_pending_review
export const getActivationReadiness = (profileId) =>
  client.get(`/profile/${encodeURIComponent(profileId)}/activation-readiness`);
 
// [US 1.3] Audit log. [US 1.6] forward-compat: `params` supports
// { action, user, from, to } once the backend implements filtering.
export const getAudit = (profileId, params = {}) =>
  client.get(`/profile/${encodeURIComponent(profileId)}/audit`, { params });
 
// [US 1.4] Activation, version control, profile view, AI insights.
// Endpoints return 404 until the US 1.4 backend story lands — callers
// should catch and degrade to a placeholder.
 
// POST /profile/{id}/activate
// body:    { user, ...options }
// returns: { profile_id, version_id, version_number, status, activated_at,
//            activated_by, section_summary, is_partial?, unavailable_connectors? }
export const activateProfile = (profileId, user, options = {}) =>
  client.post(
    `/profile/${encodeURIComponent(profileId)}/activate`,
    { user, ...options }
  );
 
// GET /profile/{id}/status
// returns: { profile_id, status: "active"|"awaiting_review"|"inactive",
//            version_number?, last_activated_at?, last_refreshed_at?,
//            days_since_refresh?, refresh_required?,
//            is_partial?, unavailable_connectors? }
export const getProfileStatus = (profileId) =>
  client.get(`/profile/${encodeURIComponent(profileId)}/status`);
 
// GET /profile/active?brand=X. 404 ⇒ no active profile yet.
export const getActiveProfile = (brand) =>
  client.get(`/profile/active`, { params: brand ? { brand } : {} });
 
// GET /profile/versions?brand=X
// returns: VersionSummary[] = [{ version_id, version_number, profile_id,
//   brand?, indication?, activated_at, activated_by, diff_summary,
//   section_counts: { accepted, edited, flagged }, is_current }]
export const listVersions = (brand) =>
  client.get(`/profile/versions`, { params: brand ? { brand } : {} });
 
// GET /profile/version/{version_id} — immutable snapshot, same shape as
// DraftProfile with status="active" and version metadata populated.
export const getVersion = (versionId) =>
  client.get(`/profile/version/${encodeURIComponent(versionId)}`);
 
// GET /profile/version/{version_id}/diff?against={prev_version_id}
// returns: { from_version, to_version, sections: { <section>: { added,
//            removed, changed } }, summary }
export const getVersionDiff = (versionId, againstVersionId) =>
  client.get(
    `/profile/version/${encodeURIComponent(versionId)}/diff`,
    { params: { against: againstVersionId } }
  );
 
// GET /profile/{id}/insights?indication=X&audience=Y
// returns: { indication, audience,
//   content_pattern:    { summary, messaging_angles, tone_dimensions, claim_categories, confidence, citations },
//   audience_alignment: { depth, complexity, language_tone, restrictions, confidence, citations },
//   disclaimer }
export const getInsights = (profileId, indication, audience) =>
  client.get(
    `/profile/${encodeURIComponent(profileId)}/insights`,
    { params: { indication, audience } }
  );
 
// [US 1.8] POST /profile/{id}/acknowledge-partial
// body: { user } — allows activating a partial profile with an explicit
// user acknowledgement recorded in the audit log.
export const acknowledgePartialProfile = (profileId, user) =>
  client.post(
    `/profile/${encodeURIComponent(profileId)}/acknowledge-partial`,
    { user }
  );
 
// Added by Sanju Kumari — 2026-06-01
// Modified by Sanju Kumari — 2026-06-03: rewrote the US 1.5 stubs to point at
// the REAL backend endpoints (intelligence-hub-api/app/routers/refresh.py +
// activation.py). The original 5 stubs targeted endpoints that don't exist
// on the server — every call 404'd. Function names are preserved so existing
// consumers (BrandIntelligenceRefresh.jsx) still resolve their imports; the
// data shapes returned now match what the backend actually emits.
 
// [US 1.5] Refresh status — backend exposes refresh fields via the existing
// /profile/{id}/status endpoint, not a separate /refresh-status route.
// Returns only the refresh-relevant subset so the caller doesn't have to
// know the full ProfileStatusResponse shape.
export const getRefreshStatus = (profileId) =>
  client
    .get(`/profile/${encodeURIComponent(profileId)}/status`)
    .then((r) => {
      const s = r?.data || {};
      return {
        profile_id:         s.profile_id,
        status:             s.status,
        version_number:     s.version_number,
        last_activated_at:  s.last_activated_at,
        last_refreshed_at:  s.last_refreshed_at,
        days_since_refresh: s.days_since_refresh,
        refresh_required:   s.refresh_required,
        expiry_days:        90,
        brand:              s.brand,
        indication:         s.indication,
      };
    });
 
// [US 1.5] AC1 — POST /ingestion/refresh
// body:    RefreshRequest { brand?, indication?, triggered_by, force_full?,
//                           include_claims?, include_annotations?,
//                           document_ids?, manual_documents? }
// returns: RefreshSummary { run_id, status, profile_id, document_count,
//   previous_version_id, previous_version_number, warnings,
//   change_summary: { documents_added, documents_changed, documents_removed,
//     documents_unchanged, sections_added, sections_changed, sections_removed,
//     is_no_op, summary, per_document: [{ document_id, name, source, change_status }]
//   } }
// Note: backend's refresh route is request-body-driven, not profile-id in
// the URL. The first arg keeps the old (profileId, triggeredBy) signature
// for backward-compat — extra fields ride in via the `options` object.
// Modified by Sanju Kumari — 2026-06-03: applied the same INGESTION_RUN_TIMEOUT_MS
// per-request override that runIngestion uses. /ingestion/refresh runs Veeva
// fetch + Claims fetch + GPT-5 extraction serially (2–4 min typical) — the
// 90s default client timeout was killing the request before the LLM finished,
// surfacing as "timeout of 90000ms exceeded" in the UI.
export const runIncrementalRefresh = (profileId, triggeredBy, options = {}) =>
  client
    .post(
      `/ingestion/refresh`,
      {
        triggered_by: triggeredBy,
        include_claims: true,
        include_annotations: true,
        force_full: false,
        ...options,
      },
      { timeout: INGESTION_RUN_TIMEOUT_MS }
    )
    .then((r) => r.data);
 
// [US 1.5] Change set — backend stores per-section change_status annotations
// directly on the draft profile after a refresh runs. Returns the four
// sections so the UI can render their per-item change rollups.
export const getProfileChanges = (profileId) =>
  client
    .get(`/profile/${encodeURIComponent(profileId)}`)
    .then((r) => {
      const draft = r?.data || {};
      const sections = draft.sections || {};
      return {
        profile_id: draft.profile_id,
        last_refreshed_at: draft.last_refreshed_at,
        sections: {
          messaging_pillars:    sections.messaging_pillars    || null,
          tone_parameters:      sections.tone_parameters      || null,
          claims_inventory:     sections.claims_inventory     || null,
          prohibited_territory: sections.prohibited_territory || null,
        },
      };
    });
 
// [US 1.5] AC4 / BR-SIH-001 — re-approval is implemented as re-activation:
// POSTing to /profile/{id}/activate resets the 90-day refresh clock and
// stamps a new ActivatedProfileSnapshot. The backend has no dedicated
// /reapprove route — re-activation IS the re-approve mechanism per design.
export const reapproveStaleProfile = (profileId, user) =>
  client
    .post(`/profile/${encodeURIComponent(profileId)}/activate`, { user })
    .then((r) => r.data);
 
// [US 1.5] AC3 — downstream content atoms tracked by the backend atom
// registry. Filtering by profile_version_id (NOT profile_id) returns every
// atom generated from that specific version. To find atoms flagged for
// review after a newer version superseded the one they were generated
// from, pass state="review_recommended".
export const getDownstreamImpact = (profileVersionId, state = undefined) =>
  client
    .get(`/atoms`, {
      params: {
        profile_version_id: profileVersionId,
        ...(state ? { state } : {}),
      },
    })
    .then((r) => r.data);
 
// [US 1.5] BR-SIH-001 / BR-SIH-002 gate. Content Studio polls this before
// every generation session. Used by BrandIncrementalProfile to render the
// expiry banner with the precise blocker reason.
export const getCanGenerate = (brand) =>
  client
    .get(`/profile/active/can-generate`, {
      params: brand ? { brand } : {},
    })
    .then((r) => r.data);
 
// [US 1.5] List atoms with arbitrary filters. Thin wrapper over GET /atoms
// for the "Downstream Atoms" tab when we want broader filters than
// getDownstreamImpact's version-pinned lookup.
export const listAtoms = (params = {}) =>
  client.get(`/atoms`, { params }).then((r) => r.data);

// [US 1.8 AC #6] POST /refresh/recovery-scan
// Backend probes previously-unavailable connectors; if any have recovered,
// it auto-triggers /ingestion/refresh under the hood. Safe to call on every
// hydrate — the 24h gate on the server prevents repeated upstream probes.
//
// returns: { brand, checked, recovered, reason, recovered_connectors,
//            still_unavailable, last_check_at, next_check_eligible_at,
//            new_run_id?, new_profile_id? }
export const runRecoveryScan = (brand, triggeredBy = "system", force = false) =>
  client
    .post(`/refresh/recovery-scan`, null, {
      params: {
        ...(brand ? { brand } : {}),
        triggered_by: triggeredBy,
        force,
      },
      // Recovery scan can trigger a full /ingestion/refresh inline, so it
      // needs the same generous timeout the manual refresh uses.
      timeout: INGESTION_RUN_TIMEOUT_MS,
    })
    .then((r) => r.data);
 
 