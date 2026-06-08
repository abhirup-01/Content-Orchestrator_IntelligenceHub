import React, { useState } from "react";
import "./IntelligenceCss/CrossChannelInsights.css";
import {  ArrowRight, Funnel, TrendingUp, Mail, Share2, Sparkles, Lightbulb, Layers, Zap } from 'lucide-react';


export default function CrossChannelInsights() {
  const [activeTab, setActiveTab] = useState("journeys");

  // Data for the new tabs (adjust as needed)
  const attributionRows = [
    { channel: "Website", first: 15, last: 10, influenced: 30 },
    { channel: "Email", first: 7, last: 10, influenced: 22 },
    { channel: "Rep-Enabled", first: 6, last: 8, influenced: 16 },
  ];

  const synergyRows = [
    { combo: "Website + Email", engagement: 2.4, conversion: 3.1 },
    { combo: "Rep + Website", engagement: 2.8, conversion: 3.5 },
    { combo: "Website + Rep + Email", engagement: 3.2, conversion: 4.1 },
  ];

  return (
      <div>
        <section className="ihub-card ihub-ccCard">
        <div className="ihub-ccTop">
    <div className="ihub-ccTitle">
    <Layers size={22} className="h-1 w-1 mr-2 ihub-layer-icon" style={{color: "#a855f7"}}/>
      <div>
        <div className="ihub-cross-ciName">Cross-Channel Intelligence</div>
        <div className="ihub-cross-ciSubtitle"> Understand how channels work together to drive conversions</div>
      </div>
  </div>
    <button className="ihub-pillAction">Multi-Touch Analysis</button>
  </div>

          {/* Tabs */}
          <div className="ihub-tabs ihub-tabs--flush">
            <button
              className={`ihub-cross-tab ${activeTab === "journeys" ? "active" : ""}`}
              onClick={() => setActiveTab("journeys")}
            >
              Customer Journeys
            </button>
            <button
              className={`ihub-cross-tab ${activeTab === "attribution" ? "active" : ""}`}
              onClick={() => setActiveTab("attribution")}
            >
              Attribution
            </button>
            <button
              className={`ihub-cross-tab ${activeTab === "insights" ? "active" : ""}`}
              onClick={() => setActiveTab("insights")}
            >
              Multi-Touch Insights
            </button>
          </div>

          {/* --- Customer Journeys (kept exactly as you had) --- */}
          {activeTab === "journeys" && (
            <>
              {/* Top converting journeys callout */}
 <div className="ihub-intelTitle ihub-callout">
    <ArrowRight size={16} className="h-1 w-1 mr-2 ihub-arrow-icon"/>
      <div>
        <div className="ihub-top-ciName">Top Converting Journeys</div>
        <div className="ihub-top-ciSubtitle">These channel combinations drive the highest conversion rates.</div>
      </div>
    </div>
              {/* Journeys list */}
              <div className="ihub-journeyList">
                {/* Row 1 */}
                <div className="ihub-journeyRow">
                  <div className="ihub-journeyMain">
                    <div className="ihub-flow">
                      <span className="ihub-flowChip">Email</span>
                      <span className="ihub-flowSep">→</span>
                      <span className="ihub-flowChip">Website</span>
                      <span className="ihub-flowSep">→</span>
                      <span className="ihub-flowChip">Resource Download</span>
                    </div>
                    <div className="ihub-journeySub">855 conversions</div>
                  </div>
                  <span className="ihub-pillRate">24.1% conversion rate</span>
                </div>

                {/* Row 2 */}
                <div className="ihub-journeyRow">
                  <div className="ihub-journeyMain">
                    <div className="ihub-flow">
                      <span className="ihub-flowChip">Rep Visit</span>
                      <span className="ihub-flowSep">→</span>
                      <span className="ihub-flowChip">Website</span>
                      <span className="ihub-flowSep">→</span>
                      <span className="ihub-flowChip">Prescription</span>
                    </div>
                    <div className="ihub-journeySub">150 conversions</div>
                  </div>
                  <span className="ihub-pillRate">18.7% conversion rate</span>
                </div>

                {/* Row 3 */}
                <div className="ihub-journeyRow">
                  <div className="ihub-journeyMain">
                    <div className="ihub-flow">
                      <span className="ihub-flowChip">Website</span>
                      <span className="ihub-flowSep">→</span>
                      <span className="ihub-flowChip">Email Signup</span>
                      <span className="ihub-flowSep">→</span>
                      <span className="ihub-flowChip">Sample Request</span>
                    </div>
                    <div className="ihub-journeySub">120 conversions</div>
                  </div>
                  <span className="ihub-pillRate">12.3% conversion rate</span>
                </div>

                {/* Row 4 */}
                <div className="ihub-journeyRow">
                  <div className="ihub-journeyMain">
                    <div className="ihub-flow">
                      <span className="ihub-flowChip">Social</span>
                      <span className="ihub-flowSep">→</span>
                      <span className="ihub-flowChip">Website</span>
                      <span className="ihub-flowSep">→</span>
                      <span className="ihub-flowChip">Email Signup</span>
                    </div>
                    <div className="ihub-journeySub">90 conversions</div>
                  </div>
                  <span className="ihub-pillRate">10.1% conversion rate</span>
                </div>
              </div>
            </>
          )}

          {/* --- Attribution tab (new, uses separate CSS) --- */}
          {activeTab === "attribution" && (
            <>
              {/* <div className="ihub-callout">
                <div className="ihub-calloutTitle">Channel Attribution</div>
                <div className="ihub-calloutText">
                  How each channel contributes to customer journeys.
                </div>
              </div> */}

              <div className="ihub-intelTitle ihub-callout">
    <TrendingUp size={16} className="h-1 w-1 mr-2 ihub-arrow-icon"/>
      <div>
        <div className="ihub-top-ciName">Channel Attribution</div>
        <div className="ihub-top-ciSubtitle"> How each channel contributes to customer journeys.</div>
      </div>
    </div>
              <div className="cci-attr-list">
                {attributionRows.map((row) => (
                  <div className="cci-attr-card" key={row.channel}>
                    <div className="cci-attr-head">
                      <div className="cci-attr-title">{row.channel}</div>
                      <div className="cci-attr-influenced">{row.influenced}% influenced</div>
                    </div>

                    <div className="cci-attr-grid">
                      <AttrMetric label="First Touch" value={row.first} />
                      <AttrMetric label="Last Touch" value={row.last} />
                      <AttrMetric label="Influenced" value={row.influenced} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* --- Multi‑Touch Insights tab (new, uses separate CSS) --- */}
          {activeTab === "insights" && (
            <>
              {/* <div className="ihub-callout">
                <div className="ihub-calloutTitle">Multi‑Touch Synergy</div>
                <div className="ihub-calloutText">
                  Channel combinations that amplify engagement and conversions.
                </div>
              </div> */}

              <div className="ihub-intelTitle ihub-callout">
    <Zap size={16} className="h-1 w-1 mr-2 ihub-arrow-icon"/>
      <div>
        <div className="ihub-top-ciName">Multi‑Touch Synergy</div>
        <div className="ihub-top-ciSubtitle"> Channel combinations that amplify engagement and conversions.</div>
      </div>
    </div>

              <div className="cci-syn-list">
                {synergyRows.map((r) => (
                  <div key={r.combo} className="cci-syn-row">
                    <div className="cci-syn-main">
                      <div className="cci-syn-title">{r.combo}</div>
                      <div className="cci-syn-sub">Combined touchpoint effect</div>
                    </div>
                    <div className="cci-syn-badges">
                      <span className="cci-badge cci-badge--engagement">
                        {r.engagement.toFixed(1)}x engagement
                      </span>
                      <span className="cci-badge cci-badge--conversion">
                        {r.conversion.toFixed(1)}x conversion
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ihub-intelTitle ihub-callout cci-key-callout">
    <Zap size={16} className="h-1 w-1 mr-2 ihub-arrow-icon"/>
      <div>
        <div className="ihub-top-ciName">Key Insight</div>
        <div className="ihub-calloutText"> Combining <strong>Website + Rep + Email</strong> touchpoints delivers{" "}
        <strong>4.1x higher conversion rates</strong> than single‑channel approaches.</div>
      </div>
    </div>
            </>
          )}
        </section>
      </div>
    
  );
}

/** Metric bar uses only the new CSS classes defined in CrossChannelAdditions.css */
function AttrMetric({ label, value, strong = false }) {
  return (
    <div className={`cci-attr-metric ${strong ? "cci-attr-metric--strong" : ""}`}>
      <div className="cci-attr-metric-label">{label}</div>
      <div
        className="cci-meter"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={`${label} ${value}%`}
      >
        <span className="cci-meter-fill" style={{ width: `${value}%` }} />
      </div>
      <div className="cci-attr-metric-value">{value}%</div>
    </div>
  );
}