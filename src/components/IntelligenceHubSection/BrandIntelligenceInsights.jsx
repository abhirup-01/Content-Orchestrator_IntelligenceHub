// US 1.4 — Profile view & AI-derived insights (AC #6–10).
//
// Once a profile is activated, this panel lets the Brand Manager filter by
// indication + audience segment and asks the backend for two derived views:
//   1. Content Pattern Summary
//   2. Audience-Specific Alignment View
// Each insight carries a confidence indicator, source citations, and the
// mandatory disclaimer per AC #9.
//
// What this view DOES NOT show (AC #10 explicit exclusions):
//   - Performance / engagement metrics
//   - Effectiveness scoring or ranking
//   - Recommendations or next best actions
//   - Channel / campaign / Rx data
//
// Forward-compat:
//   - US 1.7 deep-dive into Claims Inventory: link out, don't duplicate UI here.
//   - US 1.5 incremental refresh: insights are derived from the activated
//     version — once a newer version is activated, this view re-fetches.

import { useEffect, useMemo, useState } from "react";
import {
  Telescope,
  Filter,
  AlertCircle,
  Loader2,
  Sparkles,
  Users,
  PenSquare,
  Quote,
  Info,
} from "lucide-react";

import { getInsights } from "../api/intelligenceHubApi";

// Pre-defined audience segments per BRD US 1.4 AC #6b. Indications are
// derived from the profile data passed in via props — the backend will
// produce more once US 1.5 lands.
const AUDIENCE_OPTIONS = [
  { value: "",          label: "All audiences" },
  { value: "HCP",       label: "HCPs"          },
  { value: "patient",   label: "Patients"      },
  { value: "caregiver", label: "Caregivers"    },
  { value: "payer",     label: "Payers"        },
];

const DISCLAIMER =
  "Derived from brand guidelines and approved content. Not performance-based.";

/**
 * @param {object}   props
 * @param {string}   props.profileId
 * @param {object}   props.profile           - the activated profile (for indication choices + claim count)
 * @param {boolean}  props.enabled           - false until activated
 */
export default function BrandIntelligenceInsights({
  profileId,
  profile,
  enabled,
}) {
  const [indication, setIndication] = useState("");
  const [audience,   setAudience]   = useState("");
  const [insights,   setInsights]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  // Indications are derived from the profile's claims_inventory — every
  // approved claim carries the indication it applies to. This keeps the
  // filter dropdown grounded in real source data, no hardcoded list.
  const indicationOptions = useMemo(() => {
    const set = new Set();
    const items = profile?.claimsInventory?.items || [];
    items.forEach((it) => {
      if (it?.indication) set.add(String(it.indication));
    });
    return [
      { value: "", label: "All indications" },
      ...Array.from(set).sort().map((v) => ({ value: v, label: v })),
    ];
  }, [profile]);

  const fetchInsights = async () => {
    if (!profileId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getInsights(profileId, indication || null, audience || null);
      setInsights(data || null);
      setHasFetched(true);
    } catch (err) {
      if (err?.response?.status === 404) {
        setInsights(null);
        setHasFetched(true);
        setError(
          "Insights endpoint isn't deployed yet. UI is ready — wire GET /profile/{id}/insights in the backend to populate."
        );
      } else {
        setError(
          err?.response?.data?.detail || err?.message || "Failed to load insights."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) {
    return (
      <div className="bii-card bii-card--locked" aria-label="Insights (locked)">
        <div className="bii-head">
          <div className="bii-titleRow">
            <Telescope className="bii-headIcon" size={18} strokeWidth={2} />
            <h4 className="bii-title">Brand guidance insights</h4>
            <span className="bii-lockedPill">Activate to unlock</span>
          </div>
          <p className="bii-sub">
            Once you activate the profile, this panel will surface AI-derived
            Content Pattern and Audience-Specific Alignment views — derived
            from brand guidelines and approved content only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bii-card" aria-label="Brand guidance insights">
      <div className="bii-head">
        <div className="bii-titleRow">
          <Telescope className="bii-headIcon" size={18} strokeWidth={2} />
          <h4 className="bii-title">Brand guidance insights</h4>
        </div>
        <p className="bii-sub">
          Filter by indication and audience segment to see how the brand
          expects content to be framed. <em>{DISCLAIMER}</em>
        </p>
      </div>

      <div className="bii-filterBar">
        <div className="bii-filterField">
          <label className="bii-filterLabel" htmlFor="bii-indication">
            <Filter size={11} strokeWidth={2.4} />
            <span>Indication</span>
          </label>
          <select
            id="bii-indication"
            className="bii-select"
            value={indication}
            onChange={(e) => setIndication(e.target.value)}
          >
            {indicationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="bii-filterField">
          <label className="bii-filterLabel" htmlFor="bii-audience">
            <Users size={11} strokeWidth={2.4} />
            <span>Audience segment</span>
          </label>
          <select
            id="bii-audience"
            className="bii-select"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            {AUDIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="bii-applyBtn"
          onClick={fetchInsights}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={13} strokeWidth={2.4} className="bii-spin" />
              <span>Deriving…</span>
            </>
          ) : (
            <>
              <Sparkles size={13} strokeWidth={2.4} />
              <span>Derive insights</span>
            </>
          )}
        </button>
      </div>

      {!hasFetched && !error && !loading && (
        <div className="bii-empty">
          <Info size={14} strokeWidth={2.2} />
          <span>
            Pick a filter combination and click <strong>Derive insights</strong>{" "}
            to see Content Pattern + Audience-Specific Alignment views.
          </span>
        </div>
      )}

      {error && (
        <div className="bii-banner bii-banner-warn" role="alert">
          <AlertCircle size={14} strokeWidth={2.4} />
          <span>{error}</span>
        </div>
      )}

      {hasFetched && !error && insights && (
        <div className="bii-insightsGrid">
          <InsightCard
            icon={<PenSquare size={14} strokeWidth={2.2} />}
            title="Content Pattern Summary"
            description="Predominant content types, messaging angles, claim categories, and tone characteristics in approved history."
            payload={insights.content_pattern}
          />
          <InsightCard
            icon={<Users size={14} strokeWidth={2.2} />}
            title="Audience-Specific Alignment"
            description={
              audience
                ? `Depth, language, tone expectations and restrictions for ${audience}.`
                : "Depth, language, tone expectations and restrictions across audiences."
            }
            payload={insights.audience_alignment}
            audienceMode
          />
          <p className="bii-disclaimer">{insights.disclaimer || DISCLAIMER}</p>
        </div>
      )}
    </div>
  );
}

function InsightCard({ icon, title, description, payload, audienceMode }) {
  if (!payload) {
    return (
      <div className="bii-insightCard bii-insightCard--empty">
        <div className="bii-insightHead">
          {icon}
          <span>{title}</span>
        </div>
        <p className="bii-insightDesc">{description}</p>
        <div className="bii-empty">
          No data returned for this filter combination.
        </div>
      </div>
    );
  }

  const conf =
    typeof payload.confidence === "number"
      ? Math.round(Math.max(0, Math.min(1, payload.confidence)) * 100)
      : null;

  return (
    <div className="bii-insightCard">
      <div className="bii-insightHead">
        {icon}
        <span>{title}</span>
        {conf !== null && (
          <ConfidenceChip score={conf} />
        )}
      </div>
      <p className="bii-insightDesc">{description}</p>

      {payload.summary && (
        <p className="bii-insightSummary">{payload.summary}</p>
      )}

      {!audienceMode && (
        <>
          <InsightList label="Messaging angles"  items={payload.messaging_angles} />
          <InsightList label="Tone dimensions"   items={payload.tone_dimensions} />
          <InsightList label="Claim categories"  items={payload.claim_categories} />
        </>
      )}

      {audienceMode && (
        <>
          <InsightKV label="Depth"            value={payload.depth} />
          <InsightKV label="Complexity"       value={payload.complexity} />
          <InsightKV label="Language & tone"  value={payload.language_tone} />
          <InsightList label="Common restrictions" items={payload.restrictions} />
        </>
      )}

      {Array.isArray(payload.citations) && payload.citations.length > 0 && (
        <div className="bii-citationsRow">
          <Quote size={11} strokeWidth={2.4} />
          <span className="bii-citationsLabel">Derived from</span>
          {payload.citations.slice(0, 6).map((c, i) => (
            <span key={i} className="bii-citationChip">
              {typeof c === "string" ? c : c.name || c.document_id || "source"}
            </span>
          ))}
          {payload.citations.length > 6 && (
            <span className="bii-citationMore">+{payload.citations.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ConfidenceChip({ score }) {
  const tone = score >= 75 ? "high" : score >= 50 ? "mid" : "low";
  return (
    <span className={`bii-confChip bii-confChip--${tone}`} title="Confidence">
      {score}%
    </span>
  );
}

function InsightKV({ label, value }) {
  if (!value) return null;
  return (
    <div className="bii-kv">
      <span className="bii-kvLabel">{label}</span>
      <span className="bii-kvValue">{value}</span>
    </div>
  );
}

function InsightList({ label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="bii-list">
      <div className="bii-listLabel">{label}</div>
      <ul>
        {items.map((it, i) => (
          <li key={i}>{typeof it === "string" ? it : it?.label || JSON.stringify(it)}</li>
        ))}
      </ul>
    </div>
  );
}
