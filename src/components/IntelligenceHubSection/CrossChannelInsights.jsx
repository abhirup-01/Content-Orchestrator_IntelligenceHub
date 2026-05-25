// Author: Abhirup Nandi — 2026-05-20
// Summary: New file — extracted from IntelligenceDashboard. Owns ccTab state + Customer Journeys / Attribution / Multi-Touch tabs with their datasets and JSX.

import React, { useState } from "react";
import { Layers, TrendingUp, Zap } from "lucide-react";
import "./IntelligenceCss/CrossChannelInsights.css";

export default function CrossChannelInsights() {
  // Cross-Channel Intelligence — tab state
  const [ccTab, setCcTab] = useState("journeys"); // "journeys" | "attribution" | "multitouch"

  // Static data for the Attribution & Multi-Touch tabs (kept inline — no API yet)
  const attributionRows = [
    { name: "Website",     firstTouch: 15, lastTouch: 10, influenced: 30 },
    { name: "Email",       firstTouch: 7,  lastTouch: 10, influenced: 22 },
    { name: "Rep-Enabled", firstTouch: 6,  lastTouch: 8,  influenced: 16 },
  ];
  const multiTouchRows = [
    { name: "Website + Email",       engagement: "2.4x", conversion: "3.1x" },
    { name: "Rep + Website",         engagement: "2.8x", conversion: "3.5x" },
    { name: "Website + Rep + Email", engagement: "3.2x", conversion: "4.1x" },
  ];

  return (
    <>
      <h3 className="ihub-sectionLabel">Cross-Channel Insights</h3>

      <section className="ihub-card ihub-ccCard">
        <div className="ihub-ccTop">
          <div className="ihub-ccTitle">
            <Layers className="ihub-section-icon cc-indigo" strokeWidth={2} />
            <div>
              <div className="ihub-intelName">Cross-Channel Intelligence</div>
              <div className="ihub-intelSubtitle">
                Understand how channels work together to drive conversions
              </div>
            </div>
          </div>

          <button className="ihub-pillAction">Multi-Touch Analysis</button>
        </div>

        {/* Tabs */}
        <div className="ihub-tabs ihub-tabs--flush">
          <button
            className={`ihub-tab ${ccTab === "journeys" ? "active" : ""}`}
            onClick={() => setCcTab("journeys")}
          >
            Customer Journeys
          </button>
          <button
            className={`ihub-tab ${ccTab === "attribution" ? "active" : ""}`}
            onClick={() => setCcTab("attribution")}
          >
            Attribution
          </button>
          <button
            className={`ihub-tab ${ccTab === "multitouch" ? "active" : ""}`}
            onClick={() => setCcTab("multitouch")}
          >
            Multi-Touch Insights
          </button>
        </div>

        {/* ───── Customer Journeys tab ───── */}
        {ccTab === "journeys" && (
          <>
            <div className="ihub-callout">
              <div className="ihub-calloutTitle">Top Converting Journeys</div>
              <div className="ihub-calloutText">
                These channel combinations drive the highest conversion rates.
              </div>
            </div>

            <div className="ihub-journeyList">
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

        {/* ───── Attribution tab ───── */}
        {ccTab === "attribution" && (
          <>
            <div className="ihub-callout ihub-callout--attribution">
              <div className="ihub-calloutRow">
                <TrendingUp className="ihub-calloutIcon ihub-calloutIcon--blue" strokeWidth={2.2} />
                <div className="ihub-calloutTitle">Channel Attribution</div>
              </div>
              <div className="ihub-calloutText">
                How each channel contributes to customer journeys.
              </div>
            </div>

            <div className="ihub-attrList">
              {attributionRows.map((row) => (
                <div className="ihub-attrRow" key={row.name}>
                  <div className="ihub-attrRowHead">
                    <span className="ihub-attrName">{row.name}</span>
                    <span className="ihub-attrInfluenced">{row.influenced}% influenced</span>
                  </div>

                  <div className="ihub-attrMetrics">
                    <div className="ihub-attrMetric">
                      <div className="ihub-attrMetricLabel">First Touch</div>
                      <div className="ihub-attrBar">
                        <span className="ihub-attrBarFill" style={{ width: `${row.firstTouch}%` }} />
                      </div>
                      <div className="ihub-attrMetricPct">{row.firstTouch}%</div>
                    </div>

                    <div className="ihub-attrMetric">
                      <div className="ihub-attrMetricLabel">Last Touch</div>
                      <div className="ihub-attrBar">
                        <span className="ihub-attrBarFill" style={{ width: `${row.lastTouch}%` }} />
                      </div>
                      <div className="ihub-attrMetricPct">{row.lastTouch}%</div>
                    </div>

                    <div className="ihub-attrMetric">
                      <div className="ihub-attrMetricLabel">Influenced</div>
                      <div className="ihub-attrBar">
                        <span className="ihub-attrBarFill" style={{ width: `${row.influenced}%` }} />
                      </div>
                      <div className="ihub-attrMetricPct">{row.influenced}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ───── Multi-Touch Insights tab ───── */}
        {ccTab === "multitouch" && (
          <>
            <div className="ihub-callout ihub-callout--synergy">
              <div className="ihub-calloutRow">
                <Zap className="ihub-calloutIcon ihub-calloutIcon--purple" strokeWidth={2.2} />
                <div className="ihub-calloutTitle">Multi-Touch Synergy</div>
              </div>
              <div className="ihub-calloutText">
                Channel combinations that amplify engagement and conversions.
              </div>
            </div>

            <div className="ihub-comboList">
              {multiTouchRows.map((row) => (
                <div className="ihub-comboRow" key={row.name}>
                  <div className="ihub-comboMain">
                    <div className="ihub-comboName">{row.name}</div>
                    <div className="ihub-comboSub">Combined touchpoint effect</div>
                  </div>
                  <div className="ihub-comboChips">
                    <span className="ihub-chip-engagement">{row.engagement} engagement</span>
                    <span className="ihub-chip-conversion">{row.conversion} conversion</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="ihub-callout ihub-callout--synergy ihub-keyInsight">
              <div className="ihub-calloutRow">
                <Zap className="ihub-calloutIcon ihub-calloutIcon--purple" strokeWidth={2.2} />
                <div className="ihub-calloutTitle">Key Insight</div>
              </div>
              <div className="ihub-calloutText">
                Combining Website + Rep + Email touchpoints delivers{" "}
                <strong>4.1x higher conversion rates</strong> than single-channel approaches.
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
