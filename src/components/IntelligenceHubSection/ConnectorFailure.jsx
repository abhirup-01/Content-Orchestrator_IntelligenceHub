// Sanju changes - 29th June 2026: added from the competitive_intelligence_frontend
// reference build. Standalone component — not yet imported/rendered anywhere
// (kept for reuse; wiring it up would change the existing UI).
// Modified by Sanju Kumari — 2026-06-05: removed every hardcoded constant
// (CONNECTORS / DOCUMENTS / AUDIT_LOG / ZERO_CLAIMS_SCENARIO) and the fake
// 6-second recovery timer. The console is now wired to the real
// intelligence-hub-api endpoints — same approach as the BrandIncrementalProfile
// refactor:
//
//   - GET  /ingestion/runs            → latest ingestion cycle (when no runId prop)
//   - GET  /ingestion/{run_id}        → run detail: document_count, warnings,
//                                       change_summary.per_document[]
//   - GET  /profile/{id}/status       → is_partial + unavailable_connectors + brand
//   - GET  /profile/{id}              → claims_inventory count (Claims Extracted)
//   - GET  /profile/{id}/audit        → audit log entries
//   - POST /profile/{id}/acknowledge-partial → Activate with Acknowledgement (AC#2)
//   - POST /ingestion/refresh         → Re-run Cycle
//
// UI structure (sub-components, JSX layout, CSS class names) is preserved.
// The backend has no rich connector registry, so connectors are derived from
// `unavailable_connectors` (failed) + the distinct document sources (connected).
// Fields the backend doesn't supply (per-connector error type / consecutive-cycle
// counts, per-document claim counts, recovery events) are read when present and
// degraded gracefully (— / hidden banners) where not.
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getRun,
  listRuns,
  getProfileStatus,
  getProfile,
  getAudit,
  acknowledgePartialProfile,
  getActiveProfile,
  runIncrementalRefresh,
} from "../api/intelligenceHubApi";
import "./IntelligenceCss/ConnectorFailure.css";

// Audit identity for acknowledge + re-run actions. Same env-override / generic
// fallback convention as the rest of the Intelligence Hub.
const CURRENT_USER =
  process.env.REACT_APP_CURRENT_USER || "platform-admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readErrorMessage(err) {
  if (!err) return "Unknown error.";
  if (typeof err === "string") return err;
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  return err.message || "Unknown error.";
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso)
      .toLocaleString("en-GB", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZone: "UTC",
      })
      .replace(",", "") + " UTC";
  } catch {
    return String(iso);
  }
}

// `unavailable_connectors` entries may be plain strings (just the name) or
// objects carrying richer failure metadata. Normalize both into one shape.
function normalizeFailedConnector(entry) {
  if (typeof entry === "string") {
    return { name: entry, errorType: null, errorMsg: null, consecutiveCycles: 0, lastSuccess: null, timestamp: null };
  }
  const e = entry || {};
  return {
    name:              e.name || e.connector || e.id || "(connector)",
    errorType:         e.error_type || e.errorType || null,
    errorMsg:          e.error || e.error_message || e.detail || null,
    consecutiveCycles: Number(e.consecutive_cycles ?? e.consecutiveCycles ?? 0),
    lastSuccess:       e.last_success || e.lastSuccess || null,
    timestamp:         e.timestamp || e.failed_at || null,
    status:            e.status || "failed",
  };
}

// Build the connector table from the failed list + the connectors that
// actually produced documents this cycle (distinct per_document sources).
// `recoveringNames` are connectors that were failed on a previous poll but have
// since dropped out of unavailable_connectors — they're being re-ingested (AC#6)
// and render with the amber "Recovering" status until the next cycle confirms them.
function buildConnectors(perDocument, unavailableConnectors, recoveringNames = new Set()) {
  const failed = (unavailableConnectors || []).map(normalizeFailedConnector);
  const failedNames = new Set(failed.map((c) => c.name));

  // Distinct sources that yielded documents → these connectors are "ok",
  // unless they also appear in the failed list (then failure wins).
  const sourceNames = new Set(
    (perDocument || [])
      .map((d) => d.source)
      .filter((s) => s && !failedNames.has(s))
  );

  const connectors = [];

  failed.forEach((c, i) => {
    connectors.push({
      id: c.name ? c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `failed-${i}`,
      name: c.name,
      icon: "🔌",
      type: "Source connector",
      status: c.status === "recovering" || c.status === "recovered" ? "recovering" : "failed",
      errorType: c.errorType,
      errorMsg: c.errorMsg,
      timestamp: c.timestamp,
      consecutiveCycles: c.consecutiveCycles,
      lastSuccess: c.lastSuccess,
    });
  });

  [...sourceNames].forEach((name, i) => {
    connectors.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `ok-${i}`,
      name,
      icon: "📁",
      type: "Source connector",
      status: "ok",
      errorType: null,
      errorMsg: null,
      timestamp: null,
      consecutiveCycles: 0,
      lastSuccess: null,
    });
  });

  // Overlay recovery state: a recovering connector that's already listed flips
  // to "recovering"; one that isn't listed yet is added so it's still visible
  // while its re-ingestion is in flight.
  if (recoveringNames.size > 0) {
    const seen = new Set(connectors.map((c) => c.name));
    connectors.forEach((c) => {
      if (recoveringNames.has(c.name)) c.status = "recovering";
    });
    [...recoveringNames].forEach((name, i) => {
      if (!seen.has(name)) {
        connectors.push({
          id: (name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `rec-${i}`),
          name,
          icon: "🔄",
          type: "Source connector",
          status: "recovering",
          errorType: null,
          errorMsg: null,
          timestamp: null,
          consecutiveCycles: 0,
          lastSuccess: null,
        });
      }
    });
  }

  return connectors;
}

// Extract the set of currently-failed connector names from a profile-status
// payload — the single source of truth for both the table and recovery detection.
function failedNameSet(profileStatus) {
  return new Set(
    (profileStatus?.unavailable_connectors || []).map((c) => normalizeFailedConnector(c).name)
  );
}

// Build the documents table from the run's per_document rollup. Parse status
// is inferred: documents from an unavailable source are "skipped"; documents
// named in a run warning are "error" (unsupported format); the rest "ok".
function buildDocuments(perDocument, warnings, failedNames) {
  const warns = warnings || [];
  return (perDocument || []).map((d) => {
    const name = d.name || d.document_id;
    const fromFailedSource = failedNames.has(d.source);
    const matchingWarning = warns.find(
      (w) => typeof w === "string" && name && w.toLowerCase().includes(String(name).toLowerCase())
    );
    let status = "ok";
    if (fromFailedSource) status = "skipped";
    else if (matchingWarning) status = "error";

    return {
      id: d.document_id || name,
      name,
      size: d.size || "—",
      source: d.source || "—",
      status,
      // Per-document claim counts aren't exposed by the backend.
      claims: Number(d.claims ?? 0),
      warning:
        status === "skipped" ? "Source connector unavailable — skipped."
        : status === "error" ? (matchingWarning || "Could not be parsed.")
        : null,
    };
  });
}

// Map backend audit action → a timeline dot colour.
function dotForAction(action = "") {
  const a = String(action).toLowerCase();
  if (a.includes("fail") || a.includes("error") || a.includes("block")) return "red";
  if (a.includes("flag") || a.includes("warn") || a.includes("partial")) return "amber";
  if (a.includes("accept") || a.includes("recover") || a.includes("activate")) return "green";
  return "blue";
}

// Transform raw audit rows ({ entry_id, timestamp, user, action, section, note })
// into the { id, time, dot, msg } shape AuditTab renders.
function buildAuditEntries(raw) {
  return (Array.isArray(raw) ? raw : []).map((e, i) => ({
    id: e.entry_id || i,
    time: formatTimestamp(e.timestamp),
    dot: dotForAction(e.action),
    msg: (
      <>
        {e.user ? <strong>{e.user}</strong> : null}
        {e.user ? " — " : ""}
        {e.action || "event"}
        {e.section ? ` · ${e.section}` : ""}
        {e.note ? ` — ${e.note}` : ""}
      </>
    ),
  }));
}

// Count extracted claims from the draft profile's claims_inventory section.
function getClaimsCount(profile) {
  const sec = profile?.sections?.claims_inventory;
  if (!sec) return 0;
  const items =
    sec.current_value?.items ||
    sec.current_value?.claims ||
    sec.items ||
    (Array.isArray(sec.current_value) ? sec.current_value : null);
  return Array.isArray(items) ? items.length : 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const map = {
    failed:     "Failed",
    ok:         "Connected",
    recovering: "Recovering",
    partial:    "Partial",
  };
  return <span className={`status-pill status-pill--${status}`}>{map[status] ?? status}</span>;
}

function ErrTag({ type }) {
  if (!type) return null;
  const cls = {
    TIMEOUT:      "err-tag--timeout",
    AUTH_FAILURE: "err-tag--auth",
    FORMAT:       "err-tag--format",
    RECOVERED:    "err-tag--recovered",
  }[type] ?? "";
  return <span className={`err-tag ${cls}`}>{type}</span>;
}

function DocStatusIcon({ status }) {
  if (status === "ok")      return <span className="text-green">✓</span>;
  if (status === "error")   return <span className="text-amber">⚠</span>;
  if (status === "skipped") return <span className="text-muted">—</span>;
  return null;
}

// ─── Acknowledge Partial Profile Modal (AC#2) ─────────────────────────────────

function AcknowledgeModal({ failedConnectors, onClose, onConfirm, busy }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="cf-modal-overlay" role="dialog" aria-modal="true">
      <div className="cf-modal">
        <div className="cf-modal__warning-strip">
          <span>⚠️</span>
          Partial Profile — Activation Acknowledgement Required
        </div>
        <h2 className="cf-modal__title">Activate with Incomplete Coverage?</h2>
        <p className="cf-modal__body">
          The following source connectors were <strong style={{ color: "#e24b4a" }}>unavailable</strong> during this
          ingestion cycle. Brand intelligence derived from these sources is missing from the current profile.
          Activating will log this acknowledgement to the audit trail.
        </p>
        <div className="cf-modal__missing-list">
          <p className="cf-modal__missing-label">Missing Sources</p>
          {failedConnectors.length === 0 ? (
            <div className="cf-modal__missing-item text-muted">No unavailable sources reported.</div>
          ) : (
            failedConnectors.map((c) => (
              <div key={c.id} className="cf-modal__missing-item">
                {c.name}
                {c.errorType ? (
                  <> — <span className="text-mono text-muted" style={{ fontSize: 11 }}>{c.errorType}</span></>
                ) : null}
              </div>
            ))
          )}
        </div>
        <label className="cf-modal__checkbox-row">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="cf-modal__checkbox-label">
            I acknowledge that this profile has <strong>incomplete brand intelligence coverage</strong> and
            understand that content generated from it may not reflect data from the unavailable sources.
          </span>
        </label>
        <div className="cf-modal__actions">
          <button className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn btn--warning"
            onClick={onConfirm}
            disabled={!checked || busy}
            style={{ opacity: checked && !busy ? 1 : 0.4, cursor: checked && !busy ? "pointer" : "not-allowed" }}
          >
            {busy ? "Activating…" : "Activate Partial Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Notification Preview (AC#5) ───────────────────────────────────────

function EmailNotificationPreview({ failedConnectors, profileId, sentAt }) {
  const persistent = failedConnectors.filter((c) => c.consecutiveCycles >= 2);
  return (
    <div className="cf-email-preview">
      <div className="cf-email-preview__header">
        <div className="cf-email-preview__field">
          <span className="cf-email-preview__field-label">From:</span>
          <span className="cf-email-preview__field-value">platform-alerts@brandiq.io</span>
        </div>
        <div className="cf-email-preview__field">
          <span className="cf-email-preview__field-label">To:</span>
          <span className="cf-email-preview__field-value">{CURRENT_USER}</span>
        </div>
        <div className="cf-email-preview__field">
          <span className="cf-email-preview__field-label">Subject:</span>
          <span className="cf-email-preview__field-value" style={{ color: "#e24b4a" }}>
            [ACTION REQUIRED] Connector failure persists — 2+ consecutive cycles
          </span>
        </div>
        <div className="cf-email-preview__field">
          <span className="cf-email-preview__field-label">Sent:</span>
          <span className="cf-email-preview__field-value">{formatTimestamp(sentAt)}</span>
        </div>
      </div>
      <div className="cf-email-preview__body">
        <p>Platform Admin,</p>
        <br />
        <p>The following connectors have failed across <strong>2 or more consecutive ingestion cycles</strong>:</p>
        <br />
        {(persistent.length ? persistent : failedConnectors).map((c) => (
          <p key={c.id}>
            {"  · "}<strong>{c.name}</strong>
            {c.errorType ? ` — ${c.errorType}` : ""}
            {c.consecutiveCycles ? ` — ${c.consecutiveCycles} consecutive cycles` : ""}
          </p>
        ))}
        <br />
        <p>Immediate action is required to restore full ingestion coverage.</p>
        {profileId && <p>Profile {profileId} is currently marked <strong>Partial</strong>.</p>}
        <br />
        <p>→ Review in platform: app.brandiq.io/connectors</p>
        <br />
        <p>— BrandIQ Platform</p>
      </div>
    </div>
  );
}

// ─── Zero Claims Blocked State (AC#4) ────────────────────────────────────────

function ZeroClaimsBlock() {
  return (
    <div className="cf-zero-claims">
      <div className="cf-zero-claims__header">
        <span style={{ fontSize: 20 }}>🚫</span>
        <p className="cf-zero-claims__title">
          Zero Claims Extracted — Profile Activation Blocked (AC#4)
        </p>
        <button className="btn btn--danger btn--sm">Review Source Material</button>
      </div>
      <div className="cf-zero-claims__body">
        No brand claims could be extracted from any of the ingested documents. This may indicate
        documents are empty, incorrectly formatted, or the AI parser could not identify structured
        brand intelligence. Profile activation is <strong style={{ color: "#e24b4a" }}>prevented</strong> until
        the Brand Manager reviews and resolves source material quality.
      </div>
    </div>
  );
}

// ─── Connectors Tab ───────────────────────────────────────────────────────────

function ConnectorsTab({ connectors }) {
  const failed = connectors.filter((c) => c.status === "failed");
  const persistent = failed.filter((c) => c.consecutiveCycles >= 2);

  if (connectors.length === 0) {
    return <div className="cf-empty">No connector activity reported for this cycle.</div>;
  }

  return (
    <div>
      {/* AC#5 — Persistent failure across 2+ cycles: admin alert */}
      {persistent.length > 0 && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div className="cf-alert cf-alert--danger">
            <span className="cf-alert__icon">📧</span>
            <div className="cf-alert__body">
              <p className="cf-alert__title">Admin Notified — Persistent Connector Failure (AC#5)</p>
              <p className="cf-alert__desc">
                {persistent.map((c) => c.name).join(", ")}{" "}
                {persistent.length === 1 ? "has" : "have"} failed
                across 2 or more consecutive ingestion cycles. An in-platform alert and email notification
                have been dispatched to the Platform Admin.
              </p>
              <div className="cf-alert__actions">
                <button className="btn btn--ghost btn--sm">View Email Preview ↓</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <table className="cf-connector-table">
        <thead>
          <tr>
            <th>Connector</th>
            <th>Type</th>
            <th>Status</th>
            <th>Error Type</th>
            <th>Error Detail</th>
            <th>Timestamp (UTC)</th>
            <th>Consec. Failures</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {connectors.map((conn) => (
            <tr key={conn.id}>
              <td>
                <div className="cf-conn-name">
                  <div className={`cf-conn-icon ${
                    conn.status === "failed" ? "cf-conn-icon--red" :
                    conn.status === "recovering" ? "cf-conn-icon--amber" :
                    "cf-conn-icon--green"
                  }`}>
                    {conn.icon}
                  </div>
                  <div>
                    <div className="cf-conn-name-text">{conn.name}</div>
                    <div className="cf-conn-name-sub">ID: {conn.id}</div>
                  </div>
                </div>
              </td>
              <td className="text-muted">{conn.type}</td>
              <td><StatusPill status={conn.status} /></td>
              <td>
                {conn.errorType ? <ErrTag type={conn.errorType} /> : <span className="text-muted" style={{ fontSize: 12 }}>—</span>}
              </td>
              <td style={{ maxWidth: 220, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {conn.errorMsg ?? <span className="text-muted">—</span>}
              </td>
              <td className="mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                {conn.timestamp ? formatTimestamp(conn.timestamp) : <span className="text-muted">—</span>}
              </td>
              <td style={{ textAlign: "center" }}>
                {conn.consecutiveCycles >= 2 ? (
                  <span className="cf-consec-badge">🔁 {conn.consecutiveCycles}×</span>
                ) : (
                  <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                )}
              </td>
              <td>
                {conn.status === "failed" && (
                  <button className="btn btn--danger btn--sm">Retry</button>
                )}
                {conn.status === "recovering" && (
                  <button className="btn btn--ghost btn--sm">View Log</button>
                )}
                {conn.status === "ok" && (
                  <button className="btn btn--ghost btn--sm">Details</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ documents }) {
  const errorDocs = documents.filter((d) => d.status === "error");

  if (documents.length === 0) {
    return <div className="cf-empty">No documents processed in this cycle.</div>;
  }

  return (
    <div>
      {/* AC#3 — Unparseable format warnings */}
      {errorDocs.length > 0 && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div className="cf-alert cf-alert--warning">
            <span className="cf-alert__icon">⚠️</span>
            <div className="cf-alert__body">
              <p className="cf-alert__title">
                {errorDocs.length} File{errorDocs.length > 1 ? "s" : ""} Could Not Be Parsed (AC#3)
              </p>
              <p className="cf-alert__desc">
                The AI parser could not process {errorDocs.map((d) => d.name).join(", ")}.
                Processing continued for all other compatible documents. Upload compatible formats
                (PDF, DOCX, PPTX, TXT) to include these sources.
              </p>
              <div className="cf-alert__actions">
                <button className="btn btn--warning btn--sm">Upload Compatible Format</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <table className="cf-file-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Source Connector</th>
            <th>Size</th>
            <th>Parse Status</th>
            <th>Claims Extracted</th>
            <th>Warning / Action</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td>
                <div className="cf-file-name">
                  <span className="cf-file-icon">
                    {String(doc.name).endsWith(".pdf") ? "📄" :
                     String(doc.name).endsWith(".docx") ? "📝" :
                     String(doc.name).endsWith(".pptx") ? "📊" :
                     "📦"}
                  </span>
                  <div>
                    <div className="cf-file-name-text">{doc.name}</div>
                    <div className="cf-file-name-sub">ID: {doc.id}</div>
                  </div>
                </div>
              </td>
              <td className="text-muted" style={{ fontSize: 12 }}>{doc.source}</td>
              <td className="text-muted" style={{ fontSize: 12 }}>{doc.size}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <DocStatusIcon status={doc.status} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {doc.status === "ok" ? "Parsed" :
                     doc.status === "error" ? "Unparseable" :
                     "Skipped"}
                  </span>
                </div>
              </td>
              <td style={{ fontSize: 13, fontWeight: 600, color: doc.claims > 0 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                {doc.claims > 0 ? doc.claims : "—"}
              </td>
              <td>
                {doc.warning ? (
                  <div className="cf-file-warn">
                    <span>⚠</span>
                    <span>{doc.warning}</span>
                  </div>
                ) : (
                  <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

function AuditTab({ entries }) {
  if (entries.length === 0) {
    return <div className="cf-empty">No audit entries for this profile yet.</div>;
  }
  return (
    <div className="cf-audit">
      {entries.map((entry) => (
        <div key={entry.id} className="cf-audit__entry">
          <span className={`cf-audit__dot cf-audit__dot--${entry.dot}`} />
          <span className="cf-audit__time">{entry.time}</span>
          <span className="cf-audit__msg">{entry.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Notifications Tab (AC#5 email) ──────────────────────────────────────────

function NotificationsTab({ failedConnectors, profileId, sentAt }) {
  const persistent = failedConnectors.filter((c) => c.consecutiveCycles >= 2);
  return (
    <div style={{ padding: "20px" }}>
      {persistent.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          No admin notifications dispatched — no connector has failed across 2+ consecutive cycles.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Email notification dispatched to Platform Admin per AC#5 — connector failure persisting across 2+ consecutive cycles.
          </p>
          <EmailNotificationPreview
            failedConnectors={failedConnectors}
            profileId={profileId}
            sentAt={sentAt}
          />
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConnectorFailure({ profileId: profileIdProp, runId: runIdProp, brand: brandProp }) {
  const [activeTab, setActiveTab] = useState("connectors");
  const [showModal, setShowModal] = useState(false);

  // Backend-sourced state — every field replaces a previously hardcoded one.
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [run,        setRun]        = useState(null);   // GET /ingestion/{run_id}
  const [status,     setStatus]     = useState(null);   // GET /profile/{id}/status
  const [auditRaw,   setAuditRaw]   = useState([]);     // GET /profile/{id}/audit
  const [claimsCount,setClaimsCount]= useState(0);      // from claims_inventory
  const [activated,  setActivated]  = useState(false);
  const [ackBusy,    setAckBusy]    = useState(false);
  const [ackError,   setAckError]   = useState(null);
  const [rerunBusy,  setRerunBusy]  = useState(false);

  // AC#6 — connector recovery. `recoveredNames` drives the green banner and the
  // amber "Recovering" rows; `reingesting` is true while the auto re-ingestion
  // runs. `prevFailedRef` holds the previous poll's failed set so we can detect
  // a connector dropping out of unavailable_connectors. `reingestingRef` mirrors
  // `reingesting` so the poll loop can read it without a stale closure.
  const [recoveredNames, setRecoveredNames] = useState([]);
  const [reingesting,    setReingesting]    = useState(false);
  const prevFailedRef  = useRef(null);
  const reingestingRef = useRef(false);

  // AC#6 — when a previously-failed connector recovers (no longer reported in
  // unavailable_connectors), automatically trigger a re-ingestion for the
  // source and refresh the profile status so coverage updates accordingly.
  const triggerRecovery = useCallback(async (names, pid, s) => {
    reingestingRef.current = true;
    setRecoveredNames(names);
    setReingesting(true);
    try {
      if (pid) {
        await runIncrementalRefresh(pid, CURRENT_USER, {
          brand: s?.brand,
          indication: s?.indication,
        });
      }
    } catch (err) {
      console.warn("[ConnectorFailure] auto re-ingestion failed:", err);
    } finally {
      // Re-read status so the profile/partial state reflects the recovered source.
      if (pid) {
        try {
          const ns = (await getProfileStatus(pid))?.data || null;
          setStatus(ns);
          setActivated(ns?.status === "active");
          prevFailedRef.current = failedNameSet(ns);
        } catch { /* status refresh failed — keep prior state */ }
      }
      setReingesting(false);
      reingestingRef.current = false;
    }
  }, []);

  // ── Loader ─────────────────────────────────────────────────────────────────
  // `silent` skips the loading spinner — used by the background recovery poll
  // so the panel doesn't flash "Loading…" every interval.
  const loadConsole = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      // 1) Resolve the ingestion run (explicit prop → that run; else latest).
      let runData = null;
      try {
        if (runIdProp) {
          runData = (await getRun(runIdProp))?.data || null;
        } else {
          const runs = (await listRuns())?.data;
          const list = Array.isArray(runs) ? runs : runs?.runs || [];
          const latestId = list[0]?.run_id || list[0]?.id;
          runData = latestId ? (await getRun(latestId))?.data || list[0] : list[0] || null;
        }
      } catch (err) {
        console.warn("[ConnectorFailure] run lookup failed:", err);
      }
      setRun(runData);

      // 2) Resolve the profile id: prop → run → active profile for the brand.
      let pid = profileIdProp || runData?.profile_id || null;
      if (!pid) {
        try {
          const active = (await getActiveProfile(brandProp))?.data;
          pid = active?.profile_id || null;
        } catch { /* no active profile yet — tolerated */ }
      }

      // 3) Profile status (is_partial, unavailable_connectors, brand, ...).
      if (pid) {
        try {
          const s = (await getProfileStatus(pid))?.data || null;
          setStatus(s);
          setActivated(s?.status === "active");

          // AC#6 — recovery detection. Compare this poll's failed set against
          // the previous one; any connector that dropped out has recovered, so
          // kick off the automatic re-ingestion (unless one is already running).
          const newFailed = failedNameSet(s);
          const prev = prevFailedRef.current;
          if (prev && !reingestingRef.current) {
            const recovered = [...prev].filter((n) => !newFailed.has(n));
            if (recovered.length > 0) {
              triggerRecovery(recovered, pid, s);
            }
          }
          prevFailedRef.current = newFailed;
        } catch (err) {
          console.warn("[ConnectorFailure] getProfileStatus failed:", err);
          setStatus(null);
        }

        // 4) Claims count from the draft profile's claims_inventory.
        try {
          const p = (await getProfile(pid))?.data || null;
          setClaimsCount(getClaimsCount(p));
        } catch (err) {
          console.warn("[ConnectorFailure] getProfile failed:", err);
          setClaimsCount(0);
        }

        // 5) Audit log.
        try {
          const a = (await getAudit(pid))?.data;
          setAuditRaw(Array.isArray(a) ? a : []);
        } catch (err) {
          console.warn("[ConnectorFailure] getAudit failed:", err);
          setAuditRaw([]);
        }
      } else {
        setStatus(null);
        setClaimsCount(0);
        setAuditRaw([]);
      }

      if (!runData && !pid) {
        setLoadError("No ingestion run or active profile found. Run an ingestion cycle to populate the console.");
      }
    } catch (err) {
      console.warn("[ConnectorFailure] loadConsole failed:", err);
      setLoadError(readErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [profileIdProp, runIdProp, brandProp, triggerRecovery]);

  // Initial load (with spinner).
  useEffect(() => { loadConsole(false); }, [loadConsole]);

  // AC#6 — background poll (silent) so connector recovery is detected and
  // re-ingestion fires automatically, without the user clicking Re-run.
  useEffect(() => {
    const id = setInterval(() => {
      if (!reingestingRef.current) loadConsole(true);
    }, 20000);
    return () => clearInterval(id);
  }, [loadConsole]);

  // ── Derived ids / values ─────────────────────────────────────────────────
  const profileId = profileIdProp || run?.profile_id || status?.profile_id || null;
  const brand     = status?.brand || brandProp || null;
  const runId     = run?.run_id || runIdProp || null;

  const perDocument = run?.change_summary?.per_document || [];
  const warnings    = run?.warnings || [];
  const unavailable = status?.unavailable_connectors || [];
  const isPartial   = status?.is_partial ?? unavailable.length > 0;

  const failedNames = new Set((unavailable || []).map((c) => normalizeFailedConnector(c).name));

  // ── Derived display collections (replace the old module constants) ────────
  // While a recovery re-ingestion is in flight, the recovered names render with
  // the amber "Recovering" status; once it settles they fall back to ok/absent.
  const recoveringSet = reingesting ? new Set(recoveredNames) : new Set();
  const connectors = buildConnectors(perDocument, unavailable, recoveringSet);
  const documents  = buildDocuments(perDocument, warnings, failedNames);
  const auditEntries = buildAuditEntries(auditRaw);

  const failedConnectors = connectors.filter((c) => c.status === "failed");
  const docCountTotal = documents.length || run?.document_count || 0;
  const docsProcessed = documents.filter((d) => d.status === "ok").length;
  const parseErrors   = documents.filter((d) => d.status === "error").length;
  const zeroClaims    = !!profileId && claimsCount === 0;

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleActivate = async () => {
    if (!profileId || ackBusy) return;
    setAckBusy(true);
    setAckError(null);
    try {
      await acknowledgePartialProfile(profileId, CURRENT_USER);
      setActivated(true);
      setShowModal(false);
      await loadConsole();
    } catch (err) {
      console.warn("[ConnectorFailure] acknowledgePartialProfile failed:", err);
      setAckError(readErrorMessage(err));
    } finally {
      setAckBusy(false);
    }
  };

  const handleRerun = async () => {
    if (rerunBusy) return;
    setRerunBusy(true);
    try {
      if (profileId) {
        await runIncrementalRefresh(profileId, CURRENT_USER, {
          brand: status?.brand,
          indication: status?.indication,
        });
      }
    } catch (err) {
      console.warn("[ConnectorFailure] re-run cycle failed:", err);
    } finally {
      await loadConsole();
      setRerunBusy(false);
    }
  };

  // Export the audit log as a downloadable JSON file (client-side, no backend).
  const handleExport = () => {
    const payload = JSON.stringify(auditRaw, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingestion-audit-${runId || profileId || "log"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: "connectors",    label: "Connectors",    count: connectors.length,   errorCount: failedConnectors.length },
    { id: "documents",     label: "Documents",     count: documents.length,    errorCount: parseErrors },
    { id: "audit",         label: "Audit Log",     count: auditEntries.length, errorCount: 0 },
    { id: "notifications", label: "Notifications", count: 1,                   errorCount: failedConnectors.filter((c) => c.consecutiveCycles >= 2).length },
  ];

  return (
    <div className="cf-app">

      {/* ── Nav Bar ── */}
      <nav className="cf-nav">
        <div className="cf-nav__brand">
          <div className="cf-nav__logo">B</div>
          BrandIQ Platform
          <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>/</span>
          <span style={{ color: "var(--text-secondary)", fontWeight: 400, fontSize: 13 }}>
            Ingestion Console
          </span>
        </div>
        <div className="cf-nav__right">
          <span className="cf-nav__role-badge">Platform Admin</span>
          <div
            className="cf-nav__notif"
            onClick={() => setActiveTab("notifications")}
            title="Admin alerts"
          >
            🔔
            {failedConnectors.some((c) => c.consecutiveCycles >= 2) && <span className="cf-nav__notif-dot" />}
          </div>
        </div>
      </nav>

      <div className="cf-main">

        {/* ── Page Header ── */}
        <div className="cf-page-header">
          <div>
            <h1 className="cf-page-header__title">Connector Failure &amp; Ingestion Console</h1>
            <p className="cf-page-header__sub">
              {runId ? `Ingestion Cycle #${runId}` : "No ingestion cycle"}
              {profileId ? ` · Profile: ${profileId}` : ""}
              {brand ? ` · ${brand}` : ""}
            </p>
          </div>
          <div className="cf-page-header__actions">
            <button className="btn btn--ghost" onClick={handleRerun} disabled={rerunBusy}>
              {rerunBusy ? "↻ Re-running…" : "↻ Re-run Cycle"}
            </button>
            <button className="btn btn--ghost" onClick={handleExport} disabled={auditRaw.length === 0}>
              Export Log
            </button>
          </div>
        </div>

        {/* ── Loading / error states ── */}
        {loading && (
          <div className="cf-empty">Loading ingestion console…</div>
        )}
        {!loading && loadError && (
          <div className="cf-alert cf-alert--warning" style={{ marginBottom: 20 }}>
            <span className="cf-alert__icon">⚠️</span>
            <div className="cf-alert__body">
              <p className="cf-alert__title">Could not load ingestion console</p>
              <p className="cf-alert__desc">{loadError}</p>
            </div>
          </div>
        )}

        {!loading && (
        <>
        {/* ── AC#6 — Recovery Banner (a previously-failed connector recovered) ── */}
        {recoveredNames.length > 0 && (
          <div className="cf-recovery">
            <span className="cf-recovery__icon">✅</span>
            <div className="cf-recovery__body">
              <p className="cf-recovery__title">
                {recoveredNames.join(", ")} connector
                {recoveredNames.length > 1 ? "s" : ""} recovered — auto re-ingestion triggered (AC#6)
              </p>
              <p className="cf-recovery__sub">
                {reingesting
                  ? "Previously unavailable source is being re-ingested. Profile status will update automatically on completion."
                  : "Re-ingestion complete — profile status has been updated to reflect the restored source."}
              </p>
            </div>
            {reingesting && (
              <div className="cf-recovery__progress">
                <div className="cf-recovery__progress-fill" />
              </div>
            )}
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="cf-stats">
          {[
            { label: "Total Connectors",  value: connectors.length,    sub: "polled this cycle",        accent: "default" },
            { label: "Failed Connectors", value: failedConnectors.length, sub: "require attention",     accent: "danger"  },
            { label: "Docs Processed",    value: docsProcessed,        sub: `of ${docCountTotal} total`, accent: "green"   },
            { label: "Parse Errors",      value: parseErrors,          sub: "unsupported formats",      accent: "warning" },
            { label: "Claims Extracted",  value: claimsCount,          sub: "from parseable sources",   accent: zeroClaims ? "danger" : "default" },
          ].map((m) => (
            <div key={m.label} className="cf-stat-card">
              <p className="cf-stat-card__label">{m.label}</p>
              <p className={`cf-stat-card__value cf-stat-card__value--${m.accent}`}>{m.value}</p>
              <p className="cf-stat-card__sub">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── AC#4 — Zero Claims: activation blocked ── */}
        {zeroClaims && <ZeroClaimsBlock />}

        {/* ── Profile Status Bar (AC#1c, AC#2) ── */}
        {profileId && (
          <div className={`cf-profile-status ${activated && !isPartial ? "" : "cf-profile-status--partial"}`}>
            <div className="cf-profile-status__left">
              <p className="cf-profile-status__label">Profile Status</p>
              <p className="cf-profile-status__name">
                {brand ? `${brand} — Global Brand Intelligence Profile` : "Brand Intelligence Profile"}
              </p>
              <p className="cf-profile-status__meta">
                {activated
                  ? "Activated with acknowledged partial coverage — logged to audit trail."
                  : isPartial
                    ? `Partial — ${failedConnectors.map((c) => c.name).join(", ") || "some sources"} unavailable`
                    : "All sources available."
                }
              </p>
            </div>
            <div className="cf-profile-status__right">
              {activated ? (
                <StatusPill status={isPartial ? "partial" : "ok"} />
              ) : (
                <>
                  <StatusPill status={isPartial ? "partial" : "ok"} />
                  {isPartial && !zeroClaims && (
                    <button
                      className="btn btn--warning"
                      onClick={() => setShowModal(true)}
                    >
                      Activate with Acknowledgement
                    </button>
                  )}
                  {zeroClaims && (
                    <button className="btn btn--danger" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
                      Activation Blocked
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {ackError && (
          <div className="cf-alert cf-alert--warning" style={{ marginBottom: 20 }}>
            <span className="cf-alert__icon">⚠️</span>
            <div className="cf-alert__body">
              <p className="cf-alert__title">Activation failed</p>
              <p className="cf-alert__desc">{ackError}</p>
            </div>
          </div>
        )}

        {/* ── Main Section: Tabbed Console ── */}
        <div className="cf-section">
          {/* Tabs */}
          <div className="cf-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`cf-tab-btn ${activeTab === tab.id ? "cf-tab-btn--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span className={`cf-tab-count ${activeTab === tab.id ? "cf-tab-count--active" : ""}`}>
                  {tab.errorCount > 0 ? `${tab.errorCount} ⚠` : tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "connectors"    && <ConnectorsTab    connectors={connectors} />}
          {activeTab === "documents"     && <DocumentsTab     documents={documents} />}
          {activeTab === "audit"         && <AuditTab         entries={auditEntries} />}
          {activeTab === "notifications" && (
            <NotificationsTab
              failedConnectors={failedConnectors}
              profileId={profileId}
              sentAt={run?.created_at || run?.started_at || status?.last_refreshed_at}
            />
          )}
        </div>
        </>
        )}

      </div>

      {/* ── AC#2 — Acknowledge Partial Activation Modal ── */}
      {showModal && (
        <AcknowledgeModal
          failedConnectors={failedConnectors}
          onClose={() => setShowModal(false)}
          onConfirm={handleActivate}
          busy={ackBusy}
        />
      )}

    </div>
  );
}
