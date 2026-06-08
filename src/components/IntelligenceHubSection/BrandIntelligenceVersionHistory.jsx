// US 1.4 — Version history view.
//
// Reads from GET /profile/versions and renders an immutable, time-ordered
// table of every activated profile version. Clicking "Compare" against the
// previous version opens a diff modal driven by GET /profile/version/{id}/diff.
//
// Forward-compat:
//  - US 1.5 incremental refresh: each row's diff_summary will already carry
//    the per-version delta. No structural changes needed.
//  - US 1.6 audit retention: linked from the audit-log component below.

import { useEffect, useMemo, useState } from "react";
import {
  History,
  GitCommitHorizontal,
  X,
  Loader2,
  AlertCircle,
  FileDown,
  Eye,
} from "lucide-react";

import { listVersions, getVersionDiff } from "../api/intelligenceHubApi";

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

/**
 * @param {object} props
 * @param {string} [props.brand]       - filter scope; omit to list all versions
 * @param {string} [props.activeVersionId]  - highlight the row that matches
 * @param {number} [props.refreshKey=0] - bump to trigger a refetch (parent fires
 *                                        this after every activation so the
 *                                        history table picks up new versions)
 */
export default function BrandIntelligenceVersionHistory({
  brand,
  activeVersionId,
  refreshKey = 0,
}) {
  const [versions, setVersions]   = useState(null);    // null = not loaded
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState("");
  const [diffOpen, setDiffOpen]   = useState(null);    // { version, against }

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listVersions(brand);
      setVersions(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.response?.status === 404) {
        // Backend endpoint not built yet — surface a friendly stub state.
        setVersions([]);
        setError(
          "Version history endpoint isn't deployed yet. UI is ready — wire GET /profile/versions in the backend to populate."
        );
      } else {
        setError(
          err?.response?.data?.detail || err?.message || "Failed to load versions."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refire on brand change OR when the parent bumps refreshKey (activation,
    // re-activation, etc.) so the table picks up brand-new versions.
  }, [brand, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordered = useMemo(() => {
    if (!versions) return [];
    return [...versions].sort(
      (a, b) =>
        (b?.version_number ?? 0) - (a?.version_number ?? 0)
    );
  }, [versions]);

  return (
    <div className="bivh-card" aria-label="Version history">
      <div className="bivh-head">
        <div className="bivh-titleRow">
          <History className="bivh-headIcon" size={18} strokeWidth={2} />
          <h4 className="bivh-title">Version history</h4>
          {!loading && versions && (
            <span className="bivh-count">{versions.length}</span>
          )}
        </div>
        <p className="bivh-sub">
          Every activated version is immutable. Compare any two versions to
          see what changed (section additions, edits, and removals).
        </p>
      </div>

      {loading && (
        <div className="bivh-state">
          <Loader2 size={14} strokeWidth={2.4} className="bivh-spin" />
          <span>Loading versions…</span>
        </div>
      )}

      {!loading && error && (
        <div className="bivh-state bivh-state-warn" role="alert">
          <AlertCircle size={14} strokeWidth={2.4} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && versions && versions.length === 0 && (
        <div className="bivh-state">
          <span>No versions yet — activate a profile to record version 1.</span>
        </div>
      )}

      {!loading && versions && versions.length > 0 && (
        <div className="bivh-tableWrap" role="region" aria-label="Activated versions">
          <table className="bivh-table">
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">Activated</th>
                <th scope="col">By</th>
                <th scope="col">Δ vs previous</th>
                <th scope="col" className="bivh-thRight">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((v, idx) => {
                const prev = ordered[idx + 1] || null;
                const isCurrent =
                  v.is_current ||
                  (activeVersionId && v.version_id === activeVersionId);
                return (
                  <tr
                    key={v.version_id || v.version_number}
                    className={isCurrent ? "bivh-rowCurrent" : ""}
                  >
                    <td>
                      <span className="bivh-versionChip">
                        v{v.version_number}
                      </span>
                      {isCurrent && (
                        <span className="bivh-currentBadge">current</span>
                      )}
                    </td>
                    <td>{formatTimestamp(v.activated_at)}</td>
                    <td>{v.activated_by || "—"}</td>
                    <td className="bivh-diffCell">
                      {v.diff_summary || "Initial activation"}
                    </td>
                    <td className="bivh-actions">
                      <button
                        type="button"
                        className="bivh-iconBtn"
                        title="View this version"
                        aria-label={`View version ${v.version_number}`}
                      >
                        <Eye size={13} strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        className="bivh-iconBtn"
                        title="Export as JSON"
                        aria-label={`Export version ${v.version_number}`}
                      >
                        <FileDown size={13} strokeWidth={2.2} />
                      </button>
                      {prev && (
                        <button
                          type="button"
                          className="bivh-compareBtn"
                          onClick={() => setDiffOpen({ version: v, against: prev })}
                          title={`Compare v${v.version_number} against v${prev.version_number}`}
                        >
                          <GitCommitHorizontal size={12} strokeWidth={2.4} />
                          <span>Compare</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {diffOpen && (
        <DiffModal
          version={diffOpen.version}
          against={diffOpen.against}
          onClose={() => setDiffOpen(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff modal
// ─────────────────────────────────────────────────────────────────────────────

function DiffModal({ version, against, onClose }) {
  const [diff, setDiff]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getVersionDiff(version.version_id, against.version_id);
        if (!cancelled) setDiff(data);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          setError(
            "Diff endpoint isn't deployed yet. UI is ready — wire GET /profile/version/{id}/diff in the backend."
          );
        } else {
          setError(
            err?.response?.data?.detail || err?.message || "Failed to load diff."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [version.version_id, against.version_id]);

  // Esc to close — small a11y win.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="bivh-modalBackdrop" onClick={onClose} role="presentation">
      <div
        className="bivh-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Diff v${against.version_number} → v${version.version_number}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bivh-modalHead">
          <h3 className="bivh-modalTitle">
            Diff · v{against.version_number} → v{version.version_number}
          </h3>
          <button
            type="button"
            className="bivh-modalX"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        </div>

        {loading && (
          <div className="bivh-state">
            <Loader2 size={14} strokeWidth={2.4} className="bivh-spin" />
            <span>Computing diff…</span>
          </div>
        )}

        {!loading && error && (
          <div className="bivh-state bivh-state-warn" role="alert">
            <AlertCircle size={14} strokeWidth={2.4} />
            <span>{error}</span>
          </div>
        )}

        {!loading && diff && (
          <div className="bivh-diffBody">
            {diff.summary && (
              <p className="bivh-diffSummary">{diff.summary}</p>
            )}
            {["messaging_pillars", "tone_parameters", "claims_inventory", "prohibited_territory"].map((key) => (
              <DiffSection key={key} sectionKey={key} delta={diff.sections?.[key]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SECTION_LABELS = {
  messaging_pillars:    "Messaging Pillars",
  tone_parameters:      "Tone Parameters",
  claims_inventory:     "Claims Inventory",
  prohibited_territory: "Prohibited Territory",
};

function DiffSection({ sectionKey, delta }) {
  if (!delta) return null;
  const added   = Array.isArray(delta.added)   ? delta.added   : [];
  const removed = Array.isArray(delta.removed) ? delta.removed : [];
  const changed = Array.isArray(delta.changed) ? delta.changed : [];
  if (added.length === 0 && removed.length === 0 && changed.length === 0) return null;
  return (
    <div className="bivh-diffSection">
      <div className="bivh-diffSectionTitle">{SECTION_LABELS[sectionKey] || sectionKey}</div>
      <div className="bivh-diffLists">
        {added.length > 0 && (
          <DiffList tone="add" label={`Added (${added.length})`} items={added} />
        )}
        {changed.length > 0 && (
          <DiffList tone="change" label={`Changed (${changed.length})`} items={changed} />
        )}
        {removed.length > 0 && (
          <DiffList tone="remove" label={`Removed (${removed.length})`} items={removed} />
        )}
      </div>
    </div>
  );
}

function DiffList({ tone, label, items }) {
  return (
    <div className={`bivh-diffList bivh-diffList--${tone}`}>
      <div className="bivh-diffListLabel">{label}</div>
      <ul>
        {items.map((it, i) => (
          <li key={i}>{typeof it === "string" ? it : JSON.stringify(it)}</li>
        ))}
      </ul>
    </div>
  );
}
