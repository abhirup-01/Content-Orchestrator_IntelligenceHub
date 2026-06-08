// [CHANGE TRACKER] 2026-06-01 — Abhirup Nandi: NEW file (US 1.5), data-driven from the US 1.5 API (no stub data).
// US 1.5 — "Incremental Profile Refresh & Change Detection". Embedded panel (no own card frame), bir-* selectors.
// AC1 runIncrementalRefresh · AC2 getProfileChanges · AC3 getDownstreamImpact · AC4 reapproveStaleProfile · AC5 getRefreshStatus.

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  GitCompare,
  CalendarClock,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  ListChecks,
  ShieldOff,
  MessageSquareText,
  PlusCircle,
  Bell,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import {
  getRefreshStatus,
  runIncrementalRefresh as apiRunIncrementalRefresh,
  getProfileChanges,
  reapproveStaleProfile as apiReapproveStaleProfile,
  getDownstreamImpact,
} from "../api/intelligenceHubApi";
import "./IntelligenceCss/BrandIntelligenceRefresh.css";

// Audit-log identity (BR-SIH-003). Override via REACT_APP_CURRENT_USER.
const CURRENT_USER =
  process.env.REACT_APP_CURRENT_USER || "intelligence-hub-reviewer";

// Policy fallbacks only — authoritative values come from getRefreshStatus().
const DEFAULT_EXPIRY_DAYS = 90;
const DEFAULT_FLAG_WINDOW_MIN = 30;

// AC2 change-kind → icon + pill (UI config; unknown kinds fall back to "Changed").
const CHANGE_KIND_META = {
  claim_added:        { Icon: PlusCircle,        cls: "bir-change--added",   pill: "Added" },
  prohibited_updated: { Icon: ShieldOff,         cls: "bir-change--updated", pill: "Updated" },
  tone_changed:       { Icon: MessageSquareText, cls: "bir-change--changed", pill: "Changed" },
};
function changeMeta(kind) {
  return CHANGE_KIND_META[kind] || { Icon: GitCompare, cls: "bir-change--changed", pill: "Changed" };
}

// AC5 — format an ISO timestamp from the backend.
function formatTimestamp(iso) {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

// Pull a user-facing error string from an axios error without crashing on shape changes.
function readErrorMessage(err) {
  if (!err) return "Unknown error.";
  if (typeof err === "string") return err;
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  return err.message || "Unknown error.";
}

// `profileId` (the activated draft) keys every API call; absent → neutral "no profile" state.
export default function BrandIntelligenceRefresh({ profileId } = {}) {
  // AC5 — refresh status (Last Refreshed + 90-day countdown).
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // AC1 / AC2 — incremental refresh + detected changes.
  const [detecting, setDetecting] = useState(false);
  const [runError, setRunError] = useState(null);
  const [refreshSummary, setRefreshSummary] = useState(null);
  const [changes, setChanges] = useState(null);

  // AC4 — BR-SIH-001 Brand Manager re-approval gate.
  const [reapproving, setReapproving] = useState(false);
  const [reapproveError, setReapproveError] = useState(null);

  // AC3 — downstream impact flagging.
  const [downstream, setDownstream] = useState(null);
  const [downstreamLoading, setDownstreamLoading] = useState(false);
  const [downstreamError, setDownstreamError] = useState(null);

  // AC5 — load refresh status; keyed by profileId, tolerant of errors.
  const loadStatus = useCallback(async () => {
    if (!profileId) {
      setStatus(null);
      return;
    }
    setStatusLoading(true);
    setStatusError(null);
    try {
      const data = await getRefreshStatus(profileId);
      setStatus(data || null);
    } catch (err) {
      console.warn("[BrandIntelligenceRefresh] getRefreshStatus failed:", err);
      setStatusError(readErrorMessage(err));
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [profileId]);

  // Hydrate on mount and whenever the active profile changes.
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Derived state — server-authoritative, with policy fallbacks.
  const expiryDays = status?.expiry_days ?? DEFAULT_EXPIRY_DAYS;
  const flagWindowMin = status?.flag_window_minutes ?? DEFAULT_FLAG_WINDOW_MIN;
  const daysSinceRefresh = status?.days_since_refresh ?? null;
  const lastRefreshedAt = status?.last_refreshed_at ?? null;
  const daysRemaining = daysSinceRefresh != null ? expiryDays - daysSinceRefresh : null;
  const isStale = status?.refresh_required ?? (daysRemaining != null ? daysRemaining <= 0 : false);
  const reapproved = Boolean(status?.reapproved_at);
  const expiryPct =
    daysRemaining != null ? Math.max(0, Math.min(100, (daysRemaining / expiryDays) * 100)) : 0;

  const hasChanges = Array.isArray(changes) && changes.length > 0;

  // AC1 — incremental refresh (changed elements only) → load changes (AC2) → reload status (AC5).
  const onRunIncrementalRefresh = async () => {
    if (!profileId) {
      setRunError("No active profile. Activate a Brand Intelligence Profile first.");
      return;
    }
    if (detecting) return;
    setDetecting(true);
    setRunError(null);
    setDownstream(null);
    setDownstreamError(null);
    try {
      const summary = await apiRunIncrementalRefresh(profileId, CURRENT_USER);
      setRefreshSummary(summary || null);
      const changeSet = await getProfileChanges(profileId);
      setChanges(Array.isArray(changeSet) ? changeSet : []);
      await loadStatus();
    } catch (err) {
      console.warn("[BrandIntelligenceRefresh] incremental refresh failed:", err);
      setRunError(readErrorMessage(err));
    } finally {
      setDetecting(false);
    }
  };

  // AC4 — Brand Manager re-approval (BR-SIH-001) for a >90-day stale profile.
  const onReapprove = async () => {
    if (!profileId || reapproving) return;
    setReapproving(true);
    setReapproveError(null);
    try {
      await apiReapproveStaleProfile(profileId, CURRENT_USER);
      await loadStatus();
    } catch (err) {
      console.warn("[BrandIntelligenceRefresh] reapprove failed:", err);
      setReapproveError(readErrorMessage(err));
    } finally {
      setReapproving(false);
    }
  };

  // AC3 — load downstream atoms flagged within the re-activation window.
  const onLoadDownstream = async () => {
    if (!profileId || downstreamLoading) return;
    setDownstreamLoading(true);
    setDownstreamError(null);
    try {
      const data = await getDownstreamImpact(profileId);
      setDownstream(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("[BrandIntelligenceRefresh] getDownstreamImpact failed:", err);
      setDownstreamError(readErrorMessage(err));
    } finally {
      setDownstreamLoading(false);
    }
  };

  return (
    <div className="bir-embedded" aria-label="Incremental Profile Refresh & Change Detection">
      <div className="bir-divider" />

      {/* Header */}
      <div className="bir-head">
        <div className="bir-title-row">
          <RefreshCw className="bir-head-icon" strokeWidth={2} />
          <h3 className="bir-title">Incremental Profile Refresh &amp; Change Detection</h3>
        </div>
        <p className="bir-sub">
          Detect updated source documents, surface what changed in the Brand
          Intelligence Profile, and keep downstream content in sync. (US 1.5)
        </p>
      </div>

      {/* No active profile — needs an activated profile to key its calls. */}
      {!profileId && (
        <div className="bir-empty-state">
          <Inbox size={16} strokeWidth={2} />
          <span>
            No active Brand Intelligence Profile. Run ingestion and activate a
            profile above to enable refresh &amp; change detection.
          </span>
        </div>
      )}

      {profileId && (
        <>
          {/* AC5 — Last Refreshed + 90-day expiry countdown */}
          <div className={`bir-status-bar ${isStale ? "bir-status-bar--stale" : ""}`}>
            <div className="bir-status-item">
              <Clock size={14} strokeWidth={2} className="bir-status-icon" />
              <div>
                <div className="bir-status-label">Last refreshed</div>
                <div className="bir-status-value">
                  {statusLoading ? "Loading…" : formatTimestamp(lastRefreshedAt)}
                </div>
              </div>
            </div>

            <div className="bir-status-item bir-status-countdown">
              <CalendarClock size={14} strokeWidth={2} className="bir-status-icon" />
              <div className="bir-countdown-main">
                <div className="bir-status-label">
                  {expiryDays}-day expiry
                  <span className="bir-countdown-days">
                    {daysRemaining == null
                      ? "—"
                      : isStale
                      ? `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`
                      : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
                  </span>
                </div>
                <div className="bir-countdown-track">
                  <div
                    className={`bir-countdown-fill ${isStale ? "bir-countdown-fill--expired" : ""}`}
                    style={{ width: `${expiryPct}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              className="bir-refresh-status-btn"
              onClick={loadStatus}
              disabled={statusLoading}
              title="Reload refresh status"
            >
              <RefreshCw size={12} strokeWidth={2} className={statusLoading ? "bir-spin" : ""} />
              <span>Reload</span>
            </button>
          </div>

          {/* Status load error — non-blocking. */}
          {statusError && (
            <div className="bir-alert bir-alert-warning">
              <AlertTriangle size={14} strokeWidth={2.2} />
              <span>
                <strong>Could not load refresh status.</strong> {statusError}
              </span>
            </div>
          )}

          {/* AC4 — BR-SIH-001 stale-profile warning + re-approval gate */}
          {isStale && (
            <div className="bir-stale-gate">
              <div className="bir-alert bir-alert-warning">
                <AlertTriangle size={14} strokeWidth={2.2} />
                <span>
                  <strong>BR-SIH-001: Profile not refreshed in over {expiryDays} days.</strong>{" "}
                  Content generation using this profile requires Brand Manager
                  re-approval before proceeding.
                </span>
              </div>
              {reapproved ? (
                <div className="bir-alert bir-alert-success">
                  <CheckCircle2 size={14} strokeWidth={2.2} />
                  <span>
                    <strong>
                      Re-approved by {status?.reapproved_by || "Brand Manager"}
                    </strong>
                    {status?.reapproved_at ? ` · ${formatTimestamp(status.reapproved_at)}` : ""}.
                    Content generation is unblocked for this profile.
                  </span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="bir-reapprove-btn"
                    onClick={onReapprove}
                    disabled={reapproving}
                  >
                    {reapproving ? (
                      <RefreshCw size={14} strokeWidth={2.2} className="bir-spin" />
                    ) : (
                      <ShieldCheck size={14} strokeWidth={2.2} />
                    )}
                    <span>{reapproving ? "Submitting…" : "Brand Manager re-approval"}</span>
                  </button>
                  {reapproveError && (
                    <div className="bir-alert bir-alert-error">
                      <AlertTriangle size={14} strokeWidth={2.2} />
                      <span>
                        <strong>Re-approval failed.</strong> {reapproveError}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* AC1 — Incremental refresh trigger */}
          <div className="bir-refresh-trigger">
            <button
              type="button"
              className="bir-detect-btn"
              onClick={onRunIncrementalRefresh}
              disabled={detecting}
              title="Detect changed source documents and run an incremental update"
            >
              {detecting ? (
                <>
                  <RefreshCw size={14} strokeWidth={2.2} className="bir-spin" />
                  <span>Detecting changes…</span>
                </>
              ) : (
                <>
                  <GitCompare size={14} strokeWidth={2.2} />
                  <span>Run incremental refresh</span>
                </>
              )}
            </button>
            <p className="bir-trigger-hint">
              Re-ingests only changed elements — not the full corpus.
            </p>
          </div>

          {/* Incremental-run error */}
          {runError && (
            <div className="bir-alert bir-alert-error">
              <AlertTriangle size={14} strokeWidth={2.2} />
              <span>
                <strong>Incremental refresh failed.</strong> {runError}
              </span>
            </div>
          )}

          {/* AC1 — incremental-run confirmation banner (counts from the server) */}
          {refreshSummary && (
            <div className="bir-alert bir-alert-info">
              <GitCompare size={14} strokeWidth={2.2} />
              <span>
                <strong>Incremental update complete.</strong>{" "}
                {refreshSummary.changed_count ?? (Array.isArray(changes) ? changes.length : 0)}{" "}
                changed element
                {(refreshSummary.changed_count ?? (changes?.length || 0)) === 1 ? "" : "s"}{" "}
                identified
                {refreshSummary.skipped_count != null
                  ? ` · ${refreshSummary.skipped_count} unchanged element${refreshSummary.skipped_count === 1 ? "" : "s"} skipped`
                  : " — unchanged elements skipped"}{" "}
                (no full re-ingestion).
              </span>
            </div>
          )}

          {/* AC2 — Detected changes (previous value alongside new AI value) */}
          {Array.isArray(changes) && (
            <div className="bir-changes">
              <div className="bir-changes-head">
                <ListChecks size={14} strokeWidth={2} />
                <span>Detected changes</span>
              </div>

              {hasChanges ? (
                <ul className="bir-change-list">
                  {changes.map((c, idx) => {
                    const meta = changeMeta(c.kind);
                    const { Icon } = meta;
                    return (
                      <li key={c.id ?? idx} className={`bir-change-row ${meta.cls}`}>
                        <div className="bir-change-head">
                          <Icon size={14} strokeWidth={2} className="bir-change-icon" />
                          <span className="bir-change-label">{c.label || meta.pill}</span>
                          <span className="bir-change-pill">{meta.pill}</span>
                          {c.element && <span className="bir-change-element">{c.element}</span>}
                        </div>

                        {/* Previous → New diff */}
                        <div className="bir-diff">
                          <div className="bir-diff-col bir-diff-prev">
                            <div className="bir-diff-label">Previous</div>
                            <div className="bir-diff-value">
                              {c.previous != null && c.previous !== "" ? (
                                c.previous
                              ) : (
                                <span className="bir-diff-empty">— (not present)</span>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={14} strokeWidth={2} className="bir-diff-arrow" />
                          <div className="bir-diff-col bir-diff-next">
                            <div className="bir-diff-label">New (AI-derived)</div>
                            <div className="bir-diff-value">
                              {c.next != null && c.next !== "" ? (
                                c.next
                              ) : (
                                <span className="bir-diff-empty">— (removed)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="bir-empty-inline">
                  No changes detected in the latest incremental refresh.
                </div>
              )}
            </div>
          )}

          {/* AC3 — Downstream impact (flag atoms from prior version) */}
          {hasChanges && (
            <div className="bir-downstream">
              <div className="bir-downstream-head">
                <div className="bir-downstream-title">
                  <Bell size={14} strokeWidth={2} />
                  <span>Downstream impact</span>
                </div>
                <span className="bir-sla-pill">
                  <Clock size={11} strokeWidth={2.2} />
                  Flag within {flagWindowMin} min of re-activation
                </span>
              </div>

              <p className="bir-downstream-sub">
                Content atoms generated from the prior profile version. On
                re-activation they are flagged for review.
              </p>

              {downstreamError && (
                <div className="bir-alert bir-alert-error">
                  <AlertTriangle size={14} strokeWidth={2.2} />
                  <span>
                    <strong>Could not load downstream impact.</strong> {downstreamError}
                  </span>
                </div>
              )}

              {downstream == null ? (
                <button
                  type="button"
                  className="bir-flag-btn"
                  onClick={onLoadDownstream}
                  disabled={downstreamLoading}
                >
                  {downstreamLoading ? (
                    <RefreshCw size={13} strokeWidth={2.2} className="bir-spin" />
                  ) : (
                    <Bell size={13} strokeWidth={2.2} />
                  )}
                  <span>{downstreamLoading ? "Loading…" : "Check downstream impact"}</span>
                </button>
              ) : downstream.length === 0 ? (
                <div className="bir-empty-inline">
                  No downstream content atoms generated from the prior version.
                </div>
              ) : (
                <ul className="bir-atom-list">
                  {downstream.map((a, idx) => (
                    <li key={a.id ?? idx} className="bir-atom-row">
                      <div className="bir-atom-main">
                        <div className="bir-atom-name">{a.name}</div>
                        <div className="bir-atom-meta">
                          {a.type && <span className="bir-atom-type">{a.type}</span>}
                          {a.generated_from_version && (
                            <span className="bir-atom-from">from {a.generated_from_version}</span>
                          )}
                          {a.flagged_at && (
                            <span className="bir-atom-from">· {formatTimestamp(a.flagged_at)}</span>
                          )}
                        </div>
                      </div>
                      <span className="bir-atom-flag">
                        {a.flag_status || "Brand Intelligence Updated — review recommended"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
