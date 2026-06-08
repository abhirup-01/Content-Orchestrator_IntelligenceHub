// US 1.4 panel · US 1.6 forward-compat (Audit trail & edit logging).
//
// Read-only, append-only view over /profile/{id}/audit. Client-side filtering
// today (action / user / date range); when US 1.6 wires server-side filtering,
// the same controls just pass through as query params (already supported in
// the API client).

import { useEffect, useMemo, useState } from "react";
import {
  History,
  Filter,
  AlertCircle,
  Loader2,
  Lock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { getAudit } from "../api/intelligenceHubApi";

const ACTION_OPTIONS = [
  { value: "",         label: "All actions" },
  { value: "extract",  label: "Extract"     },
  { value: "accept",   label: "Accept"      },
  { value: "edit",     label: "Edit"        },
  { value: "flag",     label: "Flag"        },
  { value: "activate", label: "Activate"    },
];

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

/**
 * @param {object}  props
 * @param {string}  props.profileId
 * @param {boolean} [props.startOpen=false]   - mount expanded (page mode true)
 * @param {number}  [props.refreshKey=0]      - bump to trigger a refetch
 */
export default function BrandIntelligenceAuditLog({
  profileId,
  startOpen = false,
  refreshKey = 0,
}) {
  const [open,    setOpen]    = useState(startOpen);
  const [entries, setEntries] = useState(null);   // null = not loaded
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Filter state
  const [action, setAction] = useState("");
  const [user,   setUser]   = useState("");
  const [from,   setFrom]   = useState("");   // YYYY-MM-DD
  const [to,     setTo]     = useState("");

  const load = async () => {
    if (!profileId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getAudit(profileId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.response?.status === 404) {
        setEntries([]);
        setError("Audit endpoint isn't responding. Make sure the backend is up.");
      } else {
        setError(
          err?.response?.data?.detail || err?.message || "Failed to load audit log."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // refresh when the parent bumps refreshKey (e.g. after Accept / activate)
  }, [profileId, open, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side filtering until US 1.6 server-side filtering lands.
  const visible = useMemo(() => {
    if (!Array.isArray(entries)) return [];
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs   = to   ? new Date(to + "T23:59:59").getTime() : null;
    const userQ  = user.trim().toLowerCase();
    return entries.filter((e) => {
      if (action && e.action !== action) return false;
      if (userQ && !String(e.user || "").toLowerCase().includes(userQ)) return false;
      if (fromTs || toTs) {
        const t = new Date(e.timestamp).getTime();
        if (Number.isFinite(t)) {
          if (fromTs && t < fromTs) return false;
          if (toTs   && t > toTs)   return false;
        }
      }
      return true;
    });
  }, [entries, action, user, from, to]);

  const clearFilters = () => {
    setAction("");
    setUser("");
    setFrom("");
    setTo("");
  };

  return (
    <div className="bial-card" aria-label="Audit log">
      <button
        type="button"
        className="bial-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={14} strokeWidth={2.4} /> : <ChevronRight size={14} strokeWidth={2.4} />}
        <History size={14} strokeWidth={2.2} />
        <span>Audit log</span>
        {Array.isArray(entries) && <span className="bial-count">{entries.length}</span>}
        <span className="bial-readonlyChip" title="Append-only — no role can delete or modify entries (BR-SIH-003 / US 1.6)">
          <Lock size={10} strokeWidth={2.4} />
          read-only
        </span>
      </button>

      {open && (
        <div className="bial-body">
          {/* Filter row — server-side once US 1.6 lands. */}
          <div className="bial-filterRow">
            <div className="bial-filterField">
              <label className="bial-label" htmlFor="bial-action">
                <Filter size={11} strokeWidth={2.4} />
                <span>Action</span>
              </label>
              <select
                id="bial-action"
                className="bial-input"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="bial-filterField">
              <label className="bial-label" htmlFor="bial-user">User</label>
              <input
                id="bial-user"
                className="bial-input"
                type="text"
                placeholder="email or username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
            </div>
            <div className="bial-filterField">
              <label className="bial-label" htmlFor="bial-from">From</label>
              <input
                id="bial-from"
                className="bial-input"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="bial-filterField">
              <label className="bial-label" htmlFor="bial-to">To</label>
              <input
                id="bial-to"
                className="bial-input"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="bial-clearBtn"
              onClick={clearFilters}
              disabled={!action && !user && !from && !to}
            >
              Clear
            </button>
          </div>

          {loading && (
            <div className="bial-state">
              <Loader2 size={14} strokeWidth={2.4} className="bial-spin" />
              <span>Loading audit…</span>
            </div>
          )}

          {!loading && error && (
            <div className="bial-state bial-state-warn" role="alert">
              <AlertCircle size={14} strokeWidth={2.4} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="bial-state">
              <span>No audit entries match the current filters.</span>
            </div>
          )}

          {!loading && visible.length > 0 && (
            <div className="bial-tableWrap" role="region" aria-label="Audit entries">
              <table className="bial-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Section</th>
                    <th>Note / reason</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.entry_id}>
                      <td className="bial-when">{formatTimestamp(e.timestamp)}</td>
                      <td className="bial-who">{e.user || "—"}</td>
                      <td>
                        <span className={`bial-actionPill bial-action--${e.action}`}>
                          {e.action}
                        </span>
                      </td>
                      <td>{e.section || "—"}</td>
                      <td className="bial-noteCell">{e.note || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
