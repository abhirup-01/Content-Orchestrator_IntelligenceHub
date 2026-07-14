import React, { useState } from "react";

import "./IntelligenceCss/CompetitiveManageGaps.css";



const gapData = [
  {
    id: 1,
    status: "NEW",
    gapType: "Messaging Gap",
    risk: "High",
    title:
      "Competitors emphasize rapid onset efficacy while own brand lacks equivalent messaging.",
    competitors: ["Pfizer", "Roche"],
    indication: "Metastatic Breast Cancer",
    audience: "Oncologists",
    signals: ["Website", "Congress", "Sales Aids"],
    firstDetected: "12-May-2026",
    lastUpdated: "13-Jul-2026",
    action: "Respond",
    previouslyDismissed: true,
    scores: {
      strategic: 9,
      competitor: 8,
      exposure: 7,
      time: 9,
    },
    rationale: {
      strategic:
        "Directly impacts the primary audience segment for growth.",
      competitor:
        "Competitors consistently reinforce this claim.",
      exposure:
        "Current brand messaging lacks sufficient coverage.",
      time:
        "Signals increased significantly during the last month."
    }
  }
];

const whitespaceData = [
  {
    id: 1,
    title:
      "Emerging physician interest around treatment sequencing content",
    score: 92,
    action: "Exploit"
  }
];

export default function CompetitiveManageGaps() {
  const [expandedId, setExpandedId] = useState(null);
  const [dismissModal, setDismissModal] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

  return (
    <div className="cmg-root">

      {/* HEADER */}

      <div className="cmg-header-card">
        <div>
          <h1>Competitive Intelligence Dashboard</h1>
          <p>Last Visit: 13 Jul 2026 | 09:30 AM</p>
        </div>

        <div className="cmg-refresh-area">
          <div>
            <p>Claims: 08:00 AM</p>
            <p>Messaging: 08:05 AM</p>
            <p>Audience: 08:10 AM</p>
            <p>Next Refresh: 04:00 PM</p>
          </div>

          <button className="cmg-btn-primary">
            Refresh Now
          </button>
        </div>
      </div>

      {/* FILTERS */}

      <div className="cmg-filters">

        <select>
          <option>Gap Type</option>
          <option>Claims Gap</option>
          <option>Messaging Gap</option>
          <option>Audience Gap</option>
          <option>Channel Gap</option>
          <option>Whitespace Opportunity</option>
        </select>

        <select>
          <option>Risk Rating</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <select>
          <option>Competitor</option>
        </select>

        <select>
          <option>Indication</option>
        </select>

        <select>
          <option>Audience Segment</option>
        </select>

        <input type="date" />

        <label>
          <input type="checkbox" />
          Delta Since Last Visit
        </label>

      </div>

      {/* KPI CARDS */}

      <div className="cmg-kpi-grid">

        <div className="cmg-kpi-card">
          <h3>Active Gaps</h3>
          <span>85</span>
        </div>

        <div className="cmg-kpi-card">
          <h3>High Risk</h3>
          <span>15</span>
        </div>

        <div className="cmg-kpi-card">
          <h3>Whitespace</h3>
          <span>24</span>
        </div>

        <div className="cmg-kpi-card">
          <h3>New Items</h3>
          <span>13</span>
        </div>

        <div className="cmg-kpi-card">
          <h3>Updated</h3>
          <span>8</span>
        </div>

      </div>

      {/* GAP MATRIX */}

      <h2 className="cmg-section-title">Gap Matrix</h2>

      {gapData.map((gap) => (
        <div className="cmg-gap-card" key={gap.id}>

          {gap.previouslyDismissed && (
            <div className="cmg-warning">
              Previously dismissed — updated context
            </div>
          )}

          <div className="cmg-top-row">

            <div className="cmg-tags">
              <span className="cmg-new-tag">
                {gap.status}
              </span>

              <span className="cmg-type-tag">
                {gap.gapType}
              </span>
            </div>

            <span
              className={`cmg-risk ${gap.risk.toLowerCase()}`}
            >
              {gap.risk}
            </span>
          </div>

          <h3>{gap.title}</h3>

          <div className="cmg-meta-grid">
            <div>
              <strong>Competitors:</strong>
              <p>{gap.competitors.join(", ")}</p>
            </div>

            <div>
              <strong>Indication:</strong>
              <p>{gap.indication}</p>
            </div>

            <div>
              <strong>Audience:</strong>
              <p>{gap.audience}</p>
            </div>

            <div>
              <strong>Recommended Action:</strong>
              <p>{gap.action}</p>
            </div>
          </div>

          <div className="cmg-chips">

            {gap.signals.map((s) => (
              <span key={s} className="cmg-chip">
                {s}
              </span>
            ))}

          </div>

          <div className="cmg-dates">

            <span>
              First Detected : {gap.firstDetected}
            </span>

            <span>
              Last Updated : {gap.lastUpdated}
            </span>

          </div>

          <button
            className="cmg-expand-btn"
            onClick={() =>
              setExpandedId(
                expandedId === gap.id ? null : gap.id
              )
            }
          >
            Risk Rating Transparency
          </button>

          {expandedId === gap.id && (
            <div className="cmg-risk-panel">

              <div className="cmg-score-card">
                <h4>Strategic Relevance</h4>
                <p>Score: {gap.scores.strategic}/10</p>
                <small>{gap.rationale.strategic}</small>
              </div>

              <div className="cmg-score-card">
                <h4>Competitor Strength</h4>
                <p>Score: {gap.scores.competitor}/10</p>
                <small>{gap.rationale.competitor}</small>
              </div>

              <div className="cmg-score-card">
                <h4>Own Brand Exposure</h4>
                <p>Score: {gap.scores.exposure}/10</p>
                <small>{gap.rationale.exposure}</small>
              </div>

              <div className="cmg-score-card">
                <h4>Time Sensitivity</h4>
                <p>Score: {gap.scores.time}/10</p>
                <small>{gap.rationale.time}</small>
              </div>

              <div className="cmg-evidence">
                <h4>Evidence</h4>

                <ul>
                  <li>Pfizer HCP Site - 23 Jun 2026</li>
                  <li>ASCO Congress - 15 Jun 2026</li>
                  <li>Roche Website - 01 Jul 2026</li>
                </ul>
              </div>

            </div>
          )}

          <div className="cmg-action-row">

            <button className="cmg-btn-primary">
              Convert to Content Opportunity
            </button>

            <button
              className="cmg-btn-secondary"
              onClick={() => setDismissModal(true)}
            >
              Dismiss
            </button>

            <button className="cmg-btn-secondary">
              Watch List
            </button>

            <button className="cmg-btn-secondary">
              Request Analysis
            </button>

          </div>

        </div>
      ))}

      {/* WHITESPACE */}

      <h2 className="cmg-section-title">
        Whitespace Opportunities
      </h2>

      {whitespaceData.map((item) => (
        <div className="cmg-whitespace-card" key={item.id}>

          <div className="cmg-white-tag">
            Whitespace Opportunity
          </div>

          <h3>{item.title}</h3>

          <div className="cmg-score">
            Opportunity Score : {item.score}
          </div>

          <p>
            Recommended Action : {item.action}
          </p>

        </div>
      ))}

      {/* PARITY */}

      <details className="cmg-parity">
        <summary>
          Parity Areas (Informational Only)
        </summary>

        <div className="cmg-parity-content">
          Own brand and competitors equally emphasize
          long-term safety profile and efficacy
          consistency.
        </div>
      </details>

      {/* REPORT */}

      <div className="cmg-report">

        <h2>Competitive Gap Report</h2>

        <button className="cmg-btn-primary">
          Export JSON
        </button>

        <button className="cmg-btn-primary">
          Export PDF
        </button>

        <button className="cmg-btn-primary">
          Export Excel
        </button>

      </div>

      {/* AUDIT */}

      <div className="cmg-audit">
        <h2>Audit Trail</h2>

        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Timestamp</th>
              <th>Reference</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>John Doe</td>
              <td>Dismiss</td>
              <td>13 Jul 2026</td>
              <td>Gap-001</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* DISMISS MODAL */}

      {dismissModal && (
        <div className="cmg-modal">

          <div className="cmg-modal-content">

            <h3>Dismiss Gap Item</h3>

            <textarea
              placeholder="Reason is required"
              value={dismissReason}
              onChange={(e) =>
                setDismissReason(e.target.value)
              }
            />

            <div className="cmg-modal-actions">

              <button
                className="cmg-btn-primary"
                disabled={!dismissReason}
              >
                Submit
              </button>

              <button
                className="cmg-btn-secondary"
                onClick={() => setDismissModal(false)}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}
