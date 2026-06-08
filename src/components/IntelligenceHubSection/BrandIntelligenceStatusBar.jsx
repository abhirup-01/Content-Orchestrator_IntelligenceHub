// Top sticky status bar for the Brand Intelligence page.
//
// One always-visible row at the top of the BrandIntelligence container
// summarising: status (active / awaiting / partial), version, refresh
// countdown stage, pending change count. Doubles as a context anchor so
// the user always knows the brand state without scrolling back up.
//
// Driven entirely by props — the parent (BrandIntelligence.jsx) is the
// owner of the data and passes a single `status` object. Keeps this
// component dumb / easy to drop into any layout.

import React from "react";
import "./IntelligenceCss/BrandIntelligenceStatusBar.css";

// Maps days-since-refresh to a 3-stage urgency label. Matches the
// ExpiryCountdown thresholds in BrandIncrementalProfile so colours stay
// consistent across the page.
function refreshStage(daysSinceRefresh, expiryDays = 90) {
  if (daysSinceRefresh == null) return { label: "—", level: "neutral" };
  const remaining = Math.max(0, expiryDays - daysSinceRefresh);
  if (remaining <= 5)  return { label: `${remaining}d left — refresh now`, level: "danger"  };
  if (remaining <= 20) return { label: `${remaining}d until expiry`,        level: "warning" };
  return { label: `${remaining}d left`, level: "safe" };
}

export default function BrandIntelligenceStatusBar({
  brand,
  versionNumber,
  status,          // "active" | "awaiting_review" | "inactive"
  isPartial,
  daysSinceRefresh,
  pendingChanges,  // number — optional
  onJumpToRefresh, // optional callback when the refresh chip is clicked
}) {
  const stage = refreshStage(daysSinceRefresh);
  const statusLabel = status === "active"
    ? "Active"
    : status === "inactive"
    ? "Inactive"
    : "Awaiting Activation";
  const statusLevel = status === "active" ? "safe" : "neutral";
  const versionLabel = versionNumber ? `v${versionNumber}` : "v—";

  return (
    <div className="bisb" role="region" aria-label="Brand Intelligence Status Bar">
      <div className="bisb__inner">
        <div className="bisb__brand">
          <span className="bisb__brand-dot" aria-hidden="true">◈</span>
          <span className="bisb__brand-name">{brand || "Brand Intelligence"}</span>
          <span className={`bisb__chip bisb__chip--${statusLevel}`}>{statusLabel}</span>
          <span className="bisb__chip bisb__chip--neutral">{versionLabel}</span>
          {isPartial && (
            <span className="bisb__chip bisb__chip--warning" title="Activated with partial connector coverage">
              Partial Coverage
            </span>
          )}
        </div>
        <div className="bisb__meta">
          <span
            className={`bisb__chip bisb__chip--${stage.level} ${onJumpToRefresh ? "bisb__chip--clickable" : ""}`}
            onClick={onJumpToRefresh}
            role={onJumpToRefresh ? "button" : undefined}
            tabIndex={onJumpToRefresh ? 0 : undefined}
            onKeyDown={(e) => {
              if (onJumpToRefresh && (e.key === "Enter" || e.key === " ")) onJumpToRefresh();
            }}
          >
            Refresh: {stage.label}
          </span>
          {typeof pendingChanges === "number" && pendingChanges > 0 && (
            <span className="bisb__chip bisb__chip--warning">
              {pendingChanges} change{pendingChanges === 1 ? "" : "s"} pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
