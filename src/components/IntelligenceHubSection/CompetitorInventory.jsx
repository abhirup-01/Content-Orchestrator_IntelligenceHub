import { useState, useEffect, useCallback } from "react";
import {
  getInventory,
  getInventoryStats,
  getLatestCycleSummary,
  getAdSummaries,
  getPendingItems,
  getQuarantine,
  triggerIngestion,
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
    { label: "Detected",        value: item.detected_date ? new Date(item.detected_date).toLocaleString("en-GB", { timeZone: "UTC" }) : "—" },
    { label: "Reliability",     value: item.reliability },
    { label: "Layer 4 Routed",  value: item.layer4_routed ? "Yes" : "No" },
    ...(cat === "APPROVAL_RECORD"   ? [{ label: "Approval Type", value: item.approval_type }, { label: "Authority", value: item.authority }, { label: "App No.", value: item.application_num || "—" }] : []),
    ...(cat === "TRIAL_RECORD"      ? [{ label: "Trial ID", value: item.trial_id }, { label: "Phase", value: item.trial_phase || "—" }, { label: "Status", value: item.trial_status || "—" }, { label: "Change", value: item.change_type || "—" }] : []),
    ...(cat === "COMPETITOR_CLAIM"  ? [{ label: "Claim Type", value: item.claim_type || "—" }, { label: "Confidence", value: `${item.confidence_score}/100` }] : []),
    ...(cat === "COMPETITOR_NARRATIVE" ? [{ label: "Evidence Items", value: (item.evidence_item_ids || []).join(", ") || "—" }, { label: "Confidence", value: `${item.confidence_score}/100` }] : []),
    ...(cat === "AD_ACTIVITY_RECORD" ? [
      { label: "Channels",        value: (item.channels || []).join(", ") },
      { label: "Observations",    value: item.observation_count?.toLocaleString() || "—" },
      { label: "Prior 30d",       value: item.observation_count_prior_30d?.toLocaleString() || "—" },
      { label: "Trend",           value: `${item.trend_direction || "—"}${item.trend_pct_change != null ? ` (${item.trend_pct_change > 0 ? "+" : ""}${item.trend_pct_change}%)` : ""}` },
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
             {/* {item.data_category === "COMPETITOR_CLAIM" && item.confidence_score != null && (
              <ConfidenceBar score={item.confidence_score} flagged={item.low_confidence_flag} />
            )}
            {item.data_category === "COMPETITOR_NARRATIVE" && item.confidence_score != null && (
              <ConfidenceBar score={item.confidence_score} />
            )} 
            {item.data_category === "AD_ACTIVITY_RECORD" && item.trend_direction && (
              <span className={TREND_ICONS[item.trend_direction]?.cls || "trend-flat"}>
                {TREND_ICONS[item.trend_direction]?.label}
                {item.trend_pct_change != null ? ` ${item.trend_pct_change > 0 ? "+" : ""}${item.trend_pct_change}%` : ""}
              </span>
            )} */}
          </div>
        </div>
        <div className="item-right">
          <div className="item-date">
            {item.detected_date ? new Date(item.detected_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
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
  const counts = cycle.item_counts || {};
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
          <div>Started: {new Date(cycle.started_at).toLocaleString("en-GB", { timeZone: "UTC" })}</div>
          {cycle.completed_at && <div>Completed: {new Date(cycle.completed_at).toLocaleString("en-GB", { timeZone: "UTC" })}</div>}
        </div>
      </div>

      <div className="cycle-kpi-row">
        {DATA_CATEGORIES.filter(c => c.id !== "ALL").map(cat => (
          <div key={cat.id} className="cycle-kpi">
            <div className="cycle-kpi-label">{cat.label.replace("Records", "").replace("Competitor ", "").trim()}</div>
            <div className="cycle-kpi-value" style={{ color: cat.color }}>{counts[cat.id] || 0}</div>
            <div className="cycle-kpi-sub">items</div>
          </div>
        ))}
      </div>

      {cycle.connector_failures?.length > 0 && cycle.connector_failures.map((f, i) => (
        <div key={i} className="failure-strip">
          <span>⚠</span>
          <div>
            <span className="failure-name">{f.connector_name}</span>
            <span className="failure-err">{f.error_type} · {new Date(f.timestamp).toLocaleString("en-GB", { timeZone: "UTC" })}</span>
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
              <div style={{ fontSize: 11, color: "var(--gray3)" }}>{s.cycle_id} · {new Date(s.generated_at).toLocaleDateString("en-GB")}</div>
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
              <div style={{ fontSize: 11.5, color: "var(--gray3)", marginBottom: 6 }}>{p.source_name} · {new Date(p.detected_date).toLocaleDateString("en-GB")}</div>
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
            {q.competitor_name} · {new Date(q.detected_date).toLocaleDateString("en-GB")} · Routed to: {q.routed_to}
          </div>
        </div>
      ))}
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
  const [total,         setTotal]         = useState(0);

  const [ingesting,     setIngesting]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, competitor, newOnly, lowConf]);

  // Fetch stats + cycle summary
  const fetchMeta = useCallback(async () => {
    try {
      const [statsData, cycleData, adsData, pendingData, qData] = await Promise.allSettled([
        getInventoryStats(),
        getLatestCycleSummary(),
        getAdSummaries(),
        getPendingItems(),
        getQuarantine(),
      ]);
      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (cycleData.status === "fulfilled") setCycle(cycleData.value?.cycle || null);
      if (adsData.status  === "fulfilled") setAdSummaries(adsData.value?.summaries || []);
      if (pendingData.status === "fulfilled") setPendingItems(pendingData.value?.items || []);
      if (qData.status === "fulfilled") setQuarantine(qData.value?.items || []);
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

          {/* Stat cards */}
          <div className="stat-cards">
            {DATA_CATEGORIES.filter(c => c.id !== "ALL").map(cat => (
              <div
                key={cat.id}
                className={`stat-card ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => { setActiveCategory(cat.id); setActiveTab("inventory"); }}
              >
                <div className="sc-label">{cat.label}</div>
                <div className="sc-count" style={{ color: cat.color }}>{catCounts[cat.id] || 0}</div>
                <div className="sc-sub">{cat.id === "COMPETITOR_CLAIM" ? "conf. scored" : cat.id === "AD_ACTIVITY_RECORD" ? "no spend data" : "items"}</div>
              </div>
            ))}
          </div>

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
        </main>
      </div>
    </div>
  );
}
