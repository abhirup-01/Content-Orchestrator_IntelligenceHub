/**
 * US 1.4 — Activate, View & Version-Control the Brand Intelligence Profile
 * Production React JSX — Light theme, editorial/clinical aesthetic
 *
 * ACs covered:
 *  AC1-2:   Activate → Active status, version stamp, timestamp, downstream notifications
 *  AC3:     BR-SIH-002 blocking message when profile not Active
 *  AC4-5:   Immutable version history with diff summaries
 *  AC6-8:   Filter by indication + audience → AI insights with confidence + derivation
 *  AC9-10:  Disclaimer labelling, explicit exclusions
 *  Roles:   Brand Manager (full), Medical Writer (read-only), Platform Admin (full)
 *
 * Modified by Sanju Kumari — 2026-05-29: wholesale replacement of the static
 * placeholder. Wires real backend calls (activateProfile, getProfileStatus,
 * acknowledgePartialProfile) and accepts profileId + user props from the
 * parent BrandIntelligence component.
 *
 * Refactored — inline styles extracted to US14App.css.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import "./IntelligenceCss/BrandIntelligenceActivation.css";

import {
  activateProfile,
  getProfileStatus,
  acknowledgePartialProfile,
  getProfile,
  getRun,
  runRecoveryScan,
} from "../api/intelligenceHubApi";
import { useToast } from "./Toast";

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
const SECTION_KEYS_FOR_SUMMARY = [
  "messaging_pillars",
  "tone_parameters",
  "claims_inventory",
  "prohibited_territory",
];

function computeSectionSummary(sections) {
  const out = { accepted: 0, edited: 0, flagged: 0, pending: 0 };
  if (!sections || typeof sections !== "object") return out;
  for (const k of SECTION_KEYS_FOR_SUMMARY) {
    const state = sections[k]?.state;
    if (state && Object.prototype.hasOwnProperty.call(out, state)) out[state] += 1;
  }
  return out;
}

function computeClaimsCount(sections) {
  const items = sections?.claims_inventory?.current_value?.items;
  return Array.isArray(items) ? items.length : 0;
}

function deriveDisplayName(user) {
  if (!user) return "Reviewer";
  const raw = String(user);
  if (!raw.includes("@")) return raw;
  const local = raw.split("@")[0].replace(/[0-9]+$/, "");
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return raw;
  return parts
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function formatActivationTime(date = new Date()) {
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextVersionLabel(versions, backendNumber) {
  if (backendNumber != null) return `v${backendNumber}`;
  return `v${(versions?.length || 0) + 1}`;
}

/* ─── Static data ─────────────────────────────────────────────────────────────── */
const INDICATIONS = [
  "Type 2 Diabetes",
  "Cardiovascular Risk",
  "Obesity / Weight Management",
];

const AUDIENCES = ["HCPs", "Patients", "Caregivers", "Payers"];

const DOWNSTREAM = [
  { name: "Initiative Hub",  detail: "Intelligence Context Record updated",  icon: "◎" },
  { name: "Content Studio",  detail: "Generation session pre-check cleared", icon: "◈" },
  { name: "Theme Synthesis", detail: "Brand truth state synchronised",       icon: "◆" },
];

const INSIGHTS = {
  "Type 2 Diabetes": {
    HCPs: {
      contentPattern: {
        types: ["MOA explainers", "Clinical trial summaries", "Safety & tolerability framing", "Comparative efficacy narratives"],
        angles: ["Evidence-led efficacy claims", "Patient outcome framing", "Head-to-head trial positioning"],
        tone: ["Clinical", "Evidence-based", "Authoritative", "Precise"],
        confidence: 91,
        derivation: "Derived from frequency analysis of 4 approved brand documents, cross-referenced with 14 MLR-approved claims in the Q3 claims inventory.",
        sources: ["Brand_Guidelines_2024.pdf §4.1", "MLR_Approved_Claims_Q3.docx", "Core_Messaging_Framework.pptx Slide 7"],
      },
      audienceAlignment: {
        depth: "High — clinical detail expected; mechanism specificity and statistical precision are standard expectations for this segment.",
        language: ["Scientific terminology accepted", "Statistical precision required (p-values, CI)", "Avoid oversimplification of MoA"],
        restrictions: ["No absolute efficacy language", "No comparative claims without trial citation", "Patient anecdote as supplement only — not primary evidence"],
        confidence: 88,
        derivation: "Derived from tone parameter profile and MLR rejection annotation analysis across 2023 rejection log entries flagged for HCP-directed content.",
        sources: ["Tone_of_Voice_Manual.pdf §2.1", "MLR_Rejection_Log_2023.xlsx — HCP segment annotations"],
      },
    },
    Patients: {
      contentPattern: {
        types: ["Disease education", "Lifestyle integration content", "Adherence support materials", "Outcome expectation setting"],
        angles: ["Quality-of-life improvement", "Daily routine compatibility", "Shared decision-making with HCP"],
        tone: ["Empathetic", "Accessible", "Reassuring", "Action-oriented"],
        confidence: 85,
        derivation: "Derived from approved patient-facing content patterns extracted from brand guidelines and tone manual, validated against approved claims.",
        sources: ["Brand_Guidelines_2024.pdf §4.3", "Tone_of_Voice_Manual.pdf §3.2"],
      },
      audienceAlignment: {
        depth: "Moderate — plain language is a priority; clinical jargon should be avoided or explained in lay terms.",
        language: ["Plain English required", "Empathy-led framing", "Action-oriented guidance", "Avoid clinical abbreviations"],
        restrictions: ["No trial statistics without lay summary", "No comparative brand mentions", "Avoid fear-based framing"],
        confidence: 83,
        derivation: "Based on tone parameter scoring for the Patients segment and rejection annotations from 2023 MLR log where plain language requirements were cited.",
        sources: ["Tone_of_Voice_Manual.pdf §3.2", "MLR_Rejection_Log_2023.xlsx — Patient segment"],
      },
    },
    Caregivers: {
      contentPattern: {
        types: ["Caregiver guidance materials", "Patient support tools", "Medication management aids", "HCP communication guides"],
        angles: ["Supporting patient adherence", "Managing treatment expectations", "Facilitating HCP dialogue"],
        tone: ["Supportive", "Practical", "Compassionate"],
        confidence: 79,
        derivation: "Derived from brand guidelines sections covering caregiver audience and analogous approved content patterns.",
        sources: ["Brand_Guidelines_2024.pdf §4.4"],
      },
      audienceAlignment: {
        depth: "Moderate — practical focus; emphasis on day-to-day management support rather than clinical detail.",
        language: ["Accessible language", "Action-oriented", "Caregiver-centric perspective", "Avoid clinical terms without explanation"],
        restrictions: ["No clinical detail without patient-first framing", "No jargon-heavy MoA content"],
        confidence: 76,
        derivation: "Derived from tone manual caregiver-specific guidance and cross-referenced with approved content patterns.",
        sources: ["Tone_of_Voice_Manual.pdf §3.3"],
      },
    },
    Payers: {
      contentPattern: {
        types: ["Health economic summaries", "Budget impact models", "Comparative effectiveness data", "Population outcomes evidence"],
        angles: ["Cost-effectiveness framing", "Population health outcomes", "Formulary positioning evidence"],
        tone: ["Analytical", "Data-driven", "Objective", "Outcomes-focused"],
        confidence: 82,
        derivation: "Derived from payer-segment brand guidance and approved claims with economic framing from the Q3 claims inventory.",
        sources: ["Core_Messaging_Framework.pptx", "MLR_Approved_Claims_Q3.docx — Payer claims subset"],
      },
      audienceAlignment: {
        depth: "High — health economic modelling depth is expected; outcomes data and budget impact evidence are standard.",
        language: ["HEOR terminology", "Statistical rigour required", "Outcomes-focused language", "Budget impact framing"],
        restrictions: ["No promotional tone", "No unsubstantiated cost claims", "Avoid patient testimonials as primary evidence"],
        confidence: 80,
        derivation: "Based on payer-segment tone parameters and MLR rejection annotations for economically-framed content.",
        sources: ["Brand_Guidelines_2024.pdf §5.1", "MLR_Rejection_Log_2023.xlsx — Payer annotations"],
      },
    },
  },
  "Cardiovascular Risk": {
    HCPs: {
      contentPattern: {
        types: ["CVOT data summaries", "CV risk reduction framing", "Safety profile content", "Real-world evidence summaries"],
        angles: ["Mortality benefit framing", "CV event reduction", "MACE endpoint evidence"],
        tone: ["Clinical", "Cautious", "Rigorous", "Evidence-based"],
        confidence: 87,
        derivation: "Derived from cardiovascular indication brand guidelines and CVOT-specific approved claims (SUSTAIN-6 data).",
        sources: ["Brand_Guidelines_2024.pdf §5.2", "MLR_Approved_Claims_Q3.docx #C-002"],
      },
      audienceAlignment: {
        depth: "Very high — specialist cardiology/endocrinology audience; full CVOT trial data and MACE endpoint specifics expected.",
        language: ["Cardiology terminology", "MACE endpoint language", "NNT / NNH framing", "Hazard ratio citations"],
        restrictions: ["No mortality claims without CVOT citation", "No absolute risk language", "No relative risk without absolute context"],
        confidence: 86,
        derivation: "Based on HCP-specific tone parameters for CV indication and MLR rejection annotations for cardiovascular claims.",
        sources: ["Tone_of_Voice_Manual.pdf §2.3"],
      },
    },
    Patients: {
      contentPattern: {
        types: ["Heart health education", "CV risk factor awareness", "Treatment adherence support"],
        angles: ["Protecting long-term heart health", "Understanding personal risk", "Partner in care narrative"],
        tone: ["Empathetic", "Motivating", "Clear", "Non-alarming"],
        confidence: 81,
        derivation: "Based on patient-facing CV brand guidance and approved messaging angles from the core messaging framework.",
        sources: ["Brand_Guidelines_2024.pdf §5.3"],
      },
      audienceAlignment: {
        depth: "Moderate — avoid overwhelming statistical detail; focus on what outcomes mean for the patient personally.",
        language: ["Plain language", "Reassurance-led framing", "Goal-oriented"],
        restrictions: ["No CVOT statistics without lay explanation", "No fear-based cardiovascular framing", "Avoid 'heart attack' without clinical context"],
        confidence: 78,
        derivation: "Derived from patient-segment tone manual and CV indication rejection annotations.",
        sources: ["Tone_of_Voice_Manual.pdf §3.1"],
      },
    },
    Caregivers: {
      contentPattern: {
        types: ["Caregiver CV risk education", "Monitoring support tools", "Recognising warning signs content"],
        angles: ["Supporting patient heart health journey", "Recognising and responding to symptoms"],
        tone: ["Supportive", "Practical", "Calm"],
        confidence: 74,
        derivation: "Based on caregiver-segment brand guidance for cardiovascular indication.",
        sources: ["Brand_Guidelines_2024.pdf §5.4"],
      },
      audienceAlignment: {
        depth: "Low-to-moderate — practical daily support focus; clinical depth not appropriate for this segment.",
        language: ["Accessible language", "Practical guidance tone"],
        restrictions: ["No clinical statistics without context", "No alarming symptom language without action guidance"],
        confidence: 72,
        derivation: "Derived from tone manual caregiver guidance applied to cardiovascular indication context.",
        sources: ["Tone_of_Voice_Manual.pdf §3.3"],
      },
    },
    Payers: {
      contentPattern: {
        types: ["CV outcomes health economics", "CVOT budget impact data", "Hospitalisation reduction evidence"],
        angles: ["Total cost of CV care", "Hospitalisation reduction", "Long-term outcomes value"],
        tone: ["Analytical", "Objective", "Evidence-driven"],
        confidence: 83,
        derivation: "Derived from payer brand guidance for CV indication and CVOT-specific economic claims.",
        sources: ["Core_Messaging_Framework.pptx", "MLR_Approved_Claims_Q3.docx — CV payer subset"],
      },
      audienceAlignment: {
        depth: "High — full HEOR modelling depth; CVOT cost-effectiveness evidence expected.",
        language: ["Health economics terminology", "Outcomes data language", "Budget impact framing"],
        restrictions: ["No promotional tone", "No unsubstantiated cost reduction claims"],
        confidence: 81,
        derivation: "Based on payer tone parameters and CV-specific rejection annotations.",
        sources: ["Brand_Guidelines_2024.pdf §5.5"],
      },
    },
  },
  "Obesity / Weight Management": {
    HCPs: {
      contentPattern: {
        types: ["Weight reduction outcome data", "BMI outcome summaries", "Comorbidity reduction framing", "Long-term maintenance evidence"],
        angles: ["Clinical weight targets", "Metabolic benefit framing", "Sustainable weight management"],
        tone: ["Clinical", "Evidence-based", "Non-stigmatising"],
        confidence: 84,
        derivation: "Derived from obesity indication brand guidelines and approved weight management claims.",
        sources: ["Brand_Guidelines_2024.pdf §6.1", "MLR_Approved_Claims_Q3.docx #C-004"],
      },
      audienceAlignment: {
        depth: "High — endocrinology / obesity specialist audience; clinical outcome data and comorbidity evidence expected.",
        language: ["Clinical obesity terminology", "BMI / waist circumference metrics", "Comorbidity outcome language"],
        restrictions: ["No appearance-based language", "No weight stigma framing", "Avoid 'overweight' as a negative descriptor"],
        confidence: 85,
        derivation: "Based on obesity-specific HCP tone parameters and rejection annotations for appearance-based language.",
        sources: ["Tone_of_Voice_Manual.pdf §2.4"],
      },
    },
    Patients: {
      contentPattern: {
        types: ["Health goal setting materials", "Lifestyle support content", "Progress expectation setting", "Adherence support"],
        angles: ["Health-led motivation", "Sustainable lifestyle change", "Medical support as enabler"],
        tone: ["Encouraging", "Non-judgmental", "Empowering", "Health-focused"],
        confidence: 80,
        derivation: "Derived from patient-facing obesity brand guidance with strong emphasis on non-stigmatising language requirements.",
        sources: ["Brand_Guidelines_2024.pdf §6.3"],
      },
      audienceAlignment: {
        depth: "Moderate — avoid clinical weight framing; focus on health goals and quality of life rather than weight numbers.",
        language: ["Non-stigmatising language mandatory", "Health outcome focus", "Empowerment framing", "Avoid weight-number emphasis"],
        restrictions: ["No appearance-based messaging", "No weight-shame language", "No before/after framing", "No BMI as sole measure of success"],
        confidence: 82,
        derivation: "Strongly shaped by MLR rejection annotations specifically flagging weight stigma and appearance-based content.",
        sources: ["Tone_of_Voice_Manual.pdf §3.4", "MLR_Rejection_Log_2023.xlsx — Obesity patient annotations"],
      },
    },
    Caregivers: {
      contentPattern: {
        types: ["Healthy habit reinforcement", "Supportive behaviour guidance"],
        angles: ["Supporting health goals", "Encouraging sustainable positive behaviours"],
        tone: ["Supportive", "Encouraging", "Non-judgmental"],
        confidence: 71,
        derivation: "Based on caregiver-segment brand guidance applied to obesity indication context.",
        sources: ["Brand_Guidelines_2024.pdf §6.4"],
      },
      audienceAlignment: {
        depth: "Low-to-moderate — supportive role only; clinical detail not appropriate.",
        language: ["Positive framing", "Non-judgmental language", "Encouragement-led"],
        restrictions: ["Absolutely no weight stigma language", "No body image language", "No appearance comparisons"],
        confidence: 70,
        derivation: "Derived from tone manual and obesity-specific rejection annotations.",
        sources: ["Tone_of_Voice_Manual.pdf §3.4"],
      },
    },
    Payers: {
      contentPattern: {
        types: ["Obesity HEOR summaries", "Comorbidity cost reduction data", "Long-term health cost modelling"],
        angles: ["Total cost of obesity-related comorbidities", "Downstream comorbidity prevention value"],
        tone: ["Analytical", "Data-driven", "Objective"],
        confidence: 79,
        derivation: "Derived from payer brand guidance for obesity indication and economic claims from the messaging framework.",
        sources: ["Core_Messaging_Framework.pptx"],
      },
      audienceAlignment: {
        depth: "High — population health economics expected; comorbidity cost evidence and HEOR modelling standard.",
        language: ["HEOR terminology", "Comorbidity cost framing", "Budget impact language"],
        restrictions: ["No promotional tone", "No appearance-based language even in economic framing", "No unsubstantiated cost claims"],
        confidence: 77,
        derivation: "Based on payer tone parameters and obesity-specific economic claim validation.",
        sources: ["Brand_Guidelines_2024.pdf §6.5"],
      },
    },
  },
};

const ROLES = ["Brand Manager", "Medical Writer", "Platform Admin"];

/* ─── Primitives ──────────────────────────────────────────────────────────────── */

function Badge({ variant = "neutral", children, dot }) {
  return (
    <span className={`badge badge--${variant}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}

function Btn({ variant = "ghost", size = "md", onClick, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`btn btn--${variant} btn--${size}`}
    >
      {children}
    </button>
  );
}

function Alert({ variant = "info", title, children }) {
  const icons = {
    info: "ℹ", warning: "⚠", danger: "✕", success: "✓", block: "⛔",
  };
  return (
    <div className={`alert alert--${variant}`}>
      <span className="alert__icon" aria-hidden="true">{icons[variant]}</span>
      <div className="alert__body">
        {title && <div className="alert__title">{title}</div>}
        <div className="alert__text">{children}</div>
      </div>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className="divider">
      {label && <span className="divider__label">{label}</span>}
      <div className="divider__line" />
    </div>
  );
}

function ConfBar({ value }) {
  const tier = value >= 85 ? "high" : value >= 75 ? "mid" : "low";
  return (
    <div className="conf-bar">
      <div className="conf-bar__track">
        <div
          className={`conf-bar__fill conf-bar__fill--${tier}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`conf-bar__value conf-bar__value--${tier}`}>{value}%</span>
    </div>
  );
}

function Tag({ children, color = "neutral" }) {
  return <span className={`tag tag--${color}`}>{children}</span>;
}

function Card({ children, accent, className = "" }) {
  const accentClass = accent ? `card--accent-${accent}` : "";
  return (
    <div className={`card ${accentClass} ${className}`.trim()}>
      {children}
    </div>
  );
}

function CardHeader({ label, action }) {
  return (
    <div className="card-header">
      <span className="card-header__label">{label}</span>
      {action}
    </div>
  );
}

/* ─── Tab: Activate ───────────────────────────────────────────────────────────── */
function ActivateTab({ profile, onActivate, profileId, user, role, onRecordVersion, onAcknowledgePartial }) {
  const toast = useToast();
  const [phase, setPhase]       = useState("idle");
  const [notified, setNotified] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [activatedAt, setActivatedAt]         = useState(null);
  const [activatedVersion, setActivatedVersion] = useState(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackBusy, setAckBusy]       = useState(false);
  const timerRef = useRef([]);

  const isPartial      = !!profile?.is_partial;
  const isAcknowledged = !!profile?.partial_acknowledged_by;
  const needsAck       = isPartial && !isAcknowledged;

  async function handleAcknowledge() {
    if (!profileId || !ackChecked || !onAcknowledgePartial) return;
    setErrorMsg("");
    setAckBusy(true);
    try {
      await onAcknowledgePartial();
      setAckChecked(false);
      toast.success("Partial coverage acknowledged — activation unlocked");
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Acknowledgement failed";
      setErrorMsg(detail);
      toast.error(`Acknowledgement failed — ${detail}`, 5000);
    } finally {
      setAckBusy(false);
    }
  }

  useEffect(() => () => timerRef.current.forEach(clearTimeout), []);

  async function handleActivate() {
    if (!profileId) {
      setErrorMsg("No profile_id supplied — pass profileId prop from the parent.");
      return;
    }
    if (profile?.is_partial && !profile?.partial_acknowledged_by) {
      setErrorMsg(
        "Partial coverage must be acknowledged before activation. Use the Acknowledge & Continue button above."
      );
      return;
    }
    setErrorMsg("");
    setPhase("activating");
    try {
      const res = await activateProfile(profileId, user);
      const result = res?.data || {};
      const now = new Date();
      const displayName = deriveDisplayName(user);
      const versionLabel = nextVersionLabel(undefined, result.version_number);
      setActivatedAt(now);
      setActivatedVersion(versionLabel);
      if (onRecordVersion) {
        onRecordVersion({
          version: versionLabel,
          status: "active",
          activatedBy: result.activated_by || displayName,
          role,
          activatedAt: formatActivationTime(now),
          diff:
            result.diff_summary ||
            "Profile activated — see backend audit log for the full diff once /profile/versions is wired.",
          changes: result.changes ?? 0,
          is_partial: !!result.is_partial,
          unavailable_connectors: result.unavailable_connectors || [],
        });
      }
      setPhase("notifying");
      DOWNSTREAM.forEach((m, i) => {
        const t = setTimeout(() => {
          setNotified((p) => [...p, m.name]);
          if (i === DOWNSTREAM.length - 1) {
            const t2 = setTimeout(() => {
              setPhase("done");
              onActivate(result);
              toast.success(
                `Profile activated — v${result.version_number} · ${DOWNSTREAM.length} downstream modules notified`,
                4500
              );
            }, 500);
            timerRef.current.push(t2);
          }
        }, 350 * (i + 1));
        timerRef.current.push(t);
      });
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Activation failed";
      console.warn("[ActivateTab] activate failed", err);
      setErrorMsg(detail);
      setPhase("idle");
      toast.error(`Activation failed — ${detail}`, 5000);
    }
  }

  const isActive = profile.status === "active";
  const isDone   = phase === "done" || isActive;

  return (
    <div>
      {/* Error banner */}
      {errorMsg && (
        <div role="alert" className="activate-error">
          <span className="activate-error__label">Activation failed:</span>
          <span className="activate-error__msg">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            className="activate-error__dismiss"
            aria-label="Dismiss"
          >×</button>
        </div>
      )}

      {/* Partial coverage — needs acknowledgement */}
      {needsAck && !isDone && (
        <div
          className="partial-banner"
          role="region"
          aria-label="Partial connector coverage"
        >
          <div className="partial-banner__row">
            <span className="partial-banner__icon" aria-hidden="true">⚠</span>
            <div className="partial-banner__body">
              <div className="partial-banner__title">Partial connector coverage</div>
              <div className="partial-banner__desc">
                The following data sources failed during ingestion and are not reflected in
                this draft. Activating means accepting that downstream content will be generated
                from incomplete brand truth.
              </div>
              {Array.isArray(profile?.unavailable_connectors) &&
                profile.unavailable_connectors.length > 0 && (
                  <ul className="partial-banner__list">
                    {profile.unavailable_connectors.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                )}
            </div>
          </div>
          <label className="partial-banner__ack-row">
            <input
              type="checkbox"
              checked={ackChecked}
              onChange={(e) => setAckChecked(e.target.checked)}
              disabled={ackBusy}
              className="partial-banner__ack-checkbox"
            />
            <span>I acknowledge this profile reflects partial coverage.</span>
          </label>
          <div className="partial-banner__footer">
            <Btn
              variant="activate"
              size="md"
              onClick={handleAcknowledge}
              disabled={!ackChecked || ackBusy}
            >
              {ackBusy ? "Acknowledging…" : "Acknowledge & Continue"}
            </Btn>
          </div>
        </div>
      )}

      {/* Partial coverage — acknowledged */}
      {isPartial && isAcknowledged && (
        <div className="partial-acked">
          <span aria-hidden="true">🏷️</span>
          <div className="partial-acked__body">
            <div className="partial-acked__title">Partial coverage acknowledged</div>
            <div className="partial-acked__meta">
              by {profile.partial_acknowledged_by} ·{" "}
              {profile.partial_acknowledged_at
                ? formatActivationTime(new Date(profile.partial_acknowledged_at))
                : "—"}
            </div>
            {Array.isArray(profile?.unavailable_connectors) &&
              profile.unavailable_connectors.length > 0 && (
                <div className="partial-acked__missing">
                  Missing: {profile.unavailable_connectors.join(", ")}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Hero card */}
      <Card accent={isDone ? "green" : "blue"} className="activate-hero">
        <div className="activate-hero__body">
          <div className="activate-hero__top">
            <div>
              <div className="activate-hero__heading">
                <span className="activate-hero__title">Activation Status</span>
                <Badge variant={isDone ? "active" : "awaiting"} dot>
                  {isDone ? "Active" : "Awaiting Activation"}
                </Badge>
              </div>
              <div className="activate-hero__metrics">
                {[
                  ["Version", profile.version],
                  [
                    "Sections reviewed",
                    profile.section_summary
                      ? `${(profile.section_summary.accepted || 0) + (profile.section_summary.edited || 0)} / 4`
                      : "—",
                  ],
                  ["Source documents", profile.document_count ?? "—"],
                  ["Approved claims",  profile.claims_count   ?? "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="activate-hero__metric-key">{k} </span>
                    <span className="activate-hero__metric-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              {!isDone && phase === "idle" && (
                <Btn
                  variant="activate"
                  size="lg"
                  onClick={handleActivate}
                  disabled={needsAck}
                  title={
                    needsAck
                      ? "Acknowledge partial coverage in the banner above before activating"
                      : undefined
                  }
                >
                  ⚡ Activate Profile
                </Btn>
              )}
              {phase === "activating" && <Btn variant="ghost" disabled>Activating…</Btn>}
              {phase === "notifying" && <Btn variant="ghost" disabled>Notifying modules…</Btn>}
              {isDone && (
                <div className="activate-hero__active-pill">
                  ✓ Profile Active — {profile.version}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* BR-SIH-002 block */}
      {!isDone && phase === "idle" && (
        <Alert variant="block" title="BR-SIH-002: Content Studio Generation Blocked">
          Content Studio cannot initiate a generation session while the Brand Intelligence
          Profile is in <strong>Awaiting Activation</strong> status. Activate the profile
          above to unblock downstream content generation.
        </Alert>
      )}

      {/* Activation log */}
      {phase !== "idle" && (
        <Card accent={isDone ? "green" : "blue"} className="log-card">
          <CardHeader label="Activation Log" />
          <div className="log-card__body">

            {/* Step 1 */}
            <div className="log-step">
              <span className={`log-step__bubble log-step__bubble--${phase !== "activating" ? "done" : "pending"}`}>
                {phase !== "activating" ? "✓" : "◐"}
              </span>
              <div>
                <div className="log-step__title">
                  Profile status set to <strong>Active</strong>
                </div>
                {phase !== "activating" && (
                  <div className="log-step__meta">
                    {activatedVersion || profile.version} · Activated by{" "}
                    {profile.activated_by || deriveDisplayName(user)} ({role}) ·{" "}
                    {formatActivationTime(activatedAt || new Date())}
                  </div>
                )}
              </div>
            </div>

            <Divider label="Downstream Notifications" />

            {DOWNSTREAM.map((m) => {
              const done = notified.includes(m.name) || phase === "done";
              return (
                <div key={m.name} className={`notif-row${done ? "" : " notif-row--pending"}`}>
                  <span className={`notif-bubble notif-bubble--${done ? "done" : "pending"}`}>
                    {done ? "✓" : "○"}
                  </span>
                  <span className="notif-row__name">{m.icon} {m.name}</span>
                  <span className="notif-row__detail">— {m.detail}</span>
                </div>
              );
            })}

            {isDone && (
              <div className="log-success-box">
                ✓ All downstream modules notified. Content Studio generation sessions are now
                unblocked. Profile is the active brand truth source.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Role access */}
      <Card>
        <CardHeader label="Role Access" />
        <div className="role-card__body">
          {[
            ["Brand Manager",                   "Full view + activate",         "active"],
            ["Medical Writer / Content Author",  "Read-only — approved outputs only", "blue"],
            ["Platform Admin",                  "Full access",                  "violet"],
          ].map(([r, access, v]) => (
            <div key={r} className="role-row">
              <span className="role-row__name">{r}</span>
              <Badge variant={v}>{access}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Tab: Version History ────────────────────────────────────────────────────── */
function VersionTab({ versions = [] }) {
  const [open, setOpen] = useState(null);

  return (
    <div>
      <Alert variant="info" title="Immutability Policy">
        Profile versions are <strong>immutable post-activation</strong>. Changes to brand
        source materials result in a new version. Prior versions remain accessible here and
        cannot be modified or re-activated directly.
      </Alert>

      {versions.length === 0 && (
        <div className="version-empty">
          No versions yet. Activate a profile from the <strong>Activate Profile</strong> tab
          to create the first immutable version.
        </div>
      )}

      {versions.map((v, i) => (
        <Card
          key={v.version}
          accent={v.status === "active" ? "green" : "border"}
          className="version-card"
        >
          <div
            className="version-row"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div className="version-row__left">
              <span className="version-row__label">{v.version}</span>
              <Badge variant={v.status === "active" ? "active" : "archived"} dot>
                {v.status === "active" ? "Active" : "Archived"}
              </Badge>
              {v.is_partial && (
                <span
                  className="version-row__partial-chip"
                  title={
                    Array.isArray(v.unavailable_connectors) && v.unavailable_connectors.length
                      ? `Missing: ${v.unavailable_connectors.join(", ")}`
                      : "This version was activated with partial connector coverage."
                  }
                >
                  Partial Coverage
                </span>
              )}
              <span className="version-row__timestamp">{v.activatedAt}</span>
            </div>
            <div className="version-row__right">
              <Badge variant="neutral">{v.changes} change{v.changes !== 1 ? "s" : ""}</Badge>
              <span className="version-row__chevron">{open === i ? "▲" : "▼"}</span>
            </div>
          </div>

          {open === i && (
            <div className="version-detail">
              <div className="version-detail__meta">
                <div>
                  <div className="version-detail__meta-label">Activated By</div>
                  <div className="version-detail__meta-name">{v.activatedBy}</div>
                  <div className="version-detail__meta-role">{v.role}</div>
                </div>
                <div>
                  <div className="version-detail__meta-label">Timestamp</div>
                  <div className="version-detail__meta-ts">{v.activatedAt}</div>
                </div>
              </div>

              <div className="version-detail__diff">
                <div className="version-detail__diff-label">Diff Summary</div>
                {v.diff}
              </div>

              {v.status === "archived" && (
                <div className="version-detail__immutable">
                  🔒 This version is immutable and read-only. It cannot be re-activated or
                  modified. To apply changes, create a new version by updating source materials
                  and re-running ingestion.
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ─── Tab: Insights ───────────────────────────────────────────────────────────── */
function InsightsTab({ isActive }) {
  const [indication, setIndication] = useState(INDICATIONS[0]);
  const [audience, setAudience]     = useState(AUDIENCES[0]);

  if (!isActive) {
    return (
      <div className="insights-locked">
        <div className="insights-locked__icon">🔒</div>
        <div className="insights-locked__title">Activate Profile to Unlock Insights</div>
        <div className="insights-locked__desc">
          AI-derived brand guidance insights are available once the Brand Intelligence Profile
          has been set to <strong>Active</strong> status. Navigate to the{" "}
          <strong>Activate Profile</strong> tab to proceed.
        </div>
      </div>
    );
  }

  const data = INSIGHTS[indication]?.[audience];

  const exportInsightsPdf = () => {
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      alert("Pop-up was blocked. Allow pop-ups for this site to export PDF.");
      return;
    }
    const esc = (v) => (v == null ? "" : String(v));
    const tagList = (arr) =>
      Array.isArray(arr) && arr.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${arr
            .map(
              (x) =>
                `<span style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;border-radius:999px;padding:3px 10px;font-size:12px">${esc(x)}</span>`
            )
            .join("")}</div>`
        : `<em style="color:#94a3b8">—</em>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>Brand Intelligence Insights — ${esc(indication)} · ${esc(audience)}</title>
<style>
  body { font: 13px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color:#0f172a; padding:24px 32px; max-width:880px; margin:0 auto; }
  h1 { font-size:22px; font-weight:800; margin:0 0 4px; letter-spacing:-0.01em; }
  h2 { font-size:13px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin:22px 0 10px; }
  .meta { color:#64748b; font-size:12px; margin-bottom:18px; }
  .field { margin-bottom:14px; }
  .field-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; }
  .derivation { padding:10px 13px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; font-size:12px; color:#475569; }
  .disclaimer { padding:10px 14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; font-size:12px; color:#1e40af; margin-bottom:18px; }
  @media print { body { padding:0; max-width:none; } }
</style></head><body>
<h1>Brand Intelligence Insights</h1>
<div class="meta">Indication: <strong>${esc(indication)}</strong> · Audience: <strong>${esc(audience)}</strong> · Exported: ${new Date().toISOString()}</div>
<div class="disclaimer"><strong>Derived from brand guidelines and approved content. Not performance-based.</strong></div>
${data ? `
<h2>Content Pattern Summary</h2>
<div class="field"><div class="field-label">Predominant Content Types</div>${tagList(data.contentPattern.types)}</div>
<div class="field"><div class="field-label">Typical Messaging Angles &amp; Claim Categories</div>${tagList(data.contentPattern.angles)}</div>
<div class="field"><div class="field-label">Common Tone Characteristics</div>${tagList(data.contentPattern.tone)}</div>
<div class="field"><div class="field-label">How this was derived</div><div class="derivation">${esc(data.contentPattern.derivation)}</div></div>
<h2>Audience-Specific Alignment</h2>
<div class="field"><div class="field-label">Content Depth &amp; Complexity</div>${tagList([data.audienceAlignment.depth])}</div>
<div class="field"><div class="field-label">Language &amp; Tone Expectations</div>${tagList(data.audienceAlignment.language)}</div>
<div class="field"><div class="field-label">Restricted or Limited Elements</div>${tagList(data.audienceAlignment.restrictions)}</div>
<div class="field"><div class="field-label">How this was derived</div><div class="derivation">${esc(data.audienceAlignment.derivation)}</div></div>
` : `<p style="color:#94a3b8">No insights available for this indication × audience combination.</p>`}
</body></html>`);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 150);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="insights-toolbar">
        <span className="insights-toolbar__label">Filter:</span>

        <label className="insights-toolbar__filter">
          <span className="insights-toolbar__filter-label">Indication</span>
          <select
            value={indication}
            onChange={(e) => setIndication(e.target.value)}
            className="insights-toolbar__select"
          >
            {INDICATIONS.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </label>

        <label className="insights-toolbar__filter">
          <span className="insights-toolbar__filter-label">Audience</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="insights-toolbar__select"
          >
            {AUDIENCES.map((aud) => <option key={aud} value={aud}>{aud}</option>)}
          </select>
        </label>

        <div className="insights-toolbar__export">
          <button
            type="button"
            onClick={exportInsightsPdf}
            className="insights-toolbar__export-btn"
            title="Open a printable view — pick 'Save as PDF' from the browser print dialog"
          >
            ⬇ Export as PDF
          </button>
        </div>
      </div>

      {/* AC9 — Disclaimer */}
      <div className="insights-disclaimer">
        <span className="insights-disclaimer__icon">ℹ</span>
        <div>
          <strong>Derived from brand guidelines and approved content. Not performance-based.</strong>
          &nbsp;These insights explicitly exclude: performance or engagement metrics, scoring or
          ranking of effectiveness, recommendations or next best actions, and channel, campaign,
          or Rx data.
        </div>
      </div>

      {data && (
        <>
          {/* Content Pattern Summary */}
          <Card accent="blue" className="insights-content-card">
            <CardHeader label={`Content Pattern Summary — ${indication} · ${audience}`} />
            <div className="insights-card__body">

              <div className="insights-section">
                <div className="insights-section__label">Predominant Content Types (Approved History)</div>
                <div>{data.contentPattern.types.map((t) => <Tag key={t} color="blue">{t}</Tag>)}</div>
              </div>

              <div className="insights-section">
                <div className="insights-section__label">Typical Messaging Angles &amp; Claim Categories</div>
                <div>{data.contentPattern.angles.map((a) => <Tag key={a} color="violet">{a}</Tag>)}</div>
              </div>

              <div className="insights-section">
                <div className="insights-section__label">Common Tone Characteristics</div>
                <div>{data.contentPattern.tone.map((t) => <Tag key={t} color="teal">{t}</Tag>)}</div>
              </div>

              <Divider label="Derivation & Confidence" />

              <div className="insights-derivation">
                <strong className="insights-derivation__label">How this was derived: </strong>
                {data.contentPattern.derivation}
              </div>

              <div className="insights-sources">
                Sources:{" "}
                {data.contentPattern.sources.map((s, i) => (
                  <span key={s}>
                    <span className="insights-sources__item">{s}</span>
                    {i < data.contentPattern.sources.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>

              <div className="insights-conf">
                <span className="insights-conf__label">Confidence</span>
                <ConfBar value={data.contentPattern.confidence} />
              </div>
            </div>
          </Card>

          {/* Audience Alignment */}
          <Card accent="violet" className="insights-audience-card">
            <CardHeader label={`Audience-Specific Alignment — ${audience}`} />
            <div className="insights-card__body">

              <div className="insights-section">
                <div className="insights-section__label">Typical Content Depth &amp; Complexity</div>
                <div className="insights-depth-box">{data.audienceAlignment.depth}</div>
              </div>

              <div className="insights-section">
                <div className="insights-section__label">Language &amp; Tone Expectations</div>
                <div>{data.audienceAlignment.language.map((l) => <Tag key={l} color="violet">{l}</Tag>)}</div>
              </div>

              <div className="insights-section">
                <div className="insights-section__label">Content Elements Commonly Restricted / Limited</div>
                <div className="insights-restrictions-list">
                  {data.audienceAlignment.restrictions.map((r) => (
                    <div key={r} className="insights-restriction">
                      <span className="insights-restriction__icon">✕</span>
                      {r}
                    </div>
                  ))}
                </div>
              </div>

              <Divider label="Derivation & Confidence" />

              <div className="insights-derivation">
                <strong className="insights-derivation__label">How this was derived: </strong>
                {data.audienceAlignment.derivation}
              </div>

              <div className="insights-sources">
                Sources:{" "}
                {data.audienceAlignment.sources.map((s, i) => (
                  <span key={s}>
                    <span className="insights-sources__item">{s}</span>
                    {i < data.audienceAlignment.sources.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>

              <div className="insights-conf">
                <span className="insights-conf__label">Confidence</span>
                <ConfBar value={data.audienceAlignment.confidence} />
              </div>
            </div>
          </Card>

          {/* AC10 — Explicit exclusions */}
          <div className="insights-exclusions">
            <strong>This view explicitly excludes: </strong>
            performance or engagement metrics · scoring or ranking of content effectiveness ·
            recommendations or next best actions · channel, campaign, or Rx data.
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────────── */
export default function US14App({
  profileId,
  user = process.env.REACT_APP_CURRENT_USER || "intelligence-hub-reviewer",
}) {
  const [tab, setTab]         = useState("activate");
  const [role, setRole]       = useState("Brand Manager");
  const [profile, setProfile] = useState({ status: "awaiting", version: "v—" });
  const [versions, setVersions] = useState([]);
  const toast = useToast();

  const recordVersion = (entry) => {
    setVersions((prev) => [
      entry,
      ...prev.map((v) => (v.status === "active" ? { ...v, status: "archived" } : v)),
    ]);
  };

  const hydrate = useCallback(async () => {
    if (!profileId) return;
    let s = {};
    let draft = {};
    let document_count = null;
    try {
      const [statusRes, profileRes] = await Promise.allSettled([
        getProfileStatus(profileId),
        getProfile(profileId),
      ]);
      s     = statusRes.status  === "fulfilled" ? (statusRes.value?.data  || {}) : {};
      draft = profileRes.status === "fulfilled" ? (profileRes.value?.data ?? profileRes.value ?? {}) : {};
      if (draft?.run_id) {
        try {
          const runRes = await getRun(draft.run_id);
          document_count = runRes?.data?.document_count ?? null;
        } catch (_) {}
      }
    } catch (err) {
      console.warn("[US14App] hydrate failed", err);
    }
    setProfile({
      status:  s.status === "active" ? "active" : "awaiting",
      version: s.version_number ? `v${s.version_number}` : "v—",
      version_number:          s.version_number,
      last_activated_at:       s.last_activated_at,
      activated_by:            s.activated_by,
      is_partial:              s.is_partial,
      unavailable_connectors:  s.unavailable_connectors,
      partial_acknowledged_by: s.partial_acknowledged_by,
      partial_acknowledged_at: s.partial_acknowledged_at,
      days_since_refresh:      s.days_since_refresh,
      refresh_required:        s.refresh_required,
      section_summary:         computeSectionSummary(draft.sections),
      claims_count:            computeClaimsCount(draft.sections),
      document_count,
    });
  }, [profileId]);

  useEffect(() => { hydrate(); }, [hydrate]);

  // [US 1.8 AC #6] Auto-recovery probe. After each hydrate, if the active
  // profile is partial we ask the backend to probe the previously-failed
  // connectors. The server enforces a 24h gate, so calling this on every
  // mount is safe — it short-circuits to a no-op when checked recently.
  // If recovery actually triggered a refresh, re-hydrate so the UI picks
  // up the new is_partial=false state.
  const recoveryScanRef = useRef(new Set());
  useEffect(() => {
    if (!profileId) return;
    if (!profile?.is_partial) return;
    if (recoveryScanRef.current.has(profileId)) return;
    recoveryScanRef.current.add(profileId);
    (async () => {
      try {
        const result = await runRecoveryScan(profile?.brand, user || "system");
        if (result?.recovered) {
          toast.success?.(
            `Connector recovered: ${(result.recovered_connectors || []).join(", ")}. ` +
            `Auto re-ingestion triggered.`
          );
          await hydrate();
        }
      } catch (err) {
        // Recovery scan is opportunistic; we surface failures only to the
        // console so a transient upstream blip doesn't show the user an error.
        console.warn("[recovery-scan] failed", err);
      }
    })();
  }, [profileId, profile?.is_partial, profile?.brand, user, hydrate, toast]);

  const handleAcknowledgePartial = useCallback(async () => {
    if (!profileId) throw new Error("No profile selected.");
    await acknowledgePartialProfile(profileId, user);
    await hydrate();
  }, [profileId, user, hydrate]);

  const readOnly = false;

  const tabs = [
    { key: "activate", label: "Activation" },
    { key: "versions", label: "Version History" },
    { key: "insights", label: "Insights" },
  ];

  return (
    <div className="us14-root">
      {/* Topbar */}
      <div className="us14-topbar">
        <div className="us14-topbar__left">
          <div className="us14-topbar__icon">💡</div>
          <div>
            <div className="us14-topbar__title">Brand Intelligence Profile</div>
            <div className="us14-topbar__subtitle">US 1.4 · Activate · Version Control · Insights</div>
          </div>
        </div>

        <div className="us14-topbar__right">
          <Badge variant={profile.status === "active" ? "active" : "awaiting"} dot>
            {profile.status === "active" ? "Active" : "Awaiting Activation"}
          </Badge>
          <Badge variant="neutral">{profile.version}</Badge>
          <button
            type="button"
            onClick={() => hydrate()}
            title="Refresh status from backend"
            className="us14-topbar__refresh-btn"
          >
            ↻ Refresh
          </button>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="us14-topbar__role-select"
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="us14-tabbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`us14-tab-btn${tab === t.key ? " us14-tab-btn--active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Read-only banner */}
      {readOnly && (
        <div className="us14-readonly-banner">
          🔒 <strong>Read-only view</strong> — Medical Writer / Content Author access.
          Approved outputs only.
        </div>
      )}

      {/* Content */}
      <div className="us14-content">
        {tab === "activate" && (
          readOnly
            ? <Alert variant="warning" title="Access Restricted">
                Activation is restricted to Global Brand Managers and Platform Admins.
              </Alert>
            : <ActivateTab
                profile={profile}
                profileId={profileId}
                user={user}
                role={role}
                onRecordVersion={recordVersion}
                onAcknowledgePartial={handleAcknowledgePartial}
                onActivate={(result) => {
                  setProfile((p) => ({
                    ...p,
                    status: "active",
                    version: result?.version_number ? `v${result.version_number}` : p.version,
                    version_number:           result?.version_number,
                    last_activated_at:        result?.activated_at,
                    activated_by:             result?.activated_by,
                    section_summary:          result?.section_summary || p.section_summary,
                    is_partial:               result?.is_partial ?? p.is_partial,
                    unavailable_connectors:   result?.unavailable_connectors ?? p.unavailable_connectors,
                  }));
                  hydrate();
                }}
              />
        )}
        {tab === "versions" && <VersionTab versions={versions} />}
        {tab === "insights" && <InsightsTab isActive={profile.status === "active"} />}
      </div>
    </div>
  );
}
