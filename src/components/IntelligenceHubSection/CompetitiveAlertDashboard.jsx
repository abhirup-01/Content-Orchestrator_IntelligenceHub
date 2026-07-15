import React, { useEffect, useState, useCallback } from "react";
import "./IntelligenceCss/CompetitiveAlertDashboard.css";
import {
  listAlerts, acknowledgeAlert, convertAlertUrgent, escalateAlert,
  getAlertNotifications, getAlertAudit,
} from "../api/competitiveIntelligenceApi";

/* US 2.5 — Competitive Alert Dashboard. All data is fetched live from
   GET /api/alerts (new-entrant / regulatory events detected by the backend
   AI agent over the US 2.1/2.2/2.3 ingested regulatory data) — no hardcoded
   content. Renders the most recent alert. */

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

export default function CompetitiveAlertDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, n, au] = await Promise.all([
        listAlerts(),
        getAlertNotifications().catch(() => ({ notifications: [] })),
        getAlertAudit().catch(() => ({ entries: [] })),
      ]);
      setAlerts(a || []);
      setNotifications(n.notifications || []);
      setAudit(au.entries || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(fn, id) {
    try { await fn(id); await load(); } catch (e) { setError(e.message); }
  }

  const alert = alerts[0]; // most recent

  return (
    <div className="cad-page">
      <header className="cad-hero">
        <h1>Competitive Alert — New Entrant &amp; Regulatory Event Detection</h1>
        <span className="cad-sla">HIGH PRIORITY • 4-Hour SLA</span>
      </header>

      {!loading && !alert && <div className="cad-rerun">No active alerts.</div>}

      {alert && (
        <section className="cad-banner">
          <div className="cad-top-row">
            <span className="cad-badge cad-regulatory">REGULATORY ALERT</span>
            <span>Version v{alert.version_number} · Detected {fmt(alert.detected_date)}</span>
          </div>
          <h2>{alert.event_type}</h2>
          <p>{alert.what_happened}</p>

          <div className="cad-grid">
            <div><b>Competitor</b><p>{alert.competitor_name || "—"}</p></div>
            <div><b>Product</b><p>{alert.product_name || "—"}</p></div>
            <div><b>Authority</b><p>{alert.authority || "—"}</p></div>
            <div><b>Published Date</b><p>{alert.published_date || "—"}</p></div>
            <div><b>Indication</b><p>{alert.indication || "—"}</p></div>
            <div><b>Affected Markets</b><p>{(alert.markets || []).join(", ") || "—"}</p></div>
          </div>

          <div className="cad-assessment">
            <h3>AI Assessment — {alert.ai_assessment_label || "Not Confirmed"}</h3>
            <p>{alert.ai_assessment}</p>
          </div>

          <div className="cad-prediction">
            <h3>Predicted Gap Types — {alert.predicted_gap_label || "Pending Confirmation"}</h3>
            {(alert.predicted_gap_types || []).map((g) => <span key={g} className="cad-chip">{g}</span>)}
          </div>

          <div className="cad-rerun">
            Gap Analysis Re-Run Status: <span className="cad-pending">{alert.gap_rerun_status || "pending"}</span>
          </div>

          <div className="cad-suggestions">
            <h3>Suggested Immediate Actions</h3>
            <ul>{(alert.suggested_actions || []).map((a) => <li key={a}>{a}</li>)}</ul>
          </div>

          <div className="cad-buttons">
            <button onClick={() => act(acknowledgeAlert, alert.alert_id)}>Acknowledge &amp; Monitor</button>
            <button onClick={() => act(convertAlertUrgent, alert.alert_id)}>Convert to Urgent Content Opportunity</button>
            <button onClick={() => act(escalateAlert, alert.alert_id)}>Escalate to Medical/Regulatory Affairs</button>
          </div>

          {alert.status && alert.status !== "new" && (
            <div className="cad-audit">Status: {alert.status} • Logged to Audit Trail</div>
          )}
        </section>
      )}

      <section className="cad-notification-card">
        <h3>Notification Delivery</h3>
        {notifications.length === 0 ? (
          <p>No notifications sent.</p>
        ) : (
          notifications.map((n, i) => (
            <p key={i}>{n.channel} → {n.recipient_role}: Sent ({fmt(n.created_at)})</p>
          ))
        )}
      </section>

      <section className="cad-audit-panel">
        <h3>Audit &amp; Version History</h3>
        <table>
          <thead><tr><th>Action</th><th>User</th><th>Timestamp</th></tr></thead>
          <tbody>
            {audit.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--gray4)" }}>No audit entries yet.</td></tr>
            ) : (
              audit.map((e) => (
                <tr key={e.audit_id}><td>{e.action}</td><td>{e.user}</td><td>{fmt(e.timestamp)}</td></tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
