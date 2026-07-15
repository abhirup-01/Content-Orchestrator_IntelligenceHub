import React, { useState, useCallback } from "react";
import "./IntelligenceCss/CompetitiveManageGaps.css";
import {
  getDashboard, getDashboardAudit, refreshDashboard,
  dismissGap, convertGap, deferGap, requestGapAnalysis, getGapReport,
} from "../api/competitiveIntelligenceApi";

/* US 2.4 — Competitive Intelligence Dashboard. All data is fetched live from
   GET /api/dashboard (gap matrix, whitespace, parity, counts) — no hardcoded
   content. The gap matrix is produced by the backend AI gap-analysis agent
   over the US 2.1/2.2/2.3 ingested + classified inventory. */

function fmt(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? v
    : d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
        year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
      }) + " IST";
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
}
// Columns exported to PDF / Excel (built from the live gap matrix).
const GAP_COLS = [
  ["Gap ID", (g) => g.gap_id],
  ["Type", (g) => g.gap_type],
  ["Risk", (g) => g.risk_rating],
  ["Description", (g) => g.description],
  ["Competitors", (g) => (g.competitor_names || []).join("; ")],
  ["Indication", (g) => g.indication || ""],
  ["Audience", (g) => g.audience_segment || ""],
  ["Recommended Action", (g) => g.recommended_action || ""],
  ["First Detected", (g) => g.first_detected || ""],
  ["Last Updated", (g) => g.last_updated || ""],
];
function gapTableHtml(gaps) {
  const head = GAP_COLS.map((c) => `<th>${c[0]}</th>`).join("");
  const body = gaps
    .map((g) => `<tr>${GAP_COLS.map((c) => `<td>${esc(c[1](g))}</td>`).join("")}</tr>`)
    .join("");
  return `<table border="1" cellspacing="0" cellpadding="6"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export default function CompetitiveManageGaps() {
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [dismissId, setDismissId] = useState(null);
  const [dismissReason, setDismissReason] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, a] = await Promise.all([
        getDashboard(),
        getDashboardAudit().catch(() => ({ entries: [] })),
      ]);
      setData(d);
      setAudit(a.entries || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  // No auto-fetch on mount — data loads when the user clicks "Refresh Now".

  async function handleRefresh() {
    try { await refreshDashboard("Brand Manager"); await load(); }
    catch (e) { setError(e.message); }
  }
  async function submitDismiss() {
    if (!dismissReason.trim()) return;
    try {
      await dismissGap(dismissId, dismissReason.trim());
      setDismissId(null); setDismissReason(""); await load();
    } catch (e) { setError(e.message); }
  }
  async function act(fn, id) {
    try { await fn(id); await load(); } catch (e) { setError(e.message); }
  }
  async function exportAs(format) {
    setExportOpen(false);
    try {
      if (format === "json") {
        const r = await getGapReport();
        download(JSON.stringify(r, null, 2), "competitive-gap-report.json", "application/json");
      } else if (format === "excel") {
        // HTML table with an .xls extension — opens natively in Excel.
        const html = `<html><head><meta charset="utf-8"></head><body>${gapTableHtml(gaps)}</body></html>`;
        download(html, "competitive-gap-report.xls", "application/vnd.ms-excel");
      } else if (format === "pdf") {
        // Print-to-PDF via a print window (no external library needed).
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(
          `<html><head><title>Competitive Gap Report</title><style>body{font-family:Arial,sans-serif;padding:20px}h2{margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#eee}</style></head><body><h2>Competitive Gap Report</h2>${gapTableHtml(gaps)}</body></html>`
        );
        w.document.close();
        w.focus();
        w.print();
      }
    } catch (e) { setError(e.message); }
  }

  const gaps = data?.gap_matrix || [];
  const whitespace = data?.whitespace || [];
  const parity = data?.parity || [];
  const counts = data?.counts || {};

  return (
    <div className="cmg-root">

      {/* HEADER */}
      <div className="cmg-header-card">
        <div>
          <h1>Competitive Intelligence Dashboard</h1>
          <p>{loading ? "Loading…" : data ? `Version ${data.version_number} · Generated: ${fmt(data.generated_at)}` : "Click “Refresh Now” to load the latest dashboard."}</p>
        </div>
        <div className="cmg-refresh-area">
          <div>
            <p>Next Refresh: {fmt(data?.next_scheduled_refresh)}</p>
            <p>Deltas Since Last Visit: {data?.delta_count ?? 0}</p>
            <p>Generated By: {data?.generated_by || "—"}</p>
          </div>
          <button className="cmg-btn-primary" onClick={handleRefresh}>Refresh Now</button>
        </div>
      </div>

      {/* FILTERS (display controls) */}
      <div className="cmg-filters">
        <select><option>Gap Type</option><option>Claims Gap</option><option>Messaging Gap</option><option>Audience Gap</option><option>Channel Gap</option><option>Whitespace</option></select>
        <select><option>Risk Rating</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select><option>Competitor</option></select>
        <select><option>Indication</option></select>
        <select><option>Audience Segment</option></select>
        <input type="date" />
        <label><input type="checkbox" /> Delta Since Last Visit</label>
      </div>

      {/* KPI CARDS */}
      <div className="cmg-kpi-grid">
        <div className="cmg-kpi-card"><h3>Active Gaps</h3><span>{counts.total_gaps ?? gaps.length}</span></div>
        <div className="cmg-kpi-card"><h3>High Risk</h3><span>{counts.High ?? 0}</span></div>
        <div className="cmg-kpi-card"><h3>Whitespace</h3><span>{counts.whitespace ?? whitespace.length}</span></div>
        <div className="cmg-kpi-card"><h3>New / Updated</h3><span>{data?.delta_count ?? 0}</span></div>
        <div className="cmg-kpi-card"><h3>Parity</h3><span>{counts.parity ?? parity.length}</span></div>
      </div>

      {/* GAP MATRIX */}
      <h2 className="cmg-section-title">Gap Matrix</h2>

      {loading && <div className="cmg-parity-content">Loading gap matrix…</div>}
      {!loading && gaps.length === 0 && (
        <div className="cmg-parity-content">No gaps yet. Run an ingestion cycle, then refresh to generate the gap matrix.</div>
      )}

      {gaps.map((gap) => (
        <div className="cmg-gap-card" key={gap.gap_id}>

          {gap.previously_dismissed && (
            <div className="cmg-warning">Previously dismissed — updated context</div>
          )}

          <div className="cmg-top-row">
            <div className="cmg-tags">
              <span className="cmg-new-tag">{gap.is_delta ? "NEW" : (gap.status || "").toUpperCase()}</span>
              <span className="cmg-type-tag">{gap.gap_type}</span>
            </div>
            <span className={`cmg-risk ${(gap.risk_rating || "").toLowerCase()}`}>{gap.risk_rating}</span>
          </div>

          <h3>{gap.description}</h3>

          <div className="cmg-meta-grid">
            <div><strong>Competitors:</strong><p>{(gap.competitor_names || []).join(", ") || "—"}</p></div>
            <div><strong>Indication:</strong><p>{gap.indication || "—"}</p></div>
            <div><strong>Audience:</strong><p>{gap.audience_segment || "—"}</p></div>
            <div><strong>Recommended Action:</strong><p>{gap.recommended_action || "—"}</p></div>
          </div>

          <div className="cmg-chips">
            {(gap.signal_types || []).map((s) => <span key={s} className="cmg-chip">{s}</span>)}
          </div>

          <div className="cmg-dates">
            <span>First Detected : {fmt(gap.first_detected)}</span>
            <span>Last Updated : {fmt(gap.last_updated)}</span>
          </div>

          <button
            className="cmg-expand-btn"
            onClick={() => setExpandedId(expandedId === gap.gap_id ? null : gap.gap_id)}
          >
            Risk Rating Transparency
          </button>

          {expandedId === gap.gap_id && (
            <div className="cmg-risk-panel">
              {(gap.dimension_scores || []).map((s) => (
                <div className="cmg-score-card" key={s.dimension}>
                  <h4>{s.dimension}</h4>
                  <p>Score: {s.score}/10</p>
                  <small>{s.rationale}</small>
                </div>
              ))}
              {(gap.sources || []).length > 0 && (
                <div className="cmg-evidence">
                  <h4>Evidence</h4>
                  <ul>{gap.sources.map((src, i) => <li key={i}>{src}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          <div className="cmg-action-row">
            <button className="cmg-btn-primary" onClick={() => act(convertGap, gap.gap_id)}>Convert to Content Opportunity</button>
            <button className="cmg-btn-secondary" onClick={() => { setDismissId(gap.gap_id); setDismissReason(""); }}>Dismiss</button>
            <button className="cmg-btn-secondary" onClick={() => act(deferGap, gap.gap_id)}>Watch List</button>
            <button className="cmg-btn-secondary" onClick={() => act(requestGapAnalysis, gap.gap_id)}>Request Analysis</button>
          </div>
        </div>
      ))}

      {/* WHITESPACE */}
      <h2 className="cmg-section-title">Whitespace Opportunities</h2>
      {!loading && whitespace.length === 0 && (
        <div className="cmg-parity-content">No whitespace opportunities detected.</div>
      )}
      {whitespace.map((item) => (
        <div className="cmg-whitespace-card" key={item.whitespace_id}>
          <div className="cmg-white-tag">Whitespace Opportunity</div>
          <h3>{item.topic_or_audience || item.description}</h3>
          <div className="cmg-score">Opportunity Score : {item.opportunity_strength}</div>
          <p>Recommended Action : {item.recommended_action}</p>
        </div>
      ))}

      {/* PARITY */}
      <details className="cmg-parity">
        <summary>Parity Areas (Informational Only)</summary>
        <div className="cmg-parity-content">
          {parity.length === 0
            ? "No parity areas identified."
            : parity.map((p) => (
                <p key={p.parity_id}><strong>{p.area}:</strong> {p.description}</p>
              ))}
        </div>
      </details>

      {/* REPORT */}
      <div className="cmg-report">
        <h2>Competitive Gap Report</h2>
        <div className="cmg-export-wrap" onMouseLeave={() => setExportOpen(false)}>
          <button className="cmg-btn-primary" onClick={() => setExportOpen((o) => !o)}>
            Export ▾
          </button>
          {exportOpen && (
            <div className="cmg-export-menu">
              <button className="cmg-export-item" onClick={() => exportAs("json")}>Export as JSON</button>
              <button className="cmg-export-item" onClick={() => exportAs("pdf")}>Export as PDF</button>
              <button className="cmg-export-item" onClick={() => exportAs("excel")}>Export as Excel</button>
            </div>
          )}
        </div>
      </div>

      {/* AUDIT */}
      <div className="cmg-audit">
        <h2>Audit Trail</h2>
        <table>
          <thead><tr><th>User</th><th>Action</th><th>Timestamp</th><th>Reference</th></tr></thead>
          <tbody>
            {audit.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--gray4)" }}>No audit entries yet.</td></tr>
            ) : (
              audit.map((e) => (
                <tr key={e.audit_id}>
                  <td>{e.user}</td>
                  <td>{e.action}</td>
                  <td>{fmt(e.timestamp)}</td>
                  <td>{e.item_ref}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DISMISS MODAL */}
      {dismissId && (
        <div className="cmg-modal">
          <div className="cmg-modal-content">
            <h3>Dismiss Gap Item</h3>
            <textarea
              placeholder="Reason is required"
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
            />
            <div className="cmg-modal-actions">
              <button className="cmg-btn-primary" disabled={!dismissReason.trim()} onClick={submitDismiss}>Submit</button>
              <button className="cmg-btn-secondary" onClick={() => setDismissId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
