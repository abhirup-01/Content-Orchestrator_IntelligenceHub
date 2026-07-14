import { useState, useEffect, useCallback } from "react";
import {
  getInventory,
  getInventoryStats,
  getLatestCycleSummary,
  getAdSummaries,
  getPendingItems,
  getQuarantine,
  triggerIngestion,
  // Sanju changes - 29th June 2026 — extra CI endpoints (Ask AI + Run Log)
  askCompetitor,
  getRunLogs,
  downloadRunLog,
} from "../api/competitiveIntelligenceApi";
import "./IntelligenceCss/CompetitorInventory.css";

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const DATA_CATEGORIES = [
  { id: "ALL",                    label: "All Categories",        color: "#6B7280", dot: "#9CA3AF" },
  { id: "APPROVAL_RECORD",        label: "Approval Records",      color: "#0E7C5A", dot: "#0E7C5A", bdg: "bdg-approval" },
  { id: "COMPETITOR_CLAIM",       label: "Competitor Claims",     color: "#1F3A8A", dot: "#3B5CC4", bdg: "bdg-claim" },
  { id: "COMPETITOR_NARRATIVE",   label: "Competitor Narratives", color: "#5B21B6", dot: "#7C3AED", bdg: "bdg-narrative" },
  { id: "TRIAL_RECORD",           label: "Trial Records",         color: "#9A3412", dot: "#EA580C", bdg: "bdg-trial" },
  { id: "AD_ACTIVITY_RECORD",     label: "Ad Activity Records",   color: "#92400E", dot: "#D97706", bdg: "bdg-ad" },
];

const CATEGORY_ICONS = {
  APPROVAL_RECORD:      { icon: "🏛", bg: "#E6F5F0", color: "#0E7C5A" },
  COMPETITOR_CLAIM:     { icon: "💬", bg: "#EEF2FF", color: "#1F3A8A" },
  COMPETITOR_NARRATIVE: { icon: "📖", bg: "#F5F3FF", color: "#5B21B6" },
  TRIAL_RECORD:         { icon: "🧪", bg: "#FFF7ED", color: "#9A3412" },
  AD_ACTIVITY_RECORD:   { icon: "📡", bg: "#FFFBEB", color: "#92400E" },
};

const TREND_ICONS = {
  Increasing: { label: "↑ Increasing", cls: "trend-up" },
  Decreasing: { label: "↓ Decreasing", cls: "trend-down" },
  Stable:     { label: "→ Stable",     cls: "trend-flat" },
  Unknown:    { label: "— Unknown",    cls: "trend-flat" },
};

/* Sanju changes - 29th June 2026 — render every timestamp in India Standard
   Time (Asia/Kolkata). formatIST = date + time (+ " IST"); formatISTDate = date only.
   Keeps the existing en-GB display format, only the time zone changes. */
function formatIST(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }) + " IST";
}
function formatISTDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
}

/* ─────────────────────────────────────────────────────────
   SUB-COMPONENTS
   (Backend access lives in src/components/api/competitiveIntelligenceApi.js)
───────────────────────────────────────────────────────── */

function CategoryBadge({ category }) {
  const cat = DATA_CATEGORIES.find(c => c.id === category);
  if (!cat) return null;
  const bdgMap = {
    APPROVAL_RECORD: "bdg-approval", COMPETITOR_CLAIM: "bdg-claim",
    COMPETITOR_NARRATIVE: "bdg-narrative", TRIAL_RECORD: "bdg-trial",
    AD_ACTIVITY_RECORD: "bdg-ad",
  };
  const shortLabel = {
    APPROVAL_RECORD: "Approval", COMPETITOR_CLAIM: "Claim",
    COMPETITOR_NARRATIVE: "Narrative", TRIAL_RECORD: "Trial", AD_ACTIVITY_RECORD: "Ad Activity",
  };
  return <span className={`inv-badge ${bdgMap[category] || ""}`}>{shortLabel[category] || category}</span>;
}

function ReliabilityBadge({ reliability }) {
  return (
    <span className={`inv-badge ${reliability === "Verified" ? "bdg-verified" : "bdg-extracted"}`}>
      {reliability}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    "New this cycle":              "bdg-new",
    "Unchanged":                   "bdg-unchanged",
    "Source unavailable this cycle": "bdg-unavail",
    "Pending review":              "bdg-pending",
    "Quarantined":                 "bdg-quarantine",
  };
  if (status !== "New this cycle") return null;
  return <span className={`inv-badge ${map[status] || "bdg-unchanged"}`}>{status}</span>;
}

function ConfidenceBar({ score, flagged }) {
  const color = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";
  return (
    <div>
      <div className="confidence-wrap">
        <div className="confidence-bar-bg" style={{ width: 80 }}>
          <div className="confidence-bar-fill" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="confidence-score-text" style={{ color }}>{score}</span>
        {flagged && <span className="inv-badge bdg-lowconf" style={{ fontSize: 9 }}>Low — verify</span>}
      </div>
    </div>
  );
}

function ItemDetailDrawer({ item }) {
  const cat = item.data_category;

  const fields = [
    { label: "Item ID",         value: item.item_id },
    { label: "Competitor",      value: item.competitor_name },
    { label: "Product",         value: item.product_name || "—" },
    { label: "Indication",      value: item.indication || "—" },
    { label: "Geography",       value: item.geography || "—" },
    { label: "Source",          value: item.source_name },
    { label: "Cycle ID",        value: item.ingestion_cycle_id },
    // Sanju changes - 29th June 2026 — IST
    { label: "Detected",        value: formatIST(item.detected_date) },
    { label: "Reliability",     value: item.reliability },
    { label: "Layer 4 Routed",  value: item.layer4_routed ? "Yes" : "No" },
    // Sanju changes - 29th June 2026 — added Confidence / provenance / messaging
    // fields per Data Category (extra logic from reference build).
    ...(cat === "APPROVAL_RECORD"   ? [{ label: "Approval Type", value: item.approval_type }, { label: "Authority", value: item.authority }, { label: "App No.", value: item.application_num || "—" }, { label: "Confidence", value: item.confidence_score != null ? `${item.confidence_score}/100` : "—" }] : []),
    ...(cat === "TRIAL_RECORD"      ? [{ label: "Trial ID", value: item.trial_id }, { label: "Phase", value: item.trial_phase || "—" }, { label: "Status", value: item.trial_status || "—" }, { label: "Change", value: item.change_type || "—" }, { label: "Confidence", value: item.confidence_score != null ? `${item.confidence_score}/100` : "—" }] : []),
    ...(cat === "COMPETITOR_CLAIM"  ? [
      { label: "Claim Type", value: item.claim_type || "—" },
      { label: "Confidence", value: `${item.confidence_score}/100` },
      // Sanju changes - 29th June 2026 — provenance for claims mined by the
      // Competitor Signal Agent from a non-claim source.
      ...(item.signal_source ? [{ label: "Mined From", value: item.signal_source }] : []),
      ...(item.extracted_by ? [{ label: "Extracted By", value: "Competitor Signal Agent (AI)" }] : []),
    ] : []),
    ...(cat === "COMPETITOR_NARRATIVE" ? [
      // Sanju changes - 29th June 2026 — pieces analysed count.
      { label: "Pieces Analysed", value: item.evidence_count != null ? `${item.evidence_count} (AI read ≥5)` : `${(item.evidence_item_ids || []).length}` },
      { label: "Evidence Items", value: (item.evidence_item_ids || []).join(", ") || "—" },
      { label: "Confidence", value: `${item.confidence_score}/100` },
    ] : []),
    ...(cat === "AD_ACTIVITY_RECORD" ? [
      { label: "Channels",        value: (item.channels || []).join(", ") },
      { label: "Observations",    value: item.observation_count?.toLocaleString() || "—" },
      { label: "Prior 30d",       value: item.observation_count_prior_30d?.toLocaleString() || "—" },
      { label: "Trend",           value: `${item.trend_direction || "—"}${item.trend_pct_change != null ? ` (${item.trend_pct_change > 0 ? "+" : ""}${item.trend_pct_change}%)` : ""}` },
      // Sanju changes - 29th June 2026 — confidence + observed messaging.
      { label: "Confidence",      value: item.confidence_score != null ? `${item.confidence_score}/100` : "—" },
      ...(item.observed_messaging ? [{ label: "Observed Messaging", value: item.observed_messaging }] : []),
    ] : []),
  ];

  const sourceText = cat === "COMPETITOR_CLAIM" ? item.source_text
    : cat === "AD_ACTIVITY_RECORD" ? item.ad_creative_text
    : item.raw_source_text;

  return (
    <div className="item-detail">
      <div className="detail-grid">
        {fields.map(f => (
          <div key={f.label} className="detail-field">
            <div className="detail-label">{f.label}</div>
            <div className="detail-value">{f.value}</div>
          </div>
        ))}
      </div>

      {cat === "AD_ACTIVITY_RECORD" && (
        <div className="ad-no-spend-note">
          ⚠ Ad spend and budget figures are not available from this source. Only observed ad activity is recorded.
        </div>
      )}

      {sourceText && (
        <div className="source-text-box" style={{ marginTop: 10 }}>
          <div className="source-text-label">
            📄 {cat === "COMPETITOR_CLAIM" ? "Original source text (for audit)" : cat === "AD_ACTIVITY_RECORD" ? "Ad creative text (exact as observed)" : "Raw source text"}
          </div>
          <div className="source-text-body">{sourceText}</div>
        </div>
      )}

      {cat === "COMPETITOR_CLAIM" && item.claim_text && (
        <div className="source-text-box" style={{ marginTop: 8, background: "#F0FDF4", borderColor: "#BBF7D0" }}>
          <div className="source-text-label" style={{ color: "#166534" }}>✓ Extracted claim</div>
          <div className="source-text-body" style={{ color: "#166534" }}>{item.claim_text}</div>
        </div>
      )}
    </div>
  );
}

function InventoryItem({ item }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_ICONS[item.data_category] || { icon: "📄", bg: "#F3F4F6", color: "#6B7280" };

  const subtitle = (() => {
    if (item.competitor_name && item.product_name) return `${item.competitor_name} · ${item.product_name}`;
    if (item.competitor_name) return item.competitor_name;
    return "—";
  })();

  const mainLabel = (() => {
    if (item.data_category === "APPROVAL_RECORD")       return `${item.approval_type || "Approval"} — ${item.authority || ""}`;
    if (item.data_category === "COMPETITOR_CLAIM")      return item.claim_text || item.raw_source_text?.slice(0, 100) || "Extracted claim";
    if (item.data_category === "COMPETITOR_NARRATIVE")  return item.narrative_theme || "Competitor narrative";
    if (item.data_category === "TRIAL_RECORD")          return `${item.trial_id || ""} · ${item.trial_phase || ""} · ${item.trial_status || ""}`;
    if (item.data_category === "AD_ACTIVITY_RECORD")    return item.ad_creative_text?.slice(0, 120) || "Ad creative";
    return "Item";
  })();

  return (
    <>
      <div
        className={`inv-item cat--${item.data_category} ${expanded ? "expanded" : ""}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="item-icon-box" style={{ background: "#e5e7eb",
    color: "#252525"}}>
          {meta.icon}
        </div>
        <div className="item-center">
          <div className="item-name-row">
            <span className="item-name">{mainLabel}</span>
            <StatusBadge status={item.ingestion_status} />
            {item.low_confidence_flag && <span className="inv-badge bdg-lowconf">Low confidence — verify</span>}
            {item.layer4_routed && <span className="inv-badge bdg-layer4">→ Layer 4</span>}
          </div>
          <div className="item-meta">{subtitle}{item.indication ? ` · ${item.indication}` : ""}{item.geography ? ` · ${item.geography}` : ""}</div>
          <div className="item-tags">
            <CategoryBadge category={item.data_category} />
            <ReliabilityBadge reliability={item.reliability} />
            {/* Sanju changes - 29th June 2026 — show the "⚡ Signal · <SOURCE>" chip
                on EVERY inventory row, using signal_source (guaranteed by
                getInventory: signal_source ?? source_type ?? source_name). This is
                the origin feed each intelligence signal came from (REGULATORY /
                CONGRESS / SOCIAL / ADINTEL) and pairs with the Category + Reliability
                badges and the confidence score to match the reference UI row. */}
            {(item.signal_source || item.source_name) && (
              <span className="inv-badge bdg-claim" title="Competitor intelligence signal — origin feed">
                ⚡ Signal · {String(item.signal_source || item.source_name).toUpperCase()}
              </span>
            )}
            {/* Narrative piece count — use the explicit evidence_count when present,
                otherwise fall back to the number of evidence items the AI cited. */}
            {item.data_category === "COMPETITOR_NARRATIVE" &&
              (item.evidence_count != null || (item.evidence_item_ids || []).length > 0) && (
              <span className="inv-badge bdg-narrative" title="Synthesised after the AI read ≥5 content pieces">
                {item.evidence_count != null ? item.evidence_count : (item.evidence_item_ids || []).length} pieces
              </span>
            )}
            {/* Inline confidence score bar removed per request — the confidence
                value still appears in the expanded item detail drawer. */}
            {item.data_category === "AD_ACTIVITY_RECORD" && item.trend_direction && (
              <span className={TREND_ICONS[item.trend_direction]?.cls || "trend-flat"}>
                {TREND_ICONS[item.trend_direction]?.label}
                {item.trend_pct_change != null ? ` ${item.trend_pct_change > 0 ? "+" : ""}${item.trend_pct_change}%` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="item-right">
          <div className="item-date">
            {item.detected_date ? new Date(item.detected_date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : "—"}
          </div>
          <span style={{ fontSize: 11, color: "var(--gray4)" }}>{item.source_name}</span>
        </div>
      </div>
      {expanded && <ItemDetailDrawer item={item} />}
    </>
  );
}

function CyclePanel({ cycle }) {
  if (!cycle) return null;
  const statusColor = cycle.status === "completed" ? "#16A34A" : cycle.status === "partial" ? "#D97706" : "#DC2626";

  return (
    <div className="cycle-panel">
      <div className="cycle-panel-header">
        <div>
          <div className="cycle-panel-title">Last Ingestion Cycle</div>
          <div style={{ fontSize: 12, color: "var(--gray3)", marginTop: 2 }}>
            {cycle.cycle_id} · {cycle.triggered_by}
            · <span style={{ color: statusColor, fontWeight: 600 }}>{cycle.status}</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--gray3)", textAlign: "right" }}>
          {/* Sanju changes - 29th June 2026 — IST */}
          <div>Started: {formatIST(cycle.started_at)}</div>
          {cycle.completed_at && <div>Completed: {formatIST(cycle.completed_at)}</div>}
        </div>
      </div>

      {/* Sanju changes - 29th June 2026 — removed the per-cycle KPI row. It used
          cycle.item_counts (NEW items this cycle only), so on a partial cycle it
          showed 0 for Competitor Claims / Trial Records even though the inventory
          has 9 / 10. The category totals now come solely from the backend-driven
          stat cards (stats.by_category), matching the reference build. */}

      {cycle.connector_failures?.length > 0 && cycle.connector_failures.map((f, i) => (
        <div key={i} className="failure-strip">
          <span>⚠</span>
          <div>
            <span className="failure-name">{f.connector_name}</span>
            <span className="failure-err">{f.error_type} · {formatIST(f.timestamp)}</span>{/* Sanju changes - 29th June 2026 — IST */}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdSummaryPanel({ summaries }) {
  if (!summaries?.length) return (
    <div className="empty-state">
      <div className="empty-state-icon">📡</div>
      <h3>No Ad Activity Summaries</h3>
      <p>Run an ingestion cycle to generate competitor ad summaries.</p>
    </div>
  );

  return (
    <div>
      {summaries.map(s => (
        <div key={s.summary_id} className="ad-summary-card">
          <div className="ad-summary-header">
            <div>
              <div className="ad-summary-competitor">{s.competitor_name}</div>
              <div style={{ fontSize: 11, color: "var(--gray3)" }}>{s.cycle_id} · {formatISTDate(s.generated_at)}</div>
            </div>
            <span className={TREND_ICONS[s.trend_direction]?.cls || "trend-flat"} style={{ fontSize: 13 }}>
              {TREND_ICONS[s.trend_direction]?.label}
            </span>
          </div>
          <div className="ad-summary-channels">
            {(s.active_channels || []).map(ch => (
              <span key={ch} className="inv-badge bdg-ad">{ch}</span>
            ))}
          </div>
          <div className="ad-obs-row">
            <span className="ad-obs-label">Current 30d:</span>
            <span className="ad-obs-value">{s.obs_count_current_30d?.toLocaleString()}</span>
            <span className="ad-obs-label">Prior 30d:</span>
            <span className="ad-obs-value">{s.obs_count_prior_30d?.toLocaleString()}</span>
            {s.pct_change != null && (
              <>
                <span className="ad-obs-label">Change:</span>
                <span className={s.pct_change > 0 ? "trend-up" : s.pct_change < 0 ? "trend-down" : "trend-flat"}>
                  {s.pct_change > 0 ? "+" : ""}{s.pct_change}%
                </span>
              </>
            )}
          </div>
          <div className="ad-no-spend-note">
            Ad spend figures are not available. Observed activity and frequency only.
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingPanel({ items, onResolve }) {
  if (!items?.length) return (
    <div className="empty-state">
      <div className="empty-state-icon">✅</div>
      <h3>No pending items</h3>
      <p>All ingested items were successfully classified.</p>
    </div>
  );

  return (
    <div>
      {items.map(p => (
        <div key={p.pending_id} style={{ background: "var(--white)", border: "1px solid #d8d8d8", borderRadius: 10, padding: "14px 18px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{p.raw_text?.slice(0, 120)}…</div>
              <div style={{ fontSize: 11.5, color: "var(--gray3)", marginBottom: 6 }}>{p.source_name} · {formatISTDate(p.detected_date)}</div>
              <div style={{ fontSize: 11.5, color: "var(--amber)" }}>⚠ {p.reason}</div>
            </div>
            <button className="inv-btn inv-btn--outline inv-btn--sm" onClick={() => onResolve(p.pending_id)}>
              Assign Category
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuarantinePanel({ items }) {
  if (!items?.length) return (
    <div className="empty-state">
      <div className="empty-state-icon">🛡</div>
      <h3>No quarantined items</h3>
      <p>No adverse event language detected in this cycle.</p>
    </div>
  );

  return (
    <div>
      {items.map(q => (
        <div key={q.quarantine_id} style={{ background: "var(--red-lt)", border: "1px solid var(--red-bd)", borderRadius: 10, padding: "14px 18px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--red)" }}>Quarantined — AE Language Detected</span>
            {q.reviewed && <span className="inv-badge bdg-verified">Reviewed</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--gray2)", marginBottom: 6, fontStyle: "italic" }}>{q.original_text?.slice(0, 200)}…</div>
          <div style={{ fontSize: 11.5, color: "var(--red)", marginBottom: 4 }}>
            AE keywords: {(q.ae_keywords || []).join(", ")}
          </div>
          <div style={{ fontSize: 11, color: "var(--gray3)" }}>
            {q.competitor_name} · {formatISTDate(q.detected_date)} · Routed to: {q.routed_to}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Sanju changes - 29th June 2026 — Ask AI panel. Asks the agent about a tracked
   competitor; grounded only on the classified inventory (no spend/budget). */
function AskAIPanel() {
  const [name,     setName]     = useState("");
  const [question, setQuestion] = useState("");
  const [answer,   setAnswer]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState(null);

  const SUGGESTED = [
    "What channels is this competitor running ads on?",
    "What does their ad copy emphasise?",
    "Has their ad frequency increased recently?",
    "How much are they spending on advertising?",   // demonstrates the spend guardrail
  ];

  async function ask(q) {
    const theQuestion = q ?? question;
    if (!name.trim() || !theQuestion.trim()) {
      setErr("Enter a competitor name and a question.");
      return;
    }
    setLoading(true); setErr(null); setAnswer(null);
    try {
      const res = await askCompetitor(name.trim(), theQuestion);
      setQuestion(theQuestion);
      setAnswer(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ask-ai-panel">
      <div className="ask-ai-note" style={{ fontSize: 12.5, color: "var(--gray3)", marginBottom: 12 }}>
        The agent answers only from the classified inventory. It can describe ad channels, messaging,
        activity duration, and frequency trends — but never ad spend or budget. Spend questions are declined.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          className="filter-input"
          placeholder="Competitor name (e.g. CompetitorA)"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <input
          className="filter-input"
          placeholder="Ask a question…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          style={{ flex: 1, minWidth: 260 }}
        />
        <button className="inv-btn inv-btn--teal" onClick={() => ask()} disabled={loading}>
          {loading ? "Asking…" : "Ask AI"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {SUGGESTED.map(q => (
          <button key={q} className="inv-btn inv-btn--outline inv-btn--sm" onClick={() => ask(q)} disabled={loading}>
            {q}
          </button>
        ))}
      </div>

      {err && (
        <div className="failure-strip" style={{ marginBottom: 12 }}>
          <span>⚠</span><div><span className="failure-err">{err}</span></div>
        </div>
      )}

      {answer && (
        <div
          className="source-text-box"
          style={{
            background: answer.refused ? "#FEF2F2" : "#F0FDF4",
            borderColor: answer.refused ? "#FECACA" : "#BBF7D0",
          }}
        >
          <div className="source-text-label" style={{ color: answer.refused ? "#991B1B" : "#166534" }}>
            {answer.refused ? "🛡 Guardrail — spend data withheld" : "🤖 Agent response"}
            <span style={{ fontWeight: 400, marginLeft: 8, fontSize: 11, color: "var(--gray3)" }}>
              {answer.generated_by === "ai" ? "AI-generated" : "rule-based"}
            </span>
          </div>
          <div className="source-text-body" style={{ color: answer.refused ? "#991B1B" : "#166534" }}>
            {answer.answer}
          </div>
          <div style={{ fontSize: 11, color: "var(--gray3)", marginTop: 8 }}>
            Grounded on — approvals: {answer.grounded_on?.approvals ?? 0} ·
            claims: {answer.grounded_on?.claims ?? 0} ·
            trials: {answer.grounded_on?.trials ?? 0} ·
            narratives: {answer.grounded_on?.narratives ?? 0} ·
            ad summaries: {answer.grounded_on?.ad_summaries ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}

/* Sanju changes - 29th June 2026 — Ingestion Run Log.
   Every run (successful, partial, or failed) with cycle ID, item counts per
   Data Category, totals, and each connector failure's reason + timestamp. */
function RunLogPanel({ logs, onDownload, downloading }) {
  const statusColor = s =>
    s === "completed" ? "#16A34A" : s === "partial" ? "#D97706" : "#DC2626";

  return (
    <div>
      {/* Sanju changes - 30th June 2026 — removed the Download PDF / Download JSON
          buttons from the Run Log toolbar (download stays available via the
          "Download Log (PDF)" button in the top bar). */}
      <div className="inv-toolbar">
        <span style={{ fontSize: 12.5, color: "var(--gray3)" }}>
          {logs.length} run(s) logged — successful and failed.
        </span>
        <div className="toolbar-spacer" />
      </div>

      {!logs.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗒️</div>
          <h3>No ingestion runs logged yet</h3>
          <p>Run an ingestion cycle — every run is recorded here.</p>
        </div>
      ) : (
        logs.map(run => {
          const counts = run.item_counts || {};
          const failures = run.connector_failures || [];
          return (
            <div key={run.cycle_id} className="cycle-panel" style={{ marginBottom: 12 }}>
              <div className="cycle-panel-header">
                <div>
                  <div className="cycle-panel-title">
                    {run.cycle_id}
                    <span style={{ color: statusColor(run.status), fontWeight: 600, marginLeft: 8, textTransform: "uppercase", fontSize: 12 }}>
                      {run.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gray3)", marginTop: 2 }}>
                    {run.triggered_by} · {run.total_items} new item(s) · {run.pending_count || 0} pending · {run.quarantined_count || 0} quarantined
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--gray3)", textAlign: "right" }}>
                  {/* Sanju changes - 29th June 2026 — IST */}
                  <div>Started: {formatIST(run.started_at)}</div>
                  {run.completed_at && <div>Completed: {formatIST(run.completed_at)}</div>}
                </div>
              </div>

              {/* Per-run counts shown as a compact line — the big KPI blocks
                  live only in the top stat cards. Sanju changes - 29th June 2026. */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--gray2)", margin: "2px 0 8px" }}>
                {DATA_CATEGORIES.filter(c => c.id !== "ALL").map(cat => (
                  <span key={cat.id}>
                    <span style={{ color: "var(--gray3)" }}>{cat.label.replace("Records", "").replace("Competitor ", "").trim()}:</span>
                    <b style={{ color: cat.color, marginLeft: 4 }}>{counts[cat.id] || 0}</b>
                  </span>
                ))}
              </div>

              {run.failure_reason && (
                <div className="failure-strip">
                  <span>⚠</span>
                  <div><span className="failure-name">Run failure</span><span className="failure-err">{run.failure_reason}</span></div>
                </div>
              )}

              {failures.length > 0
                ? failures.map((f, i) => (
                    <div key={i} className="failure-strip">
                      <span>✗</span>
                      <div>
                        <span className="failure-name">{f.connector_name} · {f.error_type}</span>
                        <span className="failure-err">
                          {f.error_detail} · {formatIST(f.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                : <div style={{ fontSize: 11.5, color: "var(--gray3)", padding: "2px 2px 4px" }}>No connector failures.</div>}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────── */
export default function CompetitorInventory() {
  const [activeTab,     setActiveTab]     = useState("inventory");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [competitor,    setCompetitor]    = useState("");
  const [newOnly,       setNewOnly]       = useState(false);
  const [lowConf,       setLowConf]       = useState(false);

  const [inventory,     setInventory]     = useState([]);
  const [stats,         setStats]         = useState(null);
  const [cycle,         setCycle]         = useState(null);
  const [adSummaries,   setAdSummaries]   = useState([]);
  const [pendingItems,  setPendingItems]  = useState([]);
  const [quarantine,    setQuarantine]    = useState([]);
  const [runLogs,       setRunLogs]       = useState([]); // Sanju changes - 29th June 2026
  const [total,         setTotal]         = useState(0);

  const [ingesting,     setIngesting]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [downloadingLog, setDownloadingLog] = useState(false); // Sanju changes - 29th June 2026
  const [error,         setError]         = useState(null);

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory({
        data_category:  activeCategory !== "ALL" ? activeCategory : undefined,
        competitor_name: competitor.trim() || undefined,
        new_this_cycle: newOnly ? "true" : undefined,
        low_confidence: lowConf ? "true" : undefined,
        page_size:      "100",
      });
      setInventory(data.items || []);
      setTotal(data.total || 0);
      setError(null);   // Sanju changes - 30th June 2026 — clear any stale error
                        // banner once a fetch succeeds (it used to persist forever
                        // after a transient failure, e.g. during a backend reload).
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, competitor, newOnly, lowConf]);

  // Fetch stats + cycle summary
  const fetchMeta = useCallback(async () => {
    try {
      const [statsData, cycleData, adsData, pendingData, qData, logsData] = await Promise.allSettled([
        getInventoryStats(),
        getLatestCycleSummary(),
        getAdSummaries(),
        getPendingItems(),
        getQuarantine(),
        getRunLogs(), // Sanju changes - 29th June 2026
      ]);
      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (cycleData.status === "fulfilled") setCycle(cycleData.value?.cycle || null);
      if (adsData.status  === "fulfilled") setAdSummaries(adsData.value?.summaries || []);
      if (pendingData.status === "fulfilled") setPendingItems(pendingData.value?.items || []);
      if (qData.status === "fulfilled") setQuarantine(qData.value?.items || []);
      if (logsData.status === "fulfilled") setRunLogs(logsData.value?.logs || []); // Sanju changes - 29th June 2026
    } catch (_) {}
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  // Trigger ingestion
  async function handleTriggerIngestion() {
    setIngesting(true);
    setError(null);
    try {
      await triggerIngestion("manual");
      await fetchInventory();
      await fetchMeta();
    } catch (e) {
      setError(e.message);
    } finally {
      setIngesting(false);
    }
  }

  // Download the ingestion run log (pdf | json). Sanju changes - 29th June 2026.
  async function handleDownloadLog(format = "pdf") {
    setDownloadingLog(true);
    setError(null);
    try {
      await downloadRunLog(format);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloadingLog(false);
    }
  }

  // Manual refresh — spins the icon for at least 600ms so the action
  // always reads as "refreshing", even when the fetch returns instantly.
  async function handleRefresh() {
    setRefreshing(true);
    const start = Date.now();
    try {
      await fetchInventory();
    } finally {
      const elapsed = Date.now() - start;
      setTimeout(() => setRefreshing(false), Math.max(0, 600 - elapsed));
    }
  }

  const catCounts = stats?.by_category || {};
  const pendingCount    = pendingItems.length;
  const quarantineCount = quarantine.length;

  return (
    <div className="inv-root">
      {/* Topbar */}
      <header className="inv-topbar">
        <div className="inv-tb-brand">
          <span className="inv-tb-title">Competitor Claims Inventory</span>
          {/* <span className="inv-tb-divider" />
          <span className="inv-tb-sub">US 2.2 — Ingestion &amp; Classification</span> */}
        </div>
        <div className="inv-tb-right">
          {ingesting && (
            <div className="ingesting-indicator">
              <div className="spin-ring" />
              Running ingestion cycle…
            </div>
          )}
          {/* Sanju changes - 29th June 2026 — Download Log (PDF) button beside Run Ingestion Cycle */}
          <button className="inv-btn inv-btn--outline" onClick={() => handleDownloadLog("pdf")} disabled={downloadingLog}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
            {downloadingLog ? "Preparing…" : "Download Log (PDF)"}
          </button>
          <button className="inv-btn inv-btn--teal" onClick={handleTriggerIngestion} disabled={ingesting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Run Ingestion Cycle
          </button>
        </div>
      </header>

      <div className="inv-body">
        {/* Sidebar */}
        {/* <aside className="inv-sidebar">
         
          {cycle && (
            <div className="sidebar-section">
              <div className="sidebar-heading">Last Cycle</div>
              <div className="cycle-info">
                <div className="cycle-info-label">Cycle ID</div>
                <div className="cycle-info-value">{cycle.cycle_id}</div>
                <div className="cycle-info-sub">
                  {cycle.status} · {cycle.total_items} items
                </div>
                <div className="cycle-info-sub">
                  {cycle.started_at ? new Date(cycle.started_at).toLocaleString("en-GB", { timeZone: "UTC" }) : "—"}
                </div>
              </div>
            </div>
          )}

         
          <div className="sidebar-section">
            <div className="sidebar-heading">Data Category</div>
            {DATA_CATEGORIES.map(cat => (
              <div
                key={cat.id}
                className={`sidebar-stat ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => { setActiveCategory(cat.id); setActiveTab("inventory"); }}
              >
                <div className="stat-left">
                  <span className="stat-dot" style={{ background: cat.dot }} />
                  <span className="stat-label">{cat.id === "ALL" ? "All Categories" : cat.label}</span>
                </div>
                <span className="stat-count">
                  {cat.id === "ALL"
                    ? (stats?.total_items || 0)
                    : (catCounts[cat.id] || 0)}
                </span>
              </div>
            ))}
          </div>

         
          {pendingCount > 0 && (
            <div className="alert-badge alert-badge--amber" onClick={() => setActiveTab("pending")}>
              <span>⏳</span>
              <span>{pendingCount} pending — CTS Admin review</span>
            </div>
          )}
          {quarantineCount > 0 && (
            <div className="alert-badge alert-badge--red" onClick={() => setActiveTab("quarantine")}>
              <span>🔴</span>
              <span>{quarantineCount} quarantined — AE language</span>
            </div>
          )}
        </aside> */}

        {/* Main */}
        <main className="inv-main">
          {/* Page heading */}
          <div className="inv-page-heading">
            {/* <h1>Competitor Claims Inventory</h1> */}
            <p>
              Structured competitive intelligence — classified into five Data Categories,
              confidence-scored, AE-screened, and ad-channel-mapped.
              Click any item to inspect the full record and source text.
            </p>
          </div>

          {/* Stat cards — display only (filtering is done via the toolbar filter). */}
          <div className="stat-cards">
            {DATA_CATEGORIES.filter(c => c.id !== "ALL").map(cat => (
              <div
                key={cat.id}
                className="stat-card stat-card--static"
              >
                <div className="sc-label">{cat.label}</div>
                <div className="sc-count" style={{ color: cat.color }}>{catCounts[cat.id] || 0}</div>
                <div className="sc-sub">{cat.id === "COMPETITOR_CLAIM" ? "conf. scored" : cat.id === "AD_ACTIVITY_RECORD" ? "no spend data" : "items"}</div>
              </div>
            ))}
          </div>

          {/* Sanju changes - 29th June 2026 — "Last Cycle" summary moved out of the
              (removed) sidebar to sit above the Inventory tabs. Reuses the existing
              sidebar-heading / cycle-info classnames. */}
          {cycle && (
            <div className="inv-lastcycle">
              <div className="sidebar-heading">Last Cycle</div>
              <div className="cycle-info">
                <div className="cycle-info-label">Cycle ID</div>
                <div className="cycle-info-value">{cycle.cycle_id}</div>
                <div className="cycle-info-sub">{cycle.status} · {cycle.total_items} items</div>
                <div className="cycle-info-sub">{formatIST(cycle.started_at)}</div>
              </div>
            </div>
          )}

          {/* Cycle panel */}
          <CyclePanel cycle={cycle} />

          {/* Error */}
          {error && (
            <div className="failure-strip" style={{ marginBottom: 16 }}>
              <span>⚠</span>
              <div><span className="failure-name">API Error</span><span className="failure-err">{error}</span></div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab-btn ${activeTab === "inventory" ? "active" : ""}`} onClick={() => setActiveTab("inventory")}>
              Inventory
              <span className="tab-badge">{total}</span>
            </button>
            <button className={`tab-btn ${activeTab === "adSummaries" ? "active" : ""}`} onClick={() => setActiveTab("adSummaries")}>
              Ad Summaries
              <span className="tab-badge">{adSummaries.length}</span>
            </button>
            <button className={`tab-btn ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
              Pending Queue
              {pendingCount > 0 && <span className="tab-badge tab-badge--alert">{pendingCount}</span>}
            </button>
            <button className={`tab-btn ${activeTab === "quarantine" ? "active" : ""}`} onClick={() => setActiveTab("quarantine")}>
              Quarantine
              {quarantineCount > 0 && <span className="tab-badge tab-badge--alert">{quarantineCount}</span>}
            </button>
            {/* Sanju changes - 29th June 2026 — Ask AI + Run Log tabs (same tab-btn styling) */}
            <button className={`tab-btn ${activeTab === "askAI" ? "active" : ""}`} onClick={() => setActiveTab("askAI")}>
              Ask AI
            </button>
            <button className={`tab-btn ${activeTab === "runLog" ? "active" : ""}`} onClick={() => setActiveTab("runLog")}>
              Run Log
              <span className="tab-badge">{runLogs.length}</span>
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "inventory" && (
            <>
              {/* Toolbar */}
              <div className="inv-toolbar">
                <input
                  className="filter-input"
                  placeholder="Filter by competitor…"
                  value={competitor}
                  onChange={e => setCompetitor(e.target.value)}
                />
                <select className="filter-select" value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>
                  {DATA_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer" }}>
                  <input type="checkbox" checked={newOnly} onChange={e => setNewOnly(e.target.checked)} />
                  New this cycle only
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer" }}>
                  <input type="checkbox" checked={lowConf} onChange={e => setLowConf(e.target.checked)} />
                  Low confidence only
                </label>
                <div className="toolbar-spacer" />
                <button className="inv-btn inv-btn--outline inv-btn--sm" onClick={handleRefresh} disabled={refreshing}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={refreshing ? "inv-refresh-spin" : ""}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {/* Table */}
              <div className="inv-table-wrap">
                <div className="inv-table-header">
                  <span className="inv-table-title">
                    {DATA_CATEGORIES.find(c => c.id === activeCategory)?.label || "All Categories"}
                  </span>
                  <span className="inv-table-count">{total} items</span>
                </div>

                {loading ? (
                  <div className="empty-state">
                    <div className="spin-ring" style={{ width: 24, height: 24, borderWidth: 3, margin: "0 auto 12px" }} />
                    <p>Loading inventory…</p>
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3>No items found</h3>
                    <p>Run an ingestion cycle or adjust your filters.</p>
                  </div>
                ) : (
                  inventory.map(item => <InventoryItem key={item.item_id} item={item} />)
                )}
              </div>
            </>
          )}

          {activeTab === "adSummaries"  && <AdSummaryPanel summaries={adSummaries} />}
          {activeTab === "pending"      && <PendingPanel items={pendingItems} onResolve={id => console.log("resolve", id)} />}
          {activeTab === "quarantine"   && <QuarantinePanel items={quarantine} />}
          {/* Sanju changes - 29th June 2026 — Ask AI + Run Log panels */}
          {activeTab === "askAI"        && <AskAIPanel />}
          {activeTab === "runLog"       && <RunLogPanel logs={runLogs} onDownload={handleDownloadLog} downloading={downloadingLog} />}
        </main>
      </div>
    </div>
  );
}
