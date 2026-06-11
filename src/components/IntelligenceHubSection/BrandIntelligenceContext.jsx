// Author: Abhirup Nandi — 2026-05-20
// Modified by Abhirup Nandi — 2026-05-20: Added Veeva Vault document fetch
// triggered on "Apply context" — parses asset names from the NL input and
// fetches matching documents from the Veeva API, mirroring the fetch pattern
// from BrandIntelligence.jsx. See inline "Added/Modified by Abhirup Nandi" markers.
//
// Modified by Abhirup Nandi — 2026-05-20: Converted Time period, Approval status,
// Regulatory milestones, and Document types from pill-button rows into
// native <select> dropdowns. All filter logic, Veeva fetch, and audit-panel
// behaviour is unchanged.

import { useState, useMemo } from "react";
import {
  Filter,
  Sparkles,
  CheckCircle2,
  X,
  Pencil,
  Calendar,
  ShieldCheck,
  Flag,
  FileType2,
  Wand2,
  Database,
  RefreshCw,
  AlertCircle,
  FileText,
  ChevronDown,
} from "lucide-react";
import { getveevaData } from "../api/dataService";
import "./IntelligenceCss/BrandIntelligenceContext.css";

/* ===== Filter catalogues ===== */

const TIME_PERIODS = [
  { value: "weekly",    label: "Weekly" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly",    label: "Yearly" },
];

const STATUSES = [
  { value: "approved", label: "Approved" },
  { value: "draft",    label: "Draft" },
  { value: "expired",  label: "Expired" },
];

const MILESTONES = [
  { value: "label",  label: "Latest label update" },
  { value: "pi",     label: "PI update" },
  { value: "safety", label: "Safety update" },
];

const DOC_TYPES = [
  { value: "claims",     label: "Claims" },
  { value: "guidelines", label: "Brand guidelines" },
  { value: "approved",   label: "Approved content" },
  { value: "reference",  label: "Reference" },
];

/* ===== Pure helpers ===== */

function toggleInSet(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function buildScopeBullets({ nlContext, timePeriod, statuses, milestones, docTypes }) {
  const bullets = [];

  if (statuses.size > 0) {
    if (statuses.has("approved") && !statuses.has("draft") && !statuses.has("expired")) {
      bullets.push({ label: "Regulatory status", value: "Approved documents only" });
    } else {
      const labels = STATUSES.filter((s) => statuses.has(s.value)).map((s) => s.label);
      bullets.push({ label: "Regulatory status", value: labels.join(", ") });
    }
  }

  if (statuses.has("approved")) {
    const dropped = [];
    if (!statuses.has("draft"))   dropped.push("Draft");
    if (!statuses.has("expired")) dropped.push("Expired");
    if (dropped.length > 0) {
      bullets.push({
        label: "Exclusions",
        value: `${dropped.join(" and ")} documents are excluded`,
      });
    }
  }

  if (milestones.has("label") && timePeriod == null) {
    bullets.push({
      label: "Time scope",
      value: "Documents created or approved after the most recent label update",
    });
  } else if (timePeriod) {
    const periodLabel = TIME_PERIODS.find((p) => p.value === timePeriod)?.label;
    bullets.push({ label: "Time scope", value: `${periodLabel} documents` });
  }

  if (milestones.size > 0) {
    const labels = MILESTONES.filter((m) => milestones.has(m.value)).map((m) => m.label);
    bullets.push({ label: "Event reference", value: labels.join(", ") });
  }

  if (docTypes.size > 0) {
    const labels = DOC_TYPES.filter((d) => docTypes.has(d.value)).map((d) => d.label);
    bullets.push({ label: "Document types", value: labels.join(", ") });
  }

  const nl = (nlContext || "").trim();
  if (nl) bullets.push({ label: "Additional intent", value: nl });

  return bullets;
}

function buildExclusionSentence({ statuses, milestones }) {
  const dropped = [];
  if (statuses.has("approved")) {
    if (!statuses.has("draft"))   dropped.push("Draft");
    if (!statuses.has("expired")) dropped.push("expired");
  }
  if (milestones.has("label")) dropped.push("pre–label-update");
  if (dropped.length === 0) {
    return "Documents that don't match the criteria above are automatically excluded.";
  }
  return `${dropped.join(", ")} content has been automatically excluded.`;
}

function formatRelative(date) {
  if (!date) return "—";
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 5)    return "just now";
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function extractAssetKeywords(nlText) {
  if (!nlText || !nlText.trim()) return [];
  const STOP_WORDS = new Set([
    "only","from","the","a","an","and","or","of","in","on","at","to","for",
    "with","by","any","all","after","before","since","that","this","these",
    "those","is","are","was","were","be","been","being","have","has","had",
    "do","does","did","will","would","shall","should","may","might","must",
    "can","could","not","no","nor","so","yet","both","either","neither",
    "just","very","also","than","then","there","when","where","how","what",
    "which","who","its","it","i","we","you","they","he","she","fetch","get",
    "show","include","excluding","except","please","use","using","documents",
    "document","docs","doc","content","files","file","assets","asset",
    "latest","recent","new","old","create","created","approved","draft",
    "expired","update","updates","upload","uploaded","based","needs","need",
  ]);
  return nlText
    .split(/[\s,;:.()\[\]'"]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t.toLowerCase()));
}

function mapVeevaToDoc(item, now) {
  const rawId = item?.document_id ?? item?.documentId;
  const id = rawId
    ? String(rawId)
    : `ctx-doc-veeva-${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`;
  const name = item?.file_name ?? item?.name ?? "(Untitled)";
  return { id, name, contentType: "claims", lastRefresh: now };
}

/* ===== Reusable dropdown component =====
 * Modified by Abhirup Nandi — 2026-05-20: replaces the pill-button rows.
 * Supports two modes:
 *   single  — value is null | string  (timePeriod)
 *   multi   — value is a Set<string>  (statuses, milestones, docTypes)
 * The displayed label shows the selected item(s) or the placeholder.
 */
function FilterDropdown({ icon: Icon, label, options, value, onChange, multi = false }) {
  const [open, setOpen] = useState(false);

  // Derive display label
  let displayLabel;
  if (multi) {
    const selected = options.filter((o) => value.has(o.value));
    displayLabel = selected.length === 0
      ? `Select ${label.toLowerCase()}…`
      : selected.length === 1
      ? selected[0].label
      : `${selected.length} selected`;
  } else {
    const found = options.find((o) => o.value === value);
    displayLabel = found ? found.label : `Select ${label.toLowerCase()}…`;
  }

  const hasValue = multi ? value.size > 0 : value != null;

  const handleOptionClick = (optValue) => {
    if (multi) {
      onChange(toggleInSet(value, optValue));
      // Keep dropdown open for multi so user can pick more
    } else {
      onChange(value === optValue ? null : optValue);
      setOpen(false);
    }
  };

  const clearValue = (e) => {
    e.stopPropagation();
    onChange(multi ? new Set() : null);
  };

  return (
    <div className="bic-ctx-filter">
      <div className="bic-ctx-filter-label">
        {/* Modified by Abhirup Nandi — 2026-05-25: bumped icon size + stroke
            and routed colour through CSS (.bic-ctx-filter-label svg) so the
            four filter icons read more clearly next to their labels. */}
        <Icon size={16} strokeWidth={2.2} className="bic-ctx-filter-label-icon" />
        <span>{label}</span>
      </div>

      <div className={`bic-ctx-dropdown ${open ? "is-open" : ""}`}>
        <button
          type="button"
          className={`bic-ctx-dropdown-trigger ${hasValue ? "has-value" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="bic-ctx-dropdown-label">{displayLabel}</span>
          <span className="bic-ctx-dropdown-icons">
            {hasValue && (
              <span
                className="bic-ctx-dropdown-clear"
                role="button"
                tabIndex={0}
                aria-label={`Clear ${label}`}
                onClick={clearValue}
                onKeyDown={(e) => e.key === "Enter" && clearValue(e)}
              >
                <X size={11} strokeWidth={2.5} />
              </span>
            )}
            <ChevronDown size={13} strokeWidth={2} className="bic-ctx-dropdown-chevron" />
          </span>
        </button>

        {open && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="bic-ctx-dropdown-backdrop"
              onClick={() => setOpen(false)}
            />
            <ul className="bic-ctx-dropdown-menu" role="listbox">
              {options.map((opt) => {
                const isSelected = multi ? value.has(opt.value) : value === opt.value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`bic-ctx-dropdown-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleOptionClick(opt.value)}
                  >
                    {multi && (
                      <span className={`bic-ctx-dropdown-check ${isSelected ? "is-checked" : ""}`}>
                        {isSelected && <CheckCircle2 size={12} strokeWidth={2.5} />}
                      </span>
                    )}
                    <span>{opt.label}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/* ===== Component ===== */

export default function BrandIntelligenceContext() {
  // Default-collapsed — Scope by context is an optional filter, not a
  // mandatory step. Collapsing it by default keeps the page focused on
  // the connectors + Run Ingestion flow; the user expands when they
  // actually want to narrow the document scope.
  const [expanded,   setExpanded]   = useState(false);
  const [nlContext,  setNlContext]  = useState("");
  const [timePeriod, setTimePeriod] = useState(null);
  const [statuses,   setStatuses]   = useState(new Set());
  const [milestones, setMilestones] = useState(new Set());
  const [docTypes,   setDocTypes]   = useState(new Set());

  const [appliedScope, setAppliedScope] = useState(null);

  const [veevaFetching,  setVeevaFetching]  = useState(false);
  const [veevaResults,   setVeevaResults]   = useState(null);
  const [veevaFetchedAt, setVeevaFetchedAt] = useState(null);

  const previewBullets = useMemo(
    () => buildScopeBullets({ nlContext, timePeriod, statuses, milestones, docTypes }),
    [nlContext, timePeriod, statuses, milestones, docTypes]
  );

  const hasAnySelection =
    nlContext.trim() !== "" ||
    timePeriod != null ||
    statuses.size > 0 ||
    milestones.size > 0 ||
    docTypes.size > 0;

  const isDirty = useMemo(() => {
    if (!appliedScope) return false;
    return JSON.stringify(previewBullets) !== JSON.stringify(appliedScope.bullets);
  }, [previewBullets, appliedScope]);

  const fetchAndFilterVeeva = async (keywords) => {
    setVeevaFetching(true);
    setVeevaResults(null);
    try {
      const res = await getveevaData();
      if (!res || !res.data) throw new Error("Veeva API returned no data");
      const json = res.data;
      const itemsArray =
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json)        ? json :
        (json && typeof json === "object") ? [json] : [];
      const now = new Date();
      const mapped = itemsArray.map((item) => mapVeevaToDoc(item, now));
      const filtered =
        keywords.length === 0
          ? mapped
          : mapped.filter((d) =>
              keywords.some((kw) => d.name.toLowerCase().includes(kw.toLowerCase()))
            );
      console.log(
        `[BrandIntelligenceContext] Veeva fetch: ${mapped.length} total, ${filtered.length} matched`,
        keywords
      );
      setVeevaResults(filtered);
      setVeevaFetchedAt(new Date());
    } catch (err) {
      console.warn("[BrandIntelligenceContext] Veeva fetch failed:", err);
      setVeevaResults("error");
    } finally {
      setVeevaFetching(false);
    }
  };

  const applyContext = () => {
    if (!hasAnySelection) return;
    const bullets   = previewBullets;
    const exclusion = buildExclusionSentence({ statuses, milestones });
    setAppliedScope({ bullets, exclusion, appliedAt: new Date() });
    const keywords  = extractAssetKeywords(nlContext);
    const wantsVeeva = keywords.length > 0 || docTypes.has("claims");
    if (wantsVeeva) {
      setVeevaResults(null);
      fetchAndFilterVeeva(keywords);
    } else {
      setVeevaResults(null);
      setVeevaFetchedAt(null);
    }
  };

  const clearAll = () => {
    setNlContext("");
    setTimePeriod(null);
    setStatuses(new Set());
    setMilestones(new Set());
    setDocTypes(new Set());
    setAppliedScope(null);
    setVeevaResults(null);
    setVeevaFetchedAt(null);
  };

  const editAppliedContext = () => {
    setAppliedScope(null);
    setVeevaResults(null);
    setVeevaFetchedAt(null);
  };

  // Modified by Abhirup Nandi — 2026-05-25: outer <section>, section label
  // ("Brand Intelligence Context"), and the .bic-ctx-card wrapper removed so
  // this component now slots directly inside BrandIntelligence's "Ingested
  // documents" card as a continuation. The form content starts with the
  // "Scope by context" header. The parent .bic-card provides the frame.
  return (
    <div className="bic-ctx-embedded" aria-label="Brand Intelligence Context">
      <div className="bic-ctx-embedded-divider" />

      <div className="bic-ctx-embedded-body">
        <div
          className="bic-ctx-head"
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          <div className="bic-ctx-title-row" style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Filter className="bic-ctx-head-icon" strokeWidth={2} />
            <h3 className="bic-ctx-title" style={{ margin:0, flex:"1 1 auto" }}>Scope by context</h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#64748b",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: 999,
                padding: "2px 8px",
                marginRight: 6,
              }}
            >
              Optional filter
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }} aria-hidden="true">
              {expanded ? "▲" : "▼"}
            </span>
          </div>
          {!expanded && (
            <p className="bic-ctx-sub" style={{ marginTop: 6 }}>
              Click to add filters (time period, approval status, document types).
              Skip to ingest all available documents.
            </p>
          )}
          {expanded && (
            <p className="bic-ctx-sub" style={{ marginTop: 6 }}>
              Describe which documents to include — the system identifies the relevant
              ones automatically, no manual file selection needed.
            </p>
          )}
        </div>

        {expanded && (
        <>

        {/* ── Structured filters — now dropdowns ── */}
        <div className="bic-ctx-filters">
          {/* Single-select */}
          <FilterDropdown
            icon={Calendar}
            label="Time period"
            options={TIME_PERIODS}
            value={timePeriod}
            onChange={setTimePeriod}
            multi={false}
          />

          {/* Multi-select */}
          <FilterDropdown
            icon={ShieldCheck}
            label="Approval status"
            options={STATUSES}
            value={statuses}
            onChange={setStatuses}
            multi={true}
          />

          <FilterDropdown
            icon={Flag}
            label="Regulatory milestones"
            options={MILESTONES}
            value={milestones}
            onChange={setMilestones}
            multi={true}
          />

          <FilterDropdown
            icon={FileType2}
            label="Document types"
            options={DOC_TYPES}
            value={docTypes}
            onChange={setDocTypes}
            multi={true}
          />
        </div>

        {/* Actions */}
        <div className="bic-ctx-actions">
          {isDirty && (
            <span className="bic-ctx-dirty-hint">Changes not applied yet</span>
          )}
          <button
            type="button"
            className="bic-ctx-btn-secondary"
            onClick={clearAll}
            disabled={!hasAnySelection && appliedScope == null}
          >
            <X size={14} strokeWidth={2} />
            <span>Clear</span>
          </button>
          <button
            type="button"
            className="bic-ctx-btn-primary"
            onClick={applyContext}
            disabled={!hasAnySelection || veevaFetching}
          >
            {veevaFetching ? (
              <RefreshCw size={14} strokeWidth={2} className="bic-ctx-spin" />
            ) : (
              <Sparkles size={14} strokeWidth={2.2} />
            )}
            <span>
              {veevaFetching
                ? "Fetching from Veeva…"
                : appliedScope
                ? "Re-apply context"
                : "Apply context"}
            </span>
          </button>
        </div>
        </>
        )}
      </div>{/* /bic-ctx-embedded-body */}

      {/* ─── Audit panel ─── */}
      {appliedScope && (
        <div className="bic-ctx-applied" role="status" aria-live="polite">
          <div className="bic-ctx-applied-head">
            <div className="bic-ctx-applied-title-row">
              <CheckCircle2 className="bic-ctx-applied-icon" strokeWidth={2.2} />
              <h4 className="bic-ctx-applied-title">Applied scope</h4>
            </div>
            <button type="button" className="bic-ctx-edit-btn" onClick={editAppliedContext}>
              <Pencil size={12} strokeWidth={2} />
              <span>Edit</span>
            </button>
          </div>

          <p className="bic-ctx-applied-intro">
            The system has scoped the document set using the following criteria:
          </p>

          <ul className="bic-ctx-applied-list">
            {appliedScope.bullets.map((b, idx) => (
              <li key={idx} className="bic-ctx-applied-row">
                <span className="bic-ctx-applied-key">{b.label}:</span>
                <span className="bic-ctx-applied-value">{b.value}</span>
              </li>
            ))}
          </ul>

          <div className="bic-ctx-applied-result">
            <strong>Result.</strong> Only documents that meet all the above conditions
            will be processed. {appliedScope.exclusion}
          </div>

          <div className="bic-ctx-applied-meta">
            Applied {formatRelative(appliedScope.appliedAt)} · Audit-ready
          </div>

          {/* Veeva Vault results panel */}
          {(veevaFetching || veevaResults !== null) && (
            <div className="bic-ctx-veeva-panel">
              <div className="bic-ctx-veeva-head">
                <Database size={13} strokeWidth={2} className="bic-ctx-veeva-icon" />
                <span className="bic-ctx-veeva-title">Veeva Vault — matched documents</span>
                {veevaFetchedAt && !veevaFetching && veevaResults !== "error" && (
                  <span className="bic-ctx-veeva-meta">
                    Fetched {formatRelative(veevaFetchedAt)}
                  </span>
                )}
              </div>

              {veevaFetching && (
                <div className="bic-ctx-veeva-loading">
                  <RefreshCw size={13} strokeWidth={2} className="bic-ctx-spin" />
                  <span>Fetching from Veeva Vault…</span>
                </div>
              )}

              {!veevaFetching && veevaResults === "error" && (
                <div className="bic-ctx-veeva-error">
                  <AlertCircle size={13} strokeWidth={2} />
                  <span>
                    Could not fetch from Veeva Vault. Check the connector configuration
                    and try re-applying the context.
                  </span>
                </div>
              )}

              {!veevaFetching && Array.isArray(veevaResults) && veevaResults.length === 0 && (
                <div className="bic-ctx-veeva-empty">
                  No Veeva documents matched the asset name(s) in your scope
                  description. Try broadening the keywords or checking the asset name.
                </div>
              )}

              {!veevaFetching && Array.isArray(veevaResults) && veevaResults.length > 0 && (
                <ul className="bic-ctx-veeva-list">
                  {veevaResults.map((d) => (
                    <li key={d.id} className="bic-ctx-veeva-row">
                      <FileText size={13} strokeWidth={2} className="bic-ctx-veeva-file-icon" />
                      <span className="bic-ctx-veeva-name">{d.name}</span>
                      <span className="bic-ctx-veeva-pill">Claims</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
