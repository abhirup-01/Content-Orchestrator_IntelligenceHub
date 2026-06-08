// Author: Abhirup Nandi — 2026-05-25
// Modified by Abhirup Nandi — 2026-05-27: wired to intelligence-hub-api.
// Summary: Brand Intelligence Profile — review panel. Calls the FastAPI
// service in intelligence-hub-api/ to run ingestion, extract a draft
// profile via Azure OpenAI, and persist Accept / Edit / Flag actions.
//
// Backend contract (intelligence-hub-api/README.md):
//   POST /ingestion/run                            → IngestionRunSummary
//   GET  /profile/{profile_id}                     → DraftProfile
//   POST /profile/{id}/sections/{section}/accept   → DraftProfile
//   POST /profile/{id}/sections/{section}/edit     → DraftProfile
//   POST /profile/{id}/sections/{section}/flag     → DraftProfile
//   GET  /profile/{id}/activation-readiness        → ActivationReadiness
//
// Section keys (snake_case, kept in sync with the backend):
//   messaging_pillars | tone_parameters | claims_inventory | prohibited_territory
//
// The DraftProfile carries everything we need to render — sections include
// state, ai_value, current_value, flag_reason, last_action_by/at — so the
// server is the single source of truth. We replace `profile` on every
// successful action; no separate sectionState.

import { useState } from "react";
import {
  Sparkles,
  PlayCircle,
  RefreshCw,
  Megaphone,
  MessageSquareText,
  ListChecks,
  ShieldOff,
  Check,
  Pencil,
  Flag,
  AlertCircle,
  X,
  Clock,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import {
  runIngestion,
  getDraftByRun,
  acceptSection as apiAcceptSection,
  editSection   as apiEditSection,
  flagSection   as apiFlagSection,
} from "../api/intelligenceHubApi";
import "./IntelligenceCss/BrandIntelligenceProfile.css";
// Toast feedback for Accept / Edit / Flag actions — see ./Toast.jsx
import { useToast } from "./Toast";

// Audit-log identity (BR-SIH-003). Override via REACT_APP_CURRENT_USER; swap
// for the MSAL active account once auth context is wired in.
const CURRENT_USER =
  process.env.REACT_APP_CURRENT_USER || "intelligence-hub-reviewer";

// Section keys match the backend exactly — DraftProfile.sections is keyed
// by these strings.
const SECTION_META = [
  {
    id: "messaging_pillars",
    title: "Messaging Pillars",
    icon: Megaphone,
    desc: "Brand narrative anchors with source citations.",
  },
  {
    id: "tone_parameters",
    title: "Tone Parameters",
    icon: MessageSquareText,
    desc: "Scored vocabulary profile from approved content.",
  },
  {
    id: "claims_inventory",
    title: "Claims Inventory",
    icon: ListChecks,
    desc: "All approved claims with reference sources.",
  },
  {
    id: "prohibited_territory",
    title: "Prohibited Territory",
    icon: ShieldOff,
    desc: "Language patterns flagged by MLR rejection annotations.",
  },
];

// Look up the human-readable title for a section_id — used in toast text.
function sectionLabel(sectionId) {
  const meta = SECTION_META.find((s) => s.id === sectionId);
  return meta ? meta.title : sectionId;
}

function formatTimestamp(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// Pulls the user-facing error string from an axios error (or any thrown
// value) so we can surface it in the UI without crashing on shape changes.
function readErrorMessage(err) {
  if (!err) return "Unknown error.";
  if (typeof err === "string") return err;
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  return err.message || "Unknown error.";
}

// ============================================================================
// Component
// ============================================================================
//
// `documents` is the live ingested-documents array from BrandIntelligence.jsx.
// Used here only as a UX gate — the backend pulls its own copies from the
// upstream Content API. Until the user has connected and ingested at least
// one source (Veeva / Claims / SharePoint / Manual), the trigger stays
// disabled, mirroring AC #1's "given connected source documents" precondition.
// Modified by Sanju Kumari — 2026-05-29: added onProfileChange callback so
// the parent can pass profile.profile_id down to <BrandIntelligenceActivation />
// for real US 1.4 wiring.
export default function BrandIntelligenceProfile({ documents = [], onProfileChange }) {
  // Toast feedback for review actions. Falls back to console safely if the
  // ToastProvider isn't mounted (see Toast.jsx) so the component remains
  // drop-in compatible with environments that don't wrap it.
  const toast = useToast();
  // Ingestion state
  const [running,  setRunning]  = useState(false);
  const [runError, setRunError] = useState(null);
  const [docCount, setDocCount] = useState(0);
  const [warnings, setWarnings] = useState([]);

  // Profile state — populated by the API; server is the source of truth.
  // Shape: see schemas/profile.py → DraftProfile.
  const [profile,  setProfile]  = useState(null);

  // Per-section action state — tracks which section is in edit/flag mode
  // and the in-flight indicator for the row's buttons.
  const [editingId,  setEditingId]  = useState(null);
  const [editDraft,  setEditDraft]  = useState("");
  // Per-item working copy of the section's items while the row is in Edit
  // mode. Cloned from profile.sections[id].current_value.items when Edit is
  // opened, mutated by the per-item editors below, and POSTed back as the
  // new section value on Save. Cleared on Cancel.
  const [editItems,  setEditItems]  = useState([]);
  const [flaggingId, setFlaggingId] = useState(null);
  const [flagReason, setFlagReason] = useState("");
  const [sectionBusyId,    setSectionBusyId]    = useState(null);
  const [sectionError,     setSectionError]     = useState(null);

  // Activation state — flips when user clicks Activate and the server's
  // readiness gate is satisfied. Today the activation flow itself lives
  // in US 1.4 (not this service), so we just toggle a local "activated"
  // flag for the success banner.
  const [activated, setActivated] = useState(false);

  const hasSourceDocs = documents.length > 0;

  // Re-ingestion modal state — shown when the user clicks "Re-run
  // Ingestion" on an already-loaded profile. Captures a free-text
  // description of what's changed / what the re-run should focus on,
  // so the user has a moment to think before spending GPT-5 tokens
  // (and so the audit log carries the human-readable rationale).
  const [reingestModalOpen, setReingestModalOpen] = useState(false);
  const [reingestContext, setReingestContext]     = useState("");

  // Called by the Re-run / Run Initial button. If a profile already
  // exists this opens the context-capture modal; otherwise it kicks
  // off the first ingestion directly (no point asking for "what's
  // changed" on the very first run).
  const onRunOrReingestClick = () => {
    if (!hasSourceDocs || running) return;
    if (profile) {
      setReingestContext("");
      setReingestModalOpen(true);
    } else {
      runInitialIngestion();
    }
  };

  const confirmReingestion = () => {
    setReingestModalOpen(false);
    runInitialIngestion(reingestContext.trim());
  };

  // ──────────────────────────────────────────────────────────────────────
  // AC #1 — Run Initial Ingestion
  // Body fields default to safe values; the backend treats brand/indication
  // as optional filters. triggered_by feeds the audit log.
  // ──────────────────────────────────────────────────────────────────────
  const runInitialIngestion = async (contextNote = "") => {
    if (!hasSourceDocs || running) return;
    setRunning(true);
    setRunError(null);
    setActivated(false);
    setProfile(null);
    // Modified by Sanju Kumari — 2026-05-29: reset the lifted profile_id so
    // the sibling Activation panel goes back to "Awaiting" while we re-run.
    if (onProfileChange) onProfileChange(null);
    try {
      const manualDocuments = documents
        .filter((d) => d.sourceId === "manual")
        .map((d) => ({
          document_id: d.id,
          name: d.name,
          text: d.text || "",
          // Modified by Sanju Kumari — 2026-05-29: binary uploads (PDF / DOCX)
          // carry their bytes here so the backend can extract text server-side
          // via PyMuPDF / python-docx. Empty for text-readable files where
          // d.text is already populated by the client-side reader.
          file_b64: d.file_b64 || "",
          content_type: d.contentType || "reference",
          mime: d.mime || "",
          metadata: {
            size: d.size || 0,
            uploaded_at: d.lastRefresh
              ? new Date(d.lastRefresh).toISOString()
              : new Date().toISOString(),
          },
        }));

      // Modified by Sanju Kumari — 2026-05-29: pass the visible-docs whitelist
      // so the backend only keeps Veeva / Claims documents the user actually
      // ingested via an Active connector. Without this the backend would pull
      // every approved doc + every claim regardless of which connectors the
      // user activated.
      const res = await runIngestion({
        triggered_by: CURRENT_USER,
        include_claims: true,
        include_annotations: true,
        manual_documents: manualDocuments,
        document_ids: documents.map((d) => String(d.id)),
        // User-supplied context for a re-run (empty for initial). Sent
        // along as `notes` so the backend can include it in the audit
        // trail without changing the strict request schema. Pydantic
        // ignores unknown fields by default.
        notes: contextNote || undefined,
      });
      const summary = res.data;

      if (!summary?.profile_id) {
        setDocCount(summary?.document_count ?? 0);
        setWarnings(summary?.warnings ?? []);
        throw new Error(
          summary?.warnings?.length
            ? summary.warnings.join(" · ")
            : "Ingestion finished without producing a draft profile."
        );
      }

      const profileRes = await getDraftByRun(summary.run_id);
      setProfile(profileRes.data);
      // Modified by Sanju Kumari — 2026-05-29: bubble the loaded DraftProfile
      // up so <BrandIntelligenceActivation /> receives profile.profile_id.
      if (onProfileChange) onProfileChange(profileRes.data);
      setDocCount(summary.document_count ?? 0);
      setWarnings(summary.warnings ?? []);
    } catch (err) {
      console.warn("[BrandIntelligenceProfile] runIngestion failed:", err);
      setRunError(readErrorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // AC #3 — Accept / Edit / Flag
  // Each handler calls the API, swaps the profile to the server response
  // (so activation_blockers, last_action_by/at, etc., all stay accurate),
  // and clears the inline form state.
  // ──────────────────────────────────────────────────────────────────────

  // Bulk Accept All — accepts every section that's not flagged AND not
  // already accepted. Sequential (one POST at a time) so the audit log
  // reads cleanly in chronological order and each profile-state response
  // includes the previous accept's update. Skips flagged sections per the
  // BR — flagged sections require explicit Edit or rejection first.
  const [bulkBusy, setBulkBusy] = useState(false);
  const onAcceptAll = async () => {
    if (!profile || bulkBusy || sectionBusyId) return;
    const targets = SECTION_META
      .map((m) => m.id)
      .filter((sid) => {
        const st = profile.sections?.[sid]?.state;
        return st !== "accepted" && st !== "flagged";
      });
    if (targets.length === 0) {
      toast.info("Nothing to accept — all sections are already accepted or flagged");
      return;
    }
    setBulkBusy(true);
    setSectionError(null);
    let okCount = 0;
    let lastProfile = profile;
    let firstError = null;
    for (const sid of targets) {
      try {
        const res = await apiAcceptSection(profile.profile_id, sid, CURRENT_USER);
        lastProfile = res.data;
        okCount += 1;
      } catch (err) {
        if (!firstError) firstError = err;
        console.warn(`[BrandIntelligenceProfile] bulk-accept failed on ${sid}:`, err);
      }
    }
    setProfile(lastProfile);
    setBulkBusy(false);
    const skipped = SECTION_META.length - targets.length;
    if (okCount > 0 && !firstError) {
      const skippedNote = skipped > 0 ? ` (skipped ${skipped} already accepted/flagged)` : "";
      toast.success(`Accepted ${okCount} section${okCount === 1 ? "" : "s"}${skippedNote}`);
    } else if (firstError) {
      toast.error(`Accept All partially failed — ${readErrorMessage(firstError)}`);
    }
  };

  const onAccept = async (sectionId) => {
    if (!profile || sectionBusyId) return;
    setSectionBusyId(sectionId);
    setSectionError(null);
    try {
      const res = await apiAcceptSection(profile.profile_id, sectionId, CURRENT_USER);
      setProfile(res.data);
      toast.success(`Section accepted — ${sectionLabel(sectionId)}`);
    } catch (err) {
      console.warn("[BrandIntelligenceProfile] accept failed:", err);
      setSectionError({ sectionId, message: readErrorMessage(err) });
      toast.error(`Accept failed — ${readErrorMessage(err)}`);
    } finally {
      setSectionBusyId(null);
    }
  };

  const startEdit = (sectionId) => {
    setEditingId(sectionId);
    setEditDraft("");
    // Clone the current items into the local working copy so per-item
    // mutations don't touch the backend-sourced profile state until Save.
    // structuredClone handles nested citations arrays safely.
    const current = profile?.sections?.[sectionId]?.current_value?.items ?? [];
    setEditItems(
      typeof structuredClone === "function"
        ? structuredClone(current)
        : JSON.parse(JSON.stringify(current))
    );
    setFlaggingId(null);
    setSectionError(null);
  };

  // Per-item Edit UX. The local `editItems` array is the working copy; on
  // Save we POST the full section value (with our mutated items) plus the
  // free-text edit reason. Backend flips state to "edited", writes one
  // audit entry with original/new value, stamps user + timestamp.
  const commitEdit = async (sectionId) => {
    if (!profile || sectionBusyId) return;
    const note = editDraft.trim();
    if (!note) return;
    setSectionBusyId(sectionId);
    setSectionError(null);
    try {
      // Preserve any non-`items` keys that were on the current_value object.
      const prevValue = profile.sections[sectionId]?.current_value ?? {};
      const newValue  = { ...prevValue, items: editItems };
      const res = await apiEditSection(
        profile.profile_id,
        sectionId,
        newValue,
        CURRENT_USER,
        note,
      );
      setProfile(res.data);
      setEditingId(null);
      setEditDraft("");
      setEditItems([]);
      toast.success(`Edit saved — ${sectionLabel(sectionId)}`);
    } catch (err) {
      console.warn("[BrandIntelligenceProfile] edit failed:", err);
      setSectionError({ sectionId, message: readErrorMessage(err) });
      toast.error(`Edit failed — ${readErrorMessage(err)}`);
    } finally {
      setSectionBusyId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
    setEditItems([]);
  };

  // ── Per-item mutation helpers ───────────────────────────────────────────
  // Pure setters around editItems — the SectionEditor components below call
  // these to update one item / add a new blank / remove an item. Keeping
  // the helpers here (vs inside the editor) makes the editor components
  // dumb-renderers that don't need to know about the parent state shape.

  const updateEditItem = (index, patch) => {
    setEditItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };

  const removeEditItem = (index) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addEditItem = (template) => {
    setEditItems((prev) => [...prev, template]);
  };

  const startFlag = (sectionId) => {
    setFlaggingId(sectionId);
    setFlagReason("");
    setEditingId(null);
    setSectionError(null);
  };

  const commitFlag = async (sectionId) => {
    if (!profile || sectionBusyId) return;
    const reason = flagReason.trim();
    if (!reason) return;
    setSectionBusyId(sectionId);
    setSectionError(null);
    try {
      const res = await apiFlagSection(profile.profile_id, sectionId, CURRENT_USER, reason);
      setProfile(res.data);
      setFlaggingId(null);
      setFlagReason("");
      toast.success(`Flagged — activation blocked for ${sectionLabel(sectionId)} until resolved`, 4500);
    } catch (err) {
      console.warn("[BrandIntelligenceProfile] flag failed:", err);
      setSectionError({ sectionId, message: readErrorMessage(err) });
      toast.error(`Flag failed — ${readErrorMessage(err)}`);
    } finally {
      setSectionBusyId(null);
    }
  };

  const cancelFlag = () => {
    setFlaggingId(null);
    setFlagReason("");
  };

  // ──────────────────────────────────────────────────────────────────────
  // AC #4 + #5 — Activation guards
  // The backend's activation_blockers list is authoritative. Common values:
  //   "zero_claims_extracted"   AC #5
  //   "section_flagged"         AC #4
  //   "section_pending_review"  hardening on the server side
  // ──────────────────────────────────────────────────────────────────────
  const blockers = profile?.activation_blockers ?? [];
  const claimsEmpty       = blockers.includes("zero_claims_extracted");
  const hasFlaggedSection = blockers.includes("section_flagged");
  const flaggedSections   = SECTION_META.filter(
    ({ id }) => profile?.sections?.[id]?.state === "flagged"
  );
  const canActivate = profile && blockers.length === 0 && !activated;

  // Real activation lives in the US 1.4 panel below — no local activate
  // handler needed here anymore. `canActivate` is still computed because
  // the blocker alerts above depend on the same gates (claims empty,
  // section flagged, section pending review).

  // ===== Render ===========================================================
  return (
    <div className="bip-embedded" aria-label="Brand Intelligence Profile">
      <div className="bip-divider" />

      {/* Header */}
      <div className="bip-head">
        <div className="bip-title-row">
          <Sparkles className="bip-head-icon" strokeWidth={2} />
          <h3 className="bip-title">Brand Intelligence Profile</h3>
        </div>
        <p className="bip-sub">
          Run AI extraction over the ingested documents to draft a brand profile.
          Review each section and accept, edit, or flag before activating.
        </p>
      </div>

      {/* Ingestion bar — ALWAYS visible.
          Before a profile exists: invites the user to run initial ingestion.
          After a profile exists: shows ingested count + Re-run.
          Disabled whenever the connectors haven't produced any docs yet,
          with an explicit explanation so the user knows what to do next. */}
      <div className={`bip-ingest-bar ${profile ? "bip-ingest-bar--ready" : ""}`}>
        <div className="bip-ingest-bar__left">
          {profile ? (
            <>
              <CheckCircle2 size={16} strokeWidth={2.2} className="bip-ingest-bar__icon bip-ingest-bar__icon--ok" />
              <span className="bip-ingest-bar__text">
                <strong>{docCount}</strong> document{docCount === 1 ? "" : "s"} ingested · draft profile generated
              </span>
            </>
          ) : !hasSourceDocs ? (
            <>
              <Inbox size={16} strokeWidth={2} className="bip-ingest-bar__icon bip-ingest-bar__icon--muted" />
              <span className="bip-ingest-bar__text bip-ingest-bar__text--muted">
                No source documents available yet. Connect a source above and ingest
                documents to enable initial ingestion.
              </span>
            </>
          ) : (
            <>
              <PlayCircle size={16} strokeWidth={2.2} className="bip-ingest-bar__icon" />
              <span className="bip-ingest-bar__text">
                <strong>{documents.length}</strong> document
                {documents.length === 1 ? "" : "s"} available — ready to extract the draft profile.
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          className={`bip-ingest-bar__btn ${profile ? "bip-ingest-bar__btn--rerun" : ""}`}
          onClick={onRunOrReingestClick}
          disabled={running || !hasSourceDocs}
          title={
            !hasSourceDocs
              ? "Ingest at least one document from a connected source first"
              : profile
              ? "Re-run ingestion against the latest documents"
              : "Retrieves all ingested documents and extracts the draft profile"
          }
        >
          {running ? (
            <>
              <RefreshCw size={14} strokeWidth={2.2} className="bip-spin" />
              <span>{profile ? "Re-running…" : "Running ingestion…"}</span>
            </>
          ) : (
            <>
              {profile ? (
                <RefreshCw size={14} strokeWidth={2.2} />
              ) : (
                <PlayCircle size={14} strokeWidth={2.2} />
              )}
              <span>{profile ? "Re-run Ingestion" : "Run Initial Ingestion"}</span>
            </>
          )}
        </button>
      </div>

      {runError && (
        <div className="bip-alert bip-alert-error bip-alert-inline">
          <AlertCircle size={14} strokeWidth={2.2} />
          <span>
            <strong>Ingestion failed.</strong> {runError}
          </span>
        </div>
      )}

      {/* Warnings from upstream connectors (Veeva failed, claims filtered, etc.) */}
      {profile && warnings.length > 0 && (
        <div className="bip-alert bip-alert-warning bip-alert-inline">
          <AlertCircle size={14} strokeWidth={2.2} />
          <span>
            <strong>Ingestion warnings:</strong> {warnings.join(" · ")}
          </span>
        </div>
      )}

      {/* Accept All toolbar moved to AFTER the section list — placed at
          the bottom so the user reads through all four sections first,
          then accepts as a final action. Original code block was above. */}

      {/* Sections — AC #2 */}
      {profile && (
        <div className="bip-sections">
          {SECTION_META.map(({ id, title, icon: Icon, desc }) => {
            const sec = profile.sections?.[id];
            const state = sec?.state ?? "pending";
            const items = sec?.current_value?.items ?? [];
            const isEditing  = editingId === id;
            const isFlagging = flaggingId === id;
            const isBusy     = sectionBusyId === id;
            const rowError   = sectionError?.sectionId === id ? sectionError.message : null;

            return (
              <div key={id} className={`bip-section bip-section--${state}`}>
                {/* Section head */}
                <div className="bip-section-head">
                  <div className="bip-section-title-row">
                    <Icon className="bip-section-icon" size={16} strokeWidth={2} />
                    <h4 className="bip-section-title">{title}</h4>
                    <StatusBadge status={state} />
                  </div>
                  <p className="bip-section-desc">{desc}</p>
                </div>

                {/* Content — read-only when not editing, replaced by the
                    per-item editor below when this section is in Edit mode. */}
                {!isEditing && <SectionContent sectionId={id} items={items} />}

                {/* Edit form — per-item editor + free-text change note. */}
                {isEditing && (
                  <div className="bip-edit-form">
                    <SectionEditor
                      sectionId={id}
                      items={editItems}
                      onUpdate={updateEditItem}
                      onRemove={removeEditItem}
                      onAdd={addEditItem}
                    />
                    <label className="bip-edit-label">Describe your changes</label>
                    <textarea
                      className="bip-edit-textarea"
                      placeholder="e.g. Tightened pillar 1 wording; added safety claim CL-000050"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                    />
                    <p className="bip-edit-hint">
                      The original AI-generated value, your new value, edit note,
                      identity, and timestamp are all recorded in the server-side
                      audit log (BR-SIH-003).
                    </p>
                  </div>
                )}

                {/* Flag form */}
                {isFlagging && (
                  <div className="bip-flag-form">
                    <label className="bip-edit-label">Reason for flagging</label>
                    <input
                      type="text"
                      className="bip-flag-input"
                      placeholder="e.g. Citation does not match the claim text"
                      value={flagReason}
                      onChange={(e) => setFlagReason(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}

                {/* Last-action footer — sourced from server */}
                {state === "edited" && sec?.last_action_at && !isEditing && (
                  <div className="bip-edit-log">
                    <Clock size={11} strokeWidth={2} />
                    <span>
                      Edited by <strong>{sec.last_action_by || "unknown"}</strong> ·{" "}
                      {formatTimestamp(sec.last_action_at)}
                    </span>
                  </div>
                )}
                {state === "flagged" && sec?.flag_reason && !isFlagging && (
                  <div className="bip-flag-banner">
                    <Flag size={11} strokeWidth={2} />
                    <span>{sec.flag_reason}</span>
                  </div>
                )}

                {/* Per-row API error */}
                {rowError && (
                  <div className="bip-alert bip-alert-error bip-alert-inline">
                    <AlertCircle size={13} strokeWidth={2.2} />
                    <span>{rowError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="bip-section-actions">
                  {!isEditing && !isFlagging && (
                    <>
                      <button
                        type="button"
                        className="bip-action-btn bip-action-accept"
                        onClick={() => onAccept(id)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <RefreshCw size={13} strokeWidth={2.2} className="bip-spin" />
                        ) : (
                          <Check size={13} strokeWidth={2.2} />
                        )}
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        className="bip-action-btn bip-action-edit"
                        onClick={() => startEdit(id)}
                        disabled={isBusy}
                      >
                        <Pencil size={13} strokeWidth={2} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="bip-action-btn bip-action-flag"
                        onClick={() => startFlag(id)}
                        disabled={isBusy}
                      >
                        <Flag size={13} strokeWidth={2} />
                        <span>Flag</span>
                      </button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <button
                        type="button"
                        className="bip-action-btn bip-action-accept"
                        onClick={() => commitEdit(id)}
                        disabled={!editDraft.trim() || isBusy}
                      >
                        {isBusy ? (
                          <RefreshCw size={13} strokeWidth={2.2} className="bip-spin" />
                        ) : (
                          <Check size={13} strokeWidth={2.2} />
                        )}
                        <span>Save edit</span>
                      </button>
                      <button
                        type="button"
                        className="bip-action-btn"
                        onClick={cancelEdit}
                        disabled={isBusy}
                      >
                        <X size={13} strokeWidth={2} />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                  {isFlagging && (
                    <>
                      <button
                        type="button"
                        className="bip-action-btn bip-action-flag"
                        onClick={() => commitFlag(id)}
                        disabled={!flagReason.trim() || isBusy}
                      >
                        {isBusy ? (
                          <RefreshCw size={13} strokeWidth={2.2} className="bip-spin" />
                        ) : (
                          <Flag size={13} strokeWidth={2} />
                        )}
                        <span>Submit flag</span>
                      </button>
                      <button
                        type="button"
                        className="bip-action-btn"
                        onClick={cancelFlag}
                        disabled={isBusy}
                      >
                        <X size={13} strokeWidth={2} />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accept All — placed AFTER the section list so it reads as a
          final commit action: review all four pillars top-to-bottom,
          then accept whatever's still pending in one click. Skips any
          section that's flagged or already accepted. */}
      {profile && (() => {
        const pendingCount = SECTION_META.filter((m) => {
          const st = profile.sections?.[m.id]?.state;
          return st !== "accepted" && st !== "flagged";
        }).length;
        if (pendingCount === 0) return null;
        return (
          <div className="bip-bulk-toolbar bip-bulk-toolbar--bottom">
            <span className="bip-bulk-hint">
              {pendingCount} section{pendingCount === 1 ? "" : "s"} ready to accept
              {pendingCount !== SECTION_META.length ? " (flagged / already-accepted sections will be skipped)" : ""}
            </span>
            <button
              type="button"
              className="bip-bulk-btn"
              onClick={onAcceptAll}
              disabled={bulkBusy || !!sectionBusyId}
              title="Accept every section that isn't flagged"
            >
              {bulkBusy ? (
                <>
                  <RefreshCw size={13} strokeWidth={2.2} className="bip-spin" />
                  <span>Accepting all…</span>
                </>
              ) : (
                <>
                  <Check size={13} strokeWidth={2.2} />
                  <span>Accept All</span>
                </>
              )}
            </button>
          </div>
        );
      })()}

      {/* Activation block — AC #4 + #5 (server-driven via activation_blockers) */}
      {profile && (
        <div className="bip-activation">
          {claimsEmpty && (
            <div className="bip-alert bip-alert-error">
              <AlertCircle size={14} strokeWidth={2.2} />
              <span>
                <strong>Zero claims extracted.</strong> Review or supplement source
                material before activation.
              </span>
            </div>
          )}
          {hasFlaggedSection && (
            <div className="bip-alert bip-alert-warning">
              <AlertCircle size={14} strokeWidth={2.2} />
              <span>
                <strong>
                  {flaggedSections.length} flagged section
                  {flaggedSections.length === 1 ? "" : "s"}
                </strong>{" "}
                must be resolved before activation:&nbsp;
                {flaggedSections.map((s) => s.title).join(", ")}.
              </span>
            </div>
          )}
          {!claimsEmpty &&
            !hasFlaggedSection &&
            blockers.includes("section_pending_review") && (
              <div className="bip-alert bip-alert-warning">
                <AlertCircle size={14} strokeWidth={2.2} />
                <span>
                  Every section needs an explicit Accept / Edit / Flag action before
                  activation.
                </span>
              </div>
            )}
          {activated && (
            <div className="bip-alert bip-alert-success">
              <CheckCircle2 size={14} strokeWidth={2.2} />
              <span>
                <strong>Profile activated</strong> as the brand truth source for
                downstream modules.
              </span>
            </div>
          )}

          {/* Activate button removed — the real Activate Profile lives in
              the US 1.4 panel below (BrandIntelligenceActivation.jsx). The
              previous button here was placeholder local-state only and
              created a visually-duplicate "Activate profile" CTA at the
              boundary between US 1.3 and US 1.4. Keeping just the blocker
              alerts above so the reviewer still sees what's blocking
              activation before scrolling down. */}
        </div>
      )}

      {/* Re-ingestion scope modal — opens when the user clicks Re-run
          on an already-loaded profile. Captures a free-text rationale
          for the re-run (what's changed, what to focus on) before
          spending GPT-5 tokens. Audit-friendly. */}
      {reingestModalOpen && (
        <div
          className="bip-modal-overlay"
          onClick={() => setReingestModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bip-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="bip-modal-title">Re-run Ingestion</h3>
            <p className="bip-modal-sub">
              Describe what's changed or what this re-run should focus on.
              The text is logged with the run so reviewers later can see why.
            </p>
            <textarea
              className="bip-modal-textarea"
              rows={4}
              autoFocus
              placeholder={
                "e.g. New label update from FDA approved on 5 Jun — re-extract claims to capture the updated dosing guidance for paediatric patients."
              }
              value={reingestContext}
              onChange={(e) => setReingestContext(e.target.value)}
            />
            <p className="bip-modal-hint">
              Optional — leave blank to re-run without notes. Re-running
              consumes GPT-5 tokens and replaces the current draft.
            </p>
            <div className="bip-modal-actions">
              <button
                type="button"
                className="bip-modal-btn bip-modal-btn--secondary"
                onClick={() => setReingestModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bip-modal-btn bip-modal-btn--primary"
                onClick={confirmReingestion}
              >
                <RefreshCw size={13} strokeWidth={2.2} />
                <span>Re-run Ingestion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:  { label: "Pending review", cls: "bip-status-pending"  },
    accepted: { label: "Accepted",       cls: "bip-status-accepted" },
    edited:   { label: "Edited",         cls: "bip-status-edited"   },
    flagged:  { label: "Flagged",        cls: "bip-status-flagged"  },
  };
  const m = map[status] || map.pending;
  return <span className={`bip-status ${m.cls}`}>{m.label}</span>;
}

// Per-section renderer — item shapes match schemas/profile.py exactly.
// Added by Sanju Kumari — 2026-05-29: per-section empty-state messages.
// The previous generic "No items extracted" hid the real reason a section
// was blank. Each message below points at the backend / source-material
// requirement that needs to be satisfied:
//   - messaging_pillars  → needs approved long-form content
//   - tone_parameters    → needs richer text than terse claims alone
//   - claims_inventory   → needs an Active Claims connector
//   - prohibited_territory → needs MLR rejection annotations (backend
//     does not fetch annotations today; ticket pending)
const EMPTY_SECTION_HELP = {
  messaging_pillars:
    "No messaging pillars extracted. Activate the Veeva approved-documents " +
    "connector or upload brand guidelines so the AI has narrative content " +
    "to anchor pillars against.",
  tone_parameters:
    "No tone signals extracted from the current corpus. Tone Parameters need " +
    "vocabulary variety — claims alone are too terse. Activate the Veeva " +
    "approved-documents connector or upload brand guidelines / tone manual to " +
    "populate this section.",
  claims_inventory:
    "No claims extracted. Activate the Veeva Vault Claims Library connector, " +
    "or upload a document containing approved claim statements.",
  prohibited_territory:
    "No prohibited language patterns extracted. This section is built from MLR " +
    "rejection annotations — once the backend wires annotation fetching for " +
    "Active Veeva documents, flagged patterns will surface here.",
};

/* ──────────────────────────────────────────────────────────────────────────
 * CitationChip — single source of truth for how citations render.
 *
 * Renders as an <a target="_blank"> when a URL can be constructed (either
 * the citation has an explicit `url` field, or we can derive one from
 * api-main's /download_source/{doc_id} endpoint for Veeva-shaped IDs).
 * Otherwise falls back to a non-navigable <span> with the document_id +
 * page/section in the tooltip — same visual affordance (cursor:pointer,
 * hover lift) so the user knows the chip is interactive in spirit even
 * when no URL exists yet (e.g. manual uploads).
 * ────────────────────────────────────────────────────────────────────── */
function citationHref(c) {
  if (!c) return null;
  if (typeof c.url === "string" && c.url.length > 0) return c.url;
  // Heuristic: api-main exposes /download_source/{doc_id} for Veeva docs.
  // Manual uploads use IDs that wouldn't resolve there, so we skip them.
  const base = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");
  const docId = c.document_id || "";
  const looksLikeVeeva = /^[A-Za-z0-9_-]{6,}$/.test(docId) && !docId.startsWith("manual-");
  if (base && looksLikeVeeva) {
    return `${base}/download_source/${encodeURIComponent(docId)}`;
  }
  return null;
}

function CitationChip({ citation }) {
  if (!citation) return null;
  const label =
    (citation.name || citation.document_id || "Citation") +
    (citation.page_or_section ? ` · ${citation.page_or_section}` : "");
  const tooltip = citation.document_id
    ? `${citation.document_id}${citation.page_or_section ? " — " + citation.page_or_section : ""}`
    : label;
  const href = citationHref(citation);
  const classes = `bip-citation${href ? " bip-citation--link" : ""}`;
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        title={tooltip}
      >
        {label}
      </a>
    );
  }
  return (
    <span className={classes} title={tooltip}>
      {label}
    </span>
  );
}

function SectionContent({ sectionId, items }) {
  if (!items || items.length === 0) {
    return (
      <div className="bip-empty">
        {EMPTY_SECTION_HELP[sectionId] || "No items extracted for this section."}
      </div>
    );
  }

  if (sectionId === "messaging_pillars") {
    // MessagingPillar: { title, summary, citations: [{document_id, name, page_or_section}] }
    return (
      <ul className="bip-list">
        {items.map((it, idx) => (
          <li key={idx} className="bip-list-item">
            <div className="bip-list-title">{it.title}</div>
            {it.summary && <div className="bip-list-desc">{it.summary}</div>}
            {Array.isArray(it.citations) && it.citations.length > 0 && (
              <div className="bip-citations">
                {it.citations.map((c, i) => (
                  <CitationChip key={i} citation={c} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (sectionId === "tone_parameters") {
    // ToneParameter: { label, score (0-100), notes }
    return (
      <ul className="bip-tone-list">
        {items.map((it, idx) => {
          const pct = Math.max(0, Math.min(100, Number(it.score) || 0));
          return (
            <li key={idx} className="bip-tone-row" title={it.notes || ""}>
              <span className="bip-tone-word">{it.label}</span>
              <div className="bip-tone-bar">
                <div className="bip-tone-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="bip-tone-score">{pct.toFixed(0)}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  if (sectionId === "claims_inventory") {
    // ClaimInventoryItem: { claim_id, text, indication, audience_segments, confidence, citations }
    return (
      <ul className="bip-list">
        {items.map((it, idx) => (
          <li key={idx} className="bip-list-item">
            <div className="bip-list-desc">{it.text}</div>
            <div className="bip-citations">
              {it.claim_id && (
                <span className="bip-citation">{it.claim_id}</span>
              )}
              {Array.isArray(it.citations) &&
                it.citations.map((c, i) => (
                  <CitationChip key={`cite-${i}`} citation={c} />
                ))}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (sectionId === "prohibited_territory") {
    // ProhibitedTerm: { pattern, reason_category, citations }
    return (
      <ul className="bip-list">
        {items.map((it, idx) => (
          <li key={idx} className="bip-list-item bip-prohibited-item">
            <div className="bip-list-title">{it.pattern}</div>
            {it.reason_category && (
              <div className="bip-list-desc">{it.reason_category}</div>
            )}
            {Array.isArray(it.citations) && it.citations.length > 0 && (
              <div className="bip-citations">
                {it.citations.map((c, i) => (
                  <CitationChip key={i} citation={c} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return null;
}


/* ──────────────────────────────────────────────────────────────────────────
 * Per-item inline editors
 *
 * Each section has its own editor because the item shapes differ:
 *   messaging_pillars    → { title, summary, citations[] }
 *   tone_parameters      → { label, score (0..100), notes }
 *   claims_inventory     → { claim_id, text, indication, citations[] }
 *   prohibited_territory → { pattern, reason_category, citations[] }
 *
 * All four editors share the same contract: receive `items`, `onUpdate(idx,
 * patch)`, `onRemove(idx)`, and `onAdd()`. They render editable inputs for
 * the relevant fields and surface a Remove button per row + an Add button
 * at the bottom. Citations are rendered read-only — they're sourced from
 * the ingested documents and not free-text editable, but the existing
 * citations on an edited item carry forward unchanged.
 * ────────────────────────────────────────────────────────────────────── */

function PillarsEditor({ items, onUpdate, onRemove, onAdd }) {
  return (
    <div className="bip-edit-items">
      {items.map((it, idx) => (
        <div key={idx} className="bip-edit-item">
          <div className="bip-edit-row">
            <label className="bip-edit-field-label">Title</label>
            <input
              type="text"
              className="bip-edit-input"
              value={it.title ?? ""}
              onChange={(e) => onUpdate(idx, { title: e.target.value })}
              placeholder="e.g. Clinical education for HCPs"
            />
          </div>
          <div className="bip-edit-row">
            <label className="bip-edit-field-label">Summary</label>
            <textarea
              className="bip-edit-input bip-edit-input--multi"
              rows={2}
              value={it.summary ?? ""}
              onChange={(e) => onUpdate(idx, { summary: e.target.value })}
              placeholder="One-paragraph description of the pillar"
            />
          </div>
          {Array.isArray(it.citations) && it.citations.length > 0 && (
            <div className="bip-edit-citations">
              <span className="bip-edit-field-label">Citations</span>
              {it.citations.map((c, i) => (
                <CitationChip key={i} citation={c} />
              ))}
            </div>
          )}
          <button
            type="button"
            className="bip-edit-remove"
            onClick={() => onRemove(idx)}
          >
            Remove pillar
          </button>
        </div>
      ))}
      <button
        type="button"
        className="bip-edit-add"
        onClick={() => onAdd({ title: "", summary: "", citations: [] })}
      >
        + Add a pillar
      </button>
    </div>
  );
}

function ToneEditor({ items, onUpdate, onRemove, onAdd }) {
  return (
    <div className="bip-edit-items">
      {items.map((it, idx) => {
        const pct = Math.max(0, Math.min(100, Number(it.score) || 0));
        return (
          <div key={idx} className="bip-edit-item">
            <div className="bip-edit-row bip-edit-row--inline">
              <div className="bip-edit-col">
                <label className="bip-edit-field-label">Label</label>
                <input
                  type="text"
                  className="bip-edit-input"
                  value={it.label ?? ""}
                  onChange={(e) => onUpdate(idx, { label: e.target.value })}
                  placeholder="e.g. clinical, supportive, educational"
                />
              </div>
              <div className="bip-edit-col bip-edit-col--score">
                <label className="bip-edit-field-label">Score (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="bip-edit-input"
                  value={pct}
                  onChange={(e) =>
                    onUpdate(idx, { score: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="bip-edit-row">
              <label className="bip-edit-field-label">Notes (optional)</label>
              <input
                type="text"
                className="bip-edit-input"
                value={it.notes ?? ""}
                onChange={(e) => onUpdate(idx, { notes: e.target.value })}
                placeholder="Why this score, e.g. derived from email warmth"
              />
            </div>
            <button
              type="button"
              className="bip-edit-remove"
              onClick={() => onRemove(idx)}
            >
              Remove
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="bip-edit-add"
        onClick={() => onAdd({ label: "", score: 50, notes: "" })}
      >
        + Add a tone parameter
      </button>
    </div>
  );
}

function ClaimsEditor({ items, onUpdate, onRemove, onAdd }) {
  return (
    <div className="bip-edit-items">
      {items.map((it, idx) => (
        <div key={idx} className="bip-edit-item">
          <div className="bip-edit-row bip-edit-row--inline">
            <div className="bip-edit-col bip-edit-col--id">
              <label className="bip-edit-field-label">Claim ID</label>
              <input
                type="text"
                className="bip-edit-input"
                value={it.claim_id ?? ""}
                onChange={(e) => onUpdate(idx, { claim_id: e.target.value })}
                placeholder="e.g. CL-000042"
              />
            </div>
            <div className="bip-edit-col">
              <label className="bip-edit-field-label">Indication</label>
              <input
                type="text"
                className="bip-edit-input"
                value={it.indication ?? ""}
                onChange={(e) => onUpdate(idx, { indication: e.target.value })}
                placeholder="e.g. Heart Failure"
              />
            </div>
          </div>
          <div className="bip-edit-row">
            <label className="bip-edit-field-label">Claim text</label>
            <textarea
              className="bip-edit-input bip-edit-input--multi"
              rows={2}
              value={it.text ?? ""}
              onChange={(e) => onUpdate(idx, { text: e.target.value })}
              placeholder="The approved claim wording, verbatim"
            />
          </div>
          {Array.isArray(it.citations) && it.citations.length > 0 && (
            <div className="bip-edit-citations">
              <span className="bip-edit-field-label">Citations</span>
              {it.citations.map((c, i) => (
                <CitationChip key={i} citation={c} />
              ))}
            </div>
          )}
          <button
            type="button"
            className="bip-edit-remove"
            onClick={() => onRemove(idx)}
          >
            Remove claim
          </button>
        </div>
      ))}
      <button
        type="button"
        className="bip-edit-add"
        onClick={() =>
          onAdd({
            claim_id: "",
            text: "",
            indication: "",
            audience_segments: [],
            confidence: 0,
            citations: [],
          })
        }
      >
        + Add a claim
      </button>
    </div>
  );
}

function ProhibitedEditor({ items, onUpdate, onRemove, onAdd }) {
  return (
    <div className="bip-edit-items">
      {items.map((it, idx) => (
        <div key={idx} className="bip-edit-item">
          <div className="bip-edit-row">
            <label className="bip-edit-field-label">Pattern</label>
            <input
              type="text"
              className="bip-edit-input"
              value={it.pattern ?? ""}
              onChange={(e) => onUpdate(idx, { pattern: e.target.value })}
              placeholder='e.g. "cure", "guaranteed", off-label phrases'
            />
          </div>
          <div className="bip-edit-row">
            <label className="bip-edit-field-label">Reason category (optional)</label>
            <input
              type="text"
              className="bip-edit-input"
              value={it.reason_category ?? ""}
              onChange={(e) => onUpdate(idx, { reason_category: e.target.value })}
              placeholder="e.g. regulatory, off-label, unsupported_claim"
            />
          </div>
          <button
            type="button"
            className="bip-edit-remove"
            onClick={() => onRemove(idx)}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="bip-edit-add"
        onClick={() =>
          onAdd({ pattern: "", reason_category: "", citations: [] })
        }
      >
        + Add a prohibited pattern
      </button>
    </div>
  );
}

function SectionEditor({ sectionId, items, onUpdate, onRemove, onAdd }) {
  if (sectionId === "messaging_pillars") {
    return (
      <PillarsEditor items={items} onUpdate={onUpdate} onRemove={onRemove} onAdd={onAdd} />
    );
  }
  if (sectionId === "tone_parameters") {
    return (
      <ToneEditor items={items} onUpdate={onUpdate} onRemove={onRemove} onAdd={onAdd} />
    );
  }
  if (sectionId === "claims_inventory") {
    return (
      <ClaimsEditor items={items} onUpdate={onUpdate} onRemove={onRemove} onAdd={onAdd} />
    );
  }
  if (sectionId === "prohibited_territory") {
    return (
      <ProhibitedEditor items={items} onUpdate={onUpdate} onRemove={onRemove} onAdd={onAdd} />
    );
  }
  return null;
}
