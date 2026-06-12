// Modified by Sanju Kumari — 2026-06-03: removed every hardcoded constant
// (MOCK_CHANGES / DOWNSTREAM_ATOMS / REFRESH_HISTORY / DAYS_SINCE_REFRESH /
// "Sara Chen" / "Horizon Brand Co." / "BIP-2024-HBC-001") and wired the
// panel to the real intelligence-hub-api US 1.5 endpoints:
//
//   - GET  /profile/{id}/status         → status pill + days_since_refresh + version
//   - POST /ingestion/refresh           → run incremental refresh, returns change_summary
//   - GET  /profile/{id}                → per-section change_status annotations
//   - GET  /atoms?profile_version_id=…  → downstream atoms flagged for review
//   - GET  /profile/versions?brand=…    → refresh / activation history
//   - POST /profile/{id}/activate       → re-approve (resets BR-SIH-001 90-day clock)
//   - GET  /profile/active/can-generate → BR-SIH-001/002 gate banner
//
// UI structure (sub-components, JSX layout, CSS class names) is preserved.
// Sub-components now take real data as props instead of pulling from module
// constants. Fields the backend doesn't supply (per-change severity,
// per-change affected-atom counts) are derived where reasonable, omitted
// gracefully where not.
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getRefreshStatus,
  runIncrementalRefresh,
  getProfileChanges,
  getDownstreamImpact,
  reapproveStaleProfile,
  listVersions,
} from "../api/intelligenceHubApi";
import "./IntelligenceCss/BrandIncrementalProfile.css";

// Audit identity for refresh + re-approve actions. Same convention as the
// rest of the Intelligence Hub — env override, generic fallback.
const CURRENT_USER =
  process.env.REACT_APP_CURRENT_USER || "intelligence-hub-reviewer";

const EXPIRY_DAYS = 90;

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
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function formatRelative(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.round(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)} hr ago`;
  return `${Math.round(secs / 86400)} d ago`;
}

// Backend section keys → human-readable category labels.
const SECTION_LABELS = {
  messaging_pillars:    "Messaging Pillars",
  tone_parameters:      "Tone Parameters",
  claims_inventory:     "Brand Claims",
  prohibited_territory: "Prohibited Territory",
};

// Backend change_status → UI severity. removed = high-impact (downstream
// content may now misrepresent the brand), added = medium, changed = medium.
function severityFromStatus(status) {
  if (status === "removed") return "high";
  if (status === "changed") return "medium";
  if (status === "added")   return "medium";
  return "low";
}

// Pull a human label out of an item — section items are heterogeneous
// (claim text vs pillar title vs tone label etc.).
function itemLabel(it) {
  if (!it || typeof it !== "object") return String(it ?? "");
  return it.title || it.label || it.text || it.pattern || it.claim_id || it.name || "(item)";
}

// Convert the backend's per-document + per-section change rollups into the
// flat change-card shape the UI renders. One card per per-document delta,
// plus one card per section that has any added/changed/removed counts.
function buildChangeCards(refreshSummary, changesPayload) {
  const cards = [];
  const perDoc = refreshSummary?.change_summary?.per_document || [];

  perDoc.forEach((doc, i) => {
    if (!doc.change_status || doc.change_status === "unchanged") return;
    const statusReason =
      doc.change_status === "added"
        ? "This document is new in the current ingestion — it wasn't present when the prior version was active."
        : doc.change_status === "removed"
        ? "This document was part of the prior active version's source set but is no longer in the current ingestion scope. Could be: (a) removed from Veeva, (b) excluded by the scope filter, (c) deleted from the local catalog before refresh."
        : "The document's content hash differs from the version that was active — its text was edited or replaced upstream.";
    const severityReason =
      doc.change_status === "removed"
        ? "Removal is rated HIGH because downstream content generated under the prior version may have cited this source — those atoms need re-review."
        : doc.change_status === "added"
        ? "Additions are rated MEDIUM — new source material expands brand truth but doesn't invalidate existing content."
        : "Modifications are rated MEDIUM — existing citations may now point at outdated wording.";
    cards.push({
      id: `doc-${doc.document_id || i}`,
      category: "Source Document",
      field: doc.name || doc.document_id || "Unknown document",
      documentId: doc.document_id,
      sourceConnector: doc.source,
      type:
        doc.change_status === "added"   ? "added" :
        doc.change_status === "removed" ? "removed" :
                                          "modified",
      previous: doc.change_status === "added"   ? null : (doc.name || doc.document_id),
      current:  doc.change_status === "removed" ? null : (doc.name || doc.document_id),
      severity: severityFromStatus(doc.change_status),
      statusReason,
      severityReason,
      affectedAtoms: 0,
    });
  });

  const sections = changesPayload?.sections || {};
  Object.entries(sections).forEach(([key, sec]) => {
    if (!sec) return;
    const annot = sec.change_summary || {};
    const totals = annot.totals || {};
    const items = annot.items || [];

    // Per-item annotations (when the backend supplies them).
    items.forEach((item, i) => {
      if (!item || item.change_status === "unchanged") return;
      cards.push({
        id: `${key}-item-${i}`,
        category: SECTION_LABELS[key] || key,
        field: itemLabel(item.next || item.previous || item),
        type:
          item.change_status === "added"   ? "added" :
          item.change_status === "removed" ? "removed" :
                                             "modified",
        previous: item.previous ? itemLabel(item.previous) : null,
        current:  item.next     ? itemLabel(item.next)     : null,
        severity: severityFromStatus(item.change_status),
        affectedAtoms: 0,
      });
    });

    // Fall back to a single roll-up card per section when the backend
    // didn't break it down per-item.
    if (items.length === 0) {
      const added   = Number(totals.added   || 0);
      const changed = Number(totals.changed || 0);
      const removed = Number(totals.removed || 0);
      if (added + changed + removed === 0) return;
      cards.push({
        id: `${key}-rollup`,
        category: SECTION_LABELS[key] || key,
        field: `${added} added · ${changed} changed · ${removed} removed`,
        type: removed > 0 ? "removed" : added > 0 ? "added" : "modified",
        previous: null,
        current: null,
        severity:
          removed > 0 ? "high" :
          changed > 0 ? "medium" :
                        "low",
        affectedAtoms: 0,
      });
    }
  });

  return cards;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ type }) {
  return <span className={`badge badge--${type}`}>{type}</span>;
}

function SeverityDot({ severity }) {
  return <span className={`severity-dot severity-dot--${severity}`} />;
}

function AtomStatusBadge({ status }) {
  const labels = {
    flagged:            "Review Required",
    review_recommended: "Review Required",
    reviewing:          "In Review",
    approved:           "Approved",
    fresh:              "Fresh",
    obsolete:           "Obsolete",
  };
  const cls =
    status === "review_recommended" ? "flagged" :
    status === "obsolete"           ? "flagged" :
    status === "fresh"              ? "approved" :
                                       status;
  return <span className={`atom-badge atom-badge--${cls}`}>{labels[status] || status}</span>;
}

function ExpiryCountdown({ daysRemaining, expiryDays }) {
  const safeDays = Math.max(0, Number(daysRemaining) || 0);
  const pct   = Math.max(0, (safeDays / (expiryDays || EXPIRY_DAYS)) * 100);
  // Three-stage urgency mapping vs the 90-day BR-SIH-001 limit:
  //   ≤  5 days remaining (≥85 since refresh) → danger / red
  //   ≤ 20 days remaining (≥70 since refresh) → warning / amber
  //   otherwise                               → safe / green
  // The thresholds give the Brand Manager three weeks of visible warning
  // before content generation is hard-blocked, and a final escalated red
  // state in the last business week.
  const level = safeDays <= 5 ? "danger" : safeDays <= 20 ? "warning" : "safe";
  return (
    <div className="expiry-bar-wrapper">
      <div className="expiry-bar-track">
        <div
          className={`expiry-bar-fill expiry-bar-fill--${level}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`expiry-bar-label expiry-bar-label--${level}`}>
        {safeDays}d left
      </span>
    </div>
  );
}

function ChangeCard({ change, expanded, onToggle }) {
  const hasBoth = change.previous && change.current;
  return (
    <div
      className={`bir-change-card bir-change-card--${change.severity}`}
      onClick={onToggle}
      role="button"
      aria-expanded={expanded}
    >
      <div className="bir-change-card__header">
        <SeverityDot severity={change.severity} />
        <span className="bir-change-card__category">{change.category}</span>
        <span className="bir-change-card__field">{change.field}</span>
        <Badge type={change.type} />
        {change.affectedAtoms > 0 && (
          <span className="bir-change-card__atoms">{change.affectedAtoms} atoms affected</span>
        )}
        <span className="bir-change-card__chevron">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "10px 14px 14px" }}>
          {/* Why-this-is-flagged explainer — plain English, surfaced in
              the expanded card so the operator never has to wonder what
              the cryptic "removed" badge actually means. */}
          {change.statusReason && (
            <div style={{
              padding: "8px 10px",
              marginBottom: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              fontSize: 12,
              color: "#475569",
              lineHeight: 1.45,
            }}>
              <strong style={{ color: "#0f172a" }}>What this means: </strong>
              {change.statusReason}
            </div>
          )}
          {change.severityReason && (
            <div style={{
              padding: "8px 10px",
              marginBottom: 10,
              background: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: 6,
              fontSize: 12,
              color: "#92400e",
              lineHeight: 1.45,
            }}>
              <strong>Severity: {String(change.severity || "").toUpperCase()} — </strong>
              {change.severityReason}
            </div>
          )}
          {(change.documentId || change.sourceConnector) && (
            <div style={{
              padding: "8px 10px",
              marginBottom: 10,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "#475569",
              lineHeight: 1.5,
            }}>
              {change.documentId && (<>document_id: <span style={{ color: "#0f172a" }}>{change.documentId}</span><br /></>)}
              {change.sourceConnector && (<>source: <span style={{ color: "#0f172a" }}>{change.sourceConnector}</span></>)}
            </div>
          )}
          <div className={`bir-change-card__diff ${hasBoth ? "bir-change-card__diff--two-col" : "bir-change-card__diff--one-col"}`}>
            {change.previous && (
              <div className="bir-diff-box bir-diff-box--previous">
                <p className="bir-diff-box__label bir-diff-box__label--previous">Previous</p>
                <p className="bir-diff-box__value bir-diff-box__value--previous">{change.previous}</p>
              </div>
            )}
            {change.current && (
              <div className="bir-diff-box bir-diff-box--current">
                <p className="bir-diff-box__label bir-diff-box__label--current">New value</p>
                <p className="bir-diff-box__value bir-diff-box__value--current">{change.current}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, label }) {
  return (
    <button
      className={`btn--pill ${active ? "btn--pill-active" : "btn--pill-inactive"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function ChangesTab({ changes }) {
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType,     setFilterType]     = useState("all");
  const [expandedCard,   setExpandedCard]   = useState(null);

  const filtered = changes.filter((c) => {
    if (filterSeverity !== "all" && c.severity !== filterSeverity) return false;
    if (filterType     !== "all" && c.type     !== filterType)     return false;
    return true;
  });

  const severityOptions = ["all", "high", "medium", "low"];
  const typeOptions     = ["all", "added", "modified", "removed"];

  return (
    <div>
      <div className="bir-filter-bar">
        <span className="bir-filter-bar__label">Filter:</span>
        {severityOptions.map((s) => (
          <FilterButton
            key={s}
            active={filterSeverity === s}
            onClick={() => setFilterSeverity(s)}
            label={s === "all" ? "All severity" : s.charAt(0).toUpperCase() + s.slice(1)}
          />
        ))}
        <div className="bir-filter-bar__divider" />
        {typeOptions.map((t) => (
          <FilterButton
            key={t}
            active={filterType === t}
            onClick={() => setFilterType(t)}
            label={t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}
          />
        ))}
      </div>

      <div className="bir-change-list">
        {changes.length === 0 ? (
          <p className="bir-empty">
            No changes detected yet. Run an incremental refresh to surface
            what changed since the active version.
          </p>
        ) : filtered.length === 0 ? (
          <p className="bir-empty">No changes match the selected filters.</p>
        ) : (
          filtered.map((change) => (
            <ChangeCard
              key={change.id}
              change={change}
              expanded={expandedCard === change.id}
              onToggle={() =>
                setExpandedCard(expandedCard === change.id ? null : change.id)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function AtomsTab({ atoms }) {
  return (
    <div>
      <p className="bir-atoms-desc">
        Content atoms generated from the prior profile version that require Brand Manager review.
      </p>
      <div className="bir-atom-list">
        {atoms.length === 0 ? (
          <p className="bir-empty">
            No downstream content atoms flagged for review.
          </p>
        ) : (
          atoms.map((atom) => (
            <div key={atom.atom_id} className="bir-atom-row">
              <span className="bir-atom-row__id">{atom.atom_id}</span>
              <div className="bir-atom-row__info">
                <p className="bir-atom-row__name">{atom.title || atom.atom_id}</p>
                <p className="bir-atom-row__type">{atom.atom_type}</p>
              </div>
              <AtomStatusBadge status={atom.state} />
              <span className="bir-atom-row__time">
                flagged {formatRelative(atom.flagged_at || atom.generated_at)}
              </span>
              <button className="btn--ghost">Review</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryTab({ history }) {
  if (history.length === 0) {
    return (
      <div className="bir-history-list">
        <p className="bir-empty">
          No activated versions yet. Activate a profile to start the version history.
        </p>
      </div>
    );
  }
  return (
    <div className="bir-history-list">
      {history.map((r, i) => {
        const counts = r.section_counts || {};
        const totalChanges = (counts.accepted || 0) + (counts.edited || 0) + (counts.flagged || 0);
        const status = r.is_current ? "active" : i === 0 ? "draft" : "superseded";
        return (
          <div
            key={r.version_id || r.version_number}
            className={`bir-history-row ${status === "draft" ? "bir-history-row--draft" : ""}`}
          >
            <span className="bir-history-row__version">v{r.version_number}</span>
            <span className="bir-history-row__date">{formatTimestamp(r.activated_at)}</span>
            <span className="type-badge type-badge--incremental">Activation</span>
            <span className="bir-history-row__changes">{totalChanges} section actions</span>
            <span className="bir-history-row__approved">Approved: {r.activated_by || "—"}</span>
            <span className={`history-status history-status--${status}`}>{status}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Diagnostic Logs Tab ───────────────────────────────────────────────────
   Surfaces the raw signal that drives the Change Delta cards so the user
   can answer "why is this here / why is it this severity" without opening
   DevTools. Renders:
     · Last refresh summary (status, document count, raw change rollup)
     · Per-document delta (one row per source doc, with current change_status)
     · Most-recent backend errors (status or refresh)
*/
function DiagnosticLogsTab({ status, refreshSummary, runError, statusError, changes }) {
  const perDoc = refreshSummary?.change_summary?.per_document || [];
  const cs     = refreshSummary?.change_summary;
  const sectionBreakdown = changes.reduce((acc, c) => {
    const sev = c.severity || "low";
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});

  // ── Export helpers ────────────────────────────────────────────────────────
  // The payload is a single self-contained snapshot of everything visible
  // on this tab — safe to share with support or attach to a ticket.
  const buildExportPayload = () => ({
    exported_at:     new Date().toISOString(),
    exported_by:     "intelligence-hub-frontend",
    profile_status:  status || null,
    refresh_summary: refreshSummary || null,
    per_document:    perDoc,
    change_delta:    changes,
    severity_breakdown: {
      high:   sectionBreakdown.high   || 0,
      medium: sectionBreakdown.medium || 0,
      low:    sectionBreakdown.low    || 0,
    },
    errors: {
      status_error:  statusError || null,
      refresh_error: runError    || null,
    },
  });

  const exportFilenameBase = () => {
    const pid   = status?.profile_id || "no-profile";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `brand-intelligence-refresh-${pid.slice(0, 8)}-${stamp}`;
  };

  const exportAsJson = () => {
    const blob = new Blob(
      [JSON.stringify(buildExportPayload(), null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url;
    a.download = `${exportFilenameBase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // PDF export = open a clean printable HTML view in a popup, then trigger
  // the browser's Print dialog. The user picks "Save as PDF" from there.
  // Avoids adding a heavy PDF library (jsPDF / pdfmake / etc.) to the bundle.
  const exportAsPdf = () => {
    const payload = buildExportPayload();
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      alert("Pop-up was blocked. Allow pop-ups for this site to export PDF.");
      return;
    }
    const esc = (v) => {
      if (v == null) return "";
      if (typeof v === "object") return JSON.stringify(v, null, 2);
      return String(v);
    };
    const row = (label, value) =>
      `<tr><td style="padding:4px 10px 4px 0;color:#64748b;width:200px">${esc(label)}</td>
        <td style="padding:4px 0;color:#0f172a;word-break:break-all">${esc(value)}</td></tr>`;
    const docRow = (d) =>
      `<tr>
         <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0">${esc(d.name || d.document_id || "—")}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#475569">${esc(d.document_id)}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0">${esc(d.source)}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;font-weight:600;font-size:11px">${esc(d.change_status)}</td>
       </tr>`;
    const changeRow = (c) =>
      `<tr>
         <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0">${esc(c.category)}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0">${esc(c.field)}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;font-weight:600;font-size:11px">${esc(c.type)}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;font-weight:600;font-size:11px;color:${
           c.severity === "high" ? "#b91c1c" : c.severity === "medium" ? "#b45309" : "#475569"
         }">${esc(c.severity)}</td>
       </tr>`;
    w.document.write(`<!doctype html>
<html><head><meta charset="utf-8">
<title>Brand Intelligence Refresh — Diagnostic Log</title>
<style>
  body { font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color:#0f172a; padding:24px 32px; max-width:880px; margin:0 auto; }
  h1 { font-size:22px; font-weight:800; letter-spacing:-0.01em; margin:0 0 4px; }
  h2 { font-size:13px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin:24px 0 10px; }
  .meta { color:#64748b; font-size:12px; margin-bottom:18px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { text-align:left; padding:6px 10px; background:#f8fafc; border-bottom:1px solid #cbd5e1; font-weight:700; color:#475569; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; }
  .high   { background:#fef2f2; color:#b91c1c; }
  .medium { background:#fef3c7; color:#b45309; }
  .low    { background:#f1f5f9; color:#475569; }
  @media print { body { padding:0; max-width:none;} }
</style></head><body>
<h1>Brand Intelligence Refresh — Diagnostic Log</h1>
<div class="meta">Exported: ${esc(payload.exported_at)} · Profile: ${esc(status?.profile_id)} · Brand: ${esc(status?.brand)} · Version: v${esc(status?.version_number)}</div>

<h2>Profile Status</h2>
<table><tbody>
  ${row("Status", status?.status)}
  ${row("Version", status?.version_number ? `v${status.version_number}` : "—")}
  ${row("Last activated", status?.last_activated_at)}
  ${row("Last refreshed", status?.last_refreshed_at)}
  ${row("Days since refresh", status?.days_since_refresh)}
  ${row("Refresh required", String(status?.refresh_required))}
  ${row("Is partial", String(status?.is_partial))}
</tbody></table>

<h2>Last Refresh Summary</h2>
${refreshSummary ? `<table><tbody>
  ${row("Run ID", refreshSummary.run_id)}
  ${row("Status", refreshSummary.status)}
  ${row("Triggered by", refreshSummary.triggered_by)}
  ${row("Started at", refreshSummary.started_at)}
  ${row("Completed at", refreshSummary.completed_at)}
  ${row("Doc count", refreshSummary.document_count)}
  ${row("Prior version", refreshSummary.previous_version_id)}
  ${cs ? `
    ${row("Docs added", cs.added)}
    ${row("Docs changed", cs.changed)}
    ${row("Docs removed", cs.removed)}
    ${row("Docs unchanged", cs.unchanged)}
    ${row("Is no-op", String(cs.is_no_op))}
    ${row("Summary", cs.summary)}
  ` : ""}
</tbody></table>` : `<p style="color:#64748b">No refresh has been run yet.</p>`}

<h2>Severity Breakdown</h2>
<p>
  <span class="badge high">HIGH ${esc(payload.severity_breakdown.high)}</span>
  <span class="badge medium">MEDIUM ${esc(payload.severity_breakdown.medium)}</span>
  <span class="badge low">LOW ${esc(payload.severity_breakdown.low)}</span>
</p>

<h2>Per-Document Delta (${perDoc.length})</h2>
${perDoc.length > 0 ? `<table>
  <thead><tr><th>Name</th><th>Document ID</th><th>Source</th><th>Status</th></tr></thead>
  <tbody>${perDoc.map(docRow).join("")}</tbody>
</table>` : `<p style="color:#64748b">No per-document delta — run a refresh first.</p>`}

<h2>Change Delta (${changes.length})</h2>
${changes.length > 0 ? `<table>
  <thead><tr><th>Category</th><th>Field</th><th>Type</th><th>Severity</th></tr></thead>
  <tbody>${changes.map(changeRow).join("")}</tbody>
</table>` : `<p style="color:#64748b">No changes in the current delta.</p>`}

${(runError || statusError) ? `<h2>Backend Errors</h2>
<table><tbody>
  ${statusError ? row("/status", statusError) : ""}
  ${runError    ? row("/ingestion/refresh", runError) : ""}
</tbody></table>` : ""}

</body></html>`);
    w.document.close();
    // Give the popup a tick to render before kicking off Print.
    setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 150);
  };

  const Box = ({ title, children }) => (
    <div style={{
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      background: "#ffffff",
      marginBottom: 14,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "9px 14px",
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        fontSize: 11,
        fontWeight: 700,
        color: "#475569",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}>{title}</div>
      <div style={{ padding: "12px 14px", fontSize: 13, color: "#0f172a", lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ label, value, mono }) => (
    <div style={{ display: "flex", gap: 12, padding: "3px 0" }}>
      <div style={{ flex: "0 0 180px", fontSize: 13, color: "#64748b" }}>{label}</div>
      <div style={{
        flex: "1 1 auto",
        fontSize: 13,
        color: "#0f172a",
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
        wordBreak: "break-all",
      }}>{value ?? <span style={{ color: "#94a3b8" }}>—</span>}</div>
    </div>
  );

  return (
    <div>
      {/* Export toolbar — JSON for machine-readable handoff to support,
          PDF for human-readable handoff to stakeholders. Both build the
          same payload internally so what you see in the tab equals what
          ends up in the file. */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        marginBottom: 14,
      }}>
        <button
          type="button"
          onClick={exportAsJson}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 7,
            color: "#0f172a",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
          title="Download all diagnostic data as a JSON file"
        >
          ⬇ Export as JSON
        </button>
        <button
          type="button"
          onClick={exportAsPdf}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            background: "#4f46e5",
            border: "1px solid #4f46e5",
            borderRadius: 7,
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
          title="Open a printable view and use your browser's Save as PDF"
        >
          ⬇ Export as PDF
        </button>
      </div>

      {(runError || statusError) && (
        <Box title="Recent backend errors">
          {statusError && (
            <div style={{ marginBottom: 8, color: "#b91c1c" }}>
              <strong>/status:</strong> {statusError}
            </div>
          )}
          {runError && (
            <div style={{ color: "#b91c1c" }}>
              <strong>/ingestion/refresh:</strong> {runError}
            </div>
          )}
        </Box>
      )}

      <Box title="Last refresh summary">
        {!refreshSummary ? (
          <div style={{ color: "#64748b" }}>
            No refresh has been run in this session yet. Click <strong>Run Incremental Refresh</strong> to populate this log.
          </div>
        ) : (
          <>
            <Row label="Run ID"        value={refreshSummary.run_id} mono />
            <Row label="Status"        value={refreshSummary.status} />
            <Row label="Triggered by"  value={refreshSummary.triggered_by} />
            <Row label="Started at"    value={refreshSummary.started_at}   mono />
            <Row label="Completed at"  value={refreshSummary.completed_at} mono />
            <Row label="Doc count"     value={refreshSummary.document_count} />
            <Row label="Profile ID"    value={refreshSummary.profile_id} mono />
            <Row label="Prior version" value={refreshSummary.previous_version_id} mono />
            {cs && (
              <>
                <Row label="Docs added"     value={cs.added ?? 0} />
                <Row label="Docs changed"   value={cs.changed ?? 0} />
                <Row label="Docs removed"   value={cs.removed ?? 0} />
                <Row label="Docs unchanged" value={cs.unchanged ?? 0} />
                <Row label="Is no-op"       value={String(cs.is_no_op)} />
                <Row label="Summary"        value={cs.summary} />
              </>
            )}
          </>
        )}
      </Box>

      <Box title="Severity breakdown for current Change Delta">
        <Row label="High severity"   value={sectionBreakdown.high   || 0} />
        <Row label="Medium severity" value={sectionBreakdown.medium || 0} />
        <Row label="Low severity"    value={sectionBreakdown.low    || 0} />
        <div style={{ marginTop: 8, fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
          <strong>Heuristic:</strong> document removals are HIGH (downstream content may have cited the source).
          Document additions are MEDIUM (new material, no invalidation). Modifications are MEDIUM (existing citations may point at outdated wording).
          Per-pillar item additions are LOW unless they're in Claims Inventory or Prohibited Territory, which inherit HIGH for regulatory weight.
        </div>
      </Box>

      <Box title={`Per-document delta (${perDoc.length})`}>
        {perDoc.length === 0 ? (
          <div style={{ color: "#64748b" }}>No per-document delta available — run a refresh first.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {perDoc.map((d, i) => (
              <div
                key={`${d.document_id}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 100px",
                  gap: 12,
                  padding: "6px 8px",
                  background: d.change_status === "unchanged" ? "#f8fafc" :
                              d.change_status === "removed"   ? "#fef2f2" :
                              d.change_status === "added"     ? "#ecfdf5" :
                                                                "#fef3c7",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{d.name || d.document_id || "—"}</div>
                  <div style={{ fontSize: 12, color: "#64748b", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {d.document_id}
                  </div>
                </div>
                <div style={{fontSize: 13, color: "#475569"}}>{d.source || "—"}</div>
                <div style={{
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  fontSize: 11,
                  color: d.change_status === "removed" ? "#b91c1c" :
                         d.change_status === "added"   ? "#047857" :
                         d.change_status === "changed" ? "#b45309" :
                                                         "#64748b",
                }}>
                  {d.change_status}
                </div>
              </div>
            ))}
          </div>
        )}
      </Box>

      <Box title="Profile status snapshot">
        {!status ? (
          <div style={{ color: "#64748b" }}>Status not loaded.</div>
        ) : (
          <>
            <Row label="Status"             value={status.status} />
            <Row label="Brand"              value={status.brand} />
            <Row label="Version number"     value={status.version_number} />
            <Row label="Last activated"     value={status.last_activated_at} mono />
            <Row label="Last refreshed"     value={status.last_refreshed_at} mono />
            <Row label="Days since refresh" value={status.days_since_refresh} />
            <Row label="Refresh required"   value={String(status.refresh_required)} />
            <Row label="Is partial"         value={String(status.is_partial)} />
          </>
        )}
      </Box>
    </div>
  );
}

// ─── Re-approve Modal ─────────────────────────────────────────────────────────

function ReApproveModal({ daysSinceRefresh, changeCount, onClose, onConfirm, busy }) {
  return (
    <div className="bir-modal-overlay" role="dialog" aria-modal="true">
      <div className="bir-modal">
        <h2 className="bir-modal__title">Re-approve Brand Intelligence Profile</h2>
        <p className="bir-modal__body">
          {daysSinceRefresh != null && (
            <>
              This profile has not been refreshed in <strong>{daysSinceRefresh} days</strong>.{" "}
            </>
          )}
          Per business rule <strong>BR-SIH-001</strong>, a Brand Manager must explicitly re-approve
          the profile before content generation is permitted. Approving confirms you have reviewed
          all {changeCount} detected change{changeCount === 1 ? "" : "s"}.
        </p>
        <div className="bir-modal__approver">
          <p className="bir-modal__approver-label">Approving as</p>
          <p className="bir-modal__approver-name">{CURRENT_USER}</p>
          <p className="bir-modal__approver-note">Approval logged with timestamp &amp; audit trail</p>
        </div>
        <div className="bir-modal__actions">
          <button className="btn btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn--primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Re-approving…" : "Confirm Re-approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BrandIntelligenceRefresh({ profileId }) {
  const [activeTab,     setActiveTab]     = useState("changes");
  const [approveModal,  setApproveModal]  = useState(false);

  // Backend-sourced state — every field replaces a previously hardcoded one.
  const [status,        setStatus]        = useState(null);   // /profile/{id}/status (refresh subset)
  const [statusError,   setStatusError]   = useState(null);
  const [changes,       setChanges]       = useState([]);     // built from refresh summary + getProfileChanges
  const [refreshSummary,setRefreshSummary]= useState(null);   // last RefreshSummary response
  const [atoms,         setAtoms]         = useState([]);     // GET /atoms?profile_version_id=…
  const [history,       setHistory]       = useState([]);     // GET /profile/versions?brand=…
  const [running,       setRunning]       = useState(false);  // refresh in-flight
  const [runError,      setRunError]      = useState(null);
  const [approveBusy,   setApproveBusy]   = useState(false);
  const [approveError,  setApproveError]  = useState(null);

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    if (!profileId) return null;
    try {
      const s = await getRefreshStatus(profileId);
      setStatus(s || null);
      setStatusError(null);
      return s;
    } catch (err) {
      console.warn("[BrandIncrementalProfile] getRefreshStatus failed:", err);
      setStatusError(readErrorMessage(err));
      setStatus(null);
      return null;
    }
  }, [profileId]);

  const loadChanges = useCallback(async (summary = null) => {
    if (!profileId) return;
    try {
      const payload = await getProfileChanges(profileId);
      const cards = buildChangeCards(summary, payload);
      setChanges(cards);
    } catch (err) {
      console.warn("[BrandIncrementalProfile] getProfileChanges failed:", err);
      setChanges([]);
    }
  }, [profileId]);

  const loadAtoms = useCallback(async (versionId) => {
    if (!versionId) { setAtoms([]); return; }
    try {
      const data = await getDownstreamImpact(versionId, "review_recommended");
      setAtoms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("[BrandIncrementalProfile] getDownstreamImpact failed:", err);
      setAtoms([]);
    }
  }, []);

  const loadHistory = useCallback(async (brand) => {
    try {
      const res = await listVersions(brand);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setHistory(list);
    } catch (err) {
      console.warn("[BrandIncrementalProfile] listVersions failed:", err);
      setHistory([]);
    }
  }, []);

  // Auto-refresh memo: tracks which profileIds have already had their
  // first auto-refresh fired this session. Prevents the panel from
  // re-firing /ingestion/refresh on every re-mount or status reload.
  // Reset only on full page reload (ref resets with the component).
  const autoRefreshedRef = useRef(new Set());

  // ── Initial hydration whenever profileId changes ─────────────────────────
  useEffect(() => {
    if (!profileId) {
      setStatus(null); setChanges([]); setAtoms([]); setHistory([]);
      setRefreshSummary(null); setRunError(null); setStatusError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const s = await loadStatus();
      if (cancelled) return;
      await loadChanges(null);
      // Versions are brand-scoped — pass the brand from status when available.
      await loadHistory(s?.brand);
      // Atoms are version-scoped — only meaningful once a version exists.
      // status doesn't expose version_id directly; the latest version row
      // (loaded above) carries it. We resolve from history once it lands.

      // Auto-trigger the first incremental refresh per profileId so the
      // user sees real metrics on initial load instead of 0/0/0/0. The
      // backend's no-op short-circuit keeps this cheap when nothing has
      // changed since the last refresh. After the first auto-trigger the
      // user must click Run Incremental Refresh manually.
      if (
        s &&
        s.status === "active" &&        // only meaningful once activated
        !autoRefreshedRef.current.has(profileId)
      ) {
        autoRefreshedRef.current.add(profileId);
        try {
          setRunning(true);
          setRunError(null);
          const summary = await runIncrementalRefresh(profileId, CURRENT_USER, {
            brand: s.brand,
            indication: s.indication,
          });
          if (cancelled) return;
          setRefreshSummary(summary || null);
          await loadStatus();
          await loadChanges(summary);
          await loadHistory(s.brand);
        } catch (err) {
          console.warn("[BrandIncrementalProfile] auto-refresh failed:", err);
          if (!cancelled) setRunError(readErrorMessage(err));
        } finally {
          if (!cancelled) setRunning(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [profileId, loadStatus, loadChanges, loadHistory]);

  // Once history arrives, identify the current version and load its atoms.
  useEffect(() => {
    if (history.length === 0) { setAtoms([]); return; }
    const current = history.find((v) => v.is_current) || history[0];
    loadAtoms(current?.version_id);
  }, [history, loadAtoms]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const runRefresh = async () => {
    if (!profileId || running) return;
    setRunning(true);
    setRunError(null);
    try {
      const summary = await runIncrementalRefresh(profileId, CURRENT_USER, {
        brand: status?.brand,
        indication: status?.indication,
      });
      setRefreshSummary(summary || null);
      await loadStatus();
      await loadChanges(summary);
      await loadHistory(status?.brand);
    } catch (err) {
      console.warn("[BrandIncrementalProfile] runIncrementalRefresh failed:", err);
      setRunError(readErrorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  const handleApprove = async () => {
    if (!profileId || approveBusy) return;
    setApproveBusy(true);
    setApproveError(null);
    try {
      await reapproveStaleProfile(profileId, CURRENT_USER);
      await loadStatus();
      await loadHistory(status?.brand);
      setApproveModal(false);
    } catch (err) {
      console.warn("[BrandIncrementalProfile] reapprove failed:", err);
      setApproveError(readErrorMessage(err));
    } finally {
      setApproveBusy(false);
    }
  };

  // ── Derived display values ───────────────────────────────────────────────
  const daysSinceRefresh = status?.days_since_refresh ?? null;
  const expiryDays       = status?.expiry_days || EXPIRY_DAYS;
  const daysRemaining    = daysSinceRefresh != null
    ? Math.max(0, expiryDays - daysSinceRefresh)
    : null;
  const lastRefreshed    = status?.last_refreshed_at || null;
  const versionLabel     = status?.version_number ? `v${status.version_number}` : "v—";
  // Panel heading — fixed "Refresh & Change Detection" so this US 1.5 panel
  // reads as a distinct concern from the US 1.4 Activation Status card above.
  // The brand name (when available) is moved into the meta line below so the
  // operator still sees which brand they're refreshing without three repeated
  // "Brand Intelligence Profile" headings stacking up on screen.
  const panelTitle       = "Refresh & Change Detection";
  const brandLabel       = status?.brand || null;

  const totalAffected = atoms.length;
  const highCount     = changes.filter((c) => c.severity === "high").length;
  const flaggedAtomCount = atoms.length;

  const expiryWarning =
    daysRemaining != null && daysRemaining <= 10 && status?.status !== "active";

  const tabs = [
    { id: "changes", label: "Change Delta",     count: changes.length },
    { id: "atoms",   label: "Downstream Atoms", count: flaggedAtomCount },
    { id: "history", label: "Refresh History" },
    { id: "logs",    label: "Diagnostic Logs" },
  ];

  const metrics = [
    { label: "Total Changes",  value: changes.length,        note: "in this update",     accent: "default" },
    { label: "High Severity",  value: highCount,             note: "require attention",  accent: "danger"  },
    { label: "Atoms Affected", value: totalAffected,         note: "flagged for review", accent: "warning" },
    {
      label: "Days Since Refresh",
      value: daysSinceRefresh ?? "—",
      note: daysRemaining != null ? `${daysRemaining}d until expiry` : "—",
      accent: daysRemaining != null && daysRemaining <= 10 ? "danger" : "default",
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  if (!profileId) {
    return (
      <div className="bir-root">
        <div className="bir-empty">
          No active Brand Intelligence Profile. Run ingestion and activate a profile above to enable refresh &amp; change detection.
        </div>
      </div>
    );
  }

  return (
    <div className="bir-root">

      {/* ── BR-SIH-001 Expiry Warning Banner ── */}
      {expiryWarning && (
        <div className="bir-banner bir-banner--warning">
          <span className="bir-banner__icon">⚠️</span>
          <div className="bir-banner__body">
            <p className="bir-banner__title">Profile approaching 90-day expiry (BR-SIH-001)</p>
            <p className="bir-banner__sub">
              This profile expires in <strong>{daysRemaining} days</strong>. Brand Manager
              re-approval is required before content generation will be permitted.
            </p>
          </div>
          <button className="btn btn--warning" onClick={() => setApproveModal(true)}>
            Re-approve Profile
          </button>
        </div>
      )}

      {/* ── Approval Confirmation Banner ── */}
      {status?.status === "active" && daysSinceRefresh != null && daysSinceRefresh <= 1 && (
        <div className="bir-banner bir-banner--success">
          <span className="bir-banner__icon">✅</span>
          <div className="bir-banner__body">
            <p className="bir-banner__title--success">
              Profile re-approved by Brand Manager. Content generation unlocked for {expiryDays} days.
            </p>
          </div>
        </div>
      )}

      {/* ── Status fetch error ── */}
      {statusError && (
        <div className="bir-banner bir-banner--warning">
          <span className="bir-banner__icon">⚠️</span>
          <div className="bir-banner__body">
            <p className="bir-banner__title">Could not load refresh status</p>
            <p className="bir-banner__sub">{statusError}</p>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="bir-header">
        <div className="bir-header__left">
          <div className="bir-header__logo">◈</div>
          <div>
            <h1 className="bir-header__title">{panelTitle}</h1>
            <p className="bir-header__meta">
              {brandLabel ? `${brandLabel} · ` : ""}Profile ID: {profileId} · {versionLabel}
            </p>
          </div>
        </div>
        <div className="bir-header__actions">
          <button
            className="btn btn--secondary"
            onClick={runRefresh}
            disabled={running}
            title="Detect changes since the last ingestion + re-run the LLM if anything changed"
          >
            {running ? "Refreshing…" : "Run Incremental Refresh"}
          </button>
          <button
            className="btn btn--primary"
            onClick={() => setApproveModal(true)}
            disabled={!profileId}
            title="Re-approve the profile to reset the 90-day BR-SIH-001 clock"
          >
            Re-approve
          </button>
        </div>
      </div>

      {/* ── Refresh fetch error ── */}
      {runError && (
        <div className="bir-banner bir-banner--warning">
          <span className="bir-banner__icon">⚠️</span>
          <div className="bir-banner__body">
            <p className="bir-banner__title">Refresh failed</p>
            <p className="bir-banner__sub">{runError}</p>
          </div>
        </div>
      )}

      {/* ── Refresh summary banner ── */}
      {refreshSummary?.change_summary?.summary && (
        <div className="bir-banner bir-banner--flagged">
          <span className="bir-banner__icon">🏷️</span>
          <div className="bir-banner__body">
            <p className="bir-banner__title--flagged">{refreshSummary.change_summary.summary}</p>
            <p className="bir-banner__sub">
              {refreshSummary.document_count ?? 0} documents scanned
              {refreshSummary.previous_version_number ? ` · vs v${refreshSummary.previous_version_number}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* ── Metric Cards ── */}
      <div className="bir-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="bir-metric-card">
            <p className="bir-metric-card__label">{m.label}</p>
            <p className={`bir-metric-card__value bir-metric-card__value--${m.accent}`}>{m.value}</p>
            <p className="bir-metric-card__note">{m.note}</p>
          </div>
        ))}
      </div>

      {/* ── Last Refreshed + Expiry Countdown ── */}
      <div className="bir-timestamp-strip">
        <div className="bir-timestamp-strip__item">
          <label>Last refreshed:</label>
          <strong>{formatTimestamp(lastRefreshed)}</strong>
        </div>
        <div className="bir-timestamp-strip__divider" />
        <div className="bir-timestamp-strip__item">
          <label>Last activation:</label>
          <strong className="green">{formatTimestamp(status?.last_activated_at)}</strong>
        </div>
        <div className="bir-timestamp-strip__countdown">
          <p className="bir-timestamp-strip__countdown-label">{expiryDays}-day expiry countdown</p>
          <ExpiryCountdown daysRemaining={daysRemaining} expiryDays={expiryDays} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bir-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`bir-tab-btn ${activeTab === tab.id ? "bir-tab-btn--active" : "bir-tab-btn--inactive"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`bir-tab-count ${activeTab === tab.id ? "bir-tab-count--active" : "bir-tab-count--inactive"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Panels ── */}
      {activeTab === "changes" && <ChangesTab changes={changes} />}
      {activeTab === "atoms"   && <AtomsTab   atoms={atoms} />}
      {activeTab === "history" && <HistoryTab history={history} />}
      {activeTab === "logs"    && (
        <DiagnosticLogsTab
          status={status}
          refreshSummary={refreshSummary}
          runError={runError}
          statusError={statusError}
          changes={changes}
        />
      )}

      {/* ── Re-approve Modal (BR-SIH-001 gate) ── */}
      {approveModal && (
        <ReApproveModal
          daysSinceRefresh={daysSinceRefresh}
          changeCount={changes.length}
          onClose={() => setApproveModal(false)}
          onConfirm={handleApprove}
          busy={approveBusy}
        />
      )}
      {approveError && (
        <div className="bir-banner bir-banner--warning" style={{ marginTop: 8 }}>
          <span className="bir-banner__icon">⚠️</span>
          <div className="bir-banner__body">
            <p className="bir-banner__title">Re-approval failed</p>
            <p className="bir-banner__sub">{approveError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
