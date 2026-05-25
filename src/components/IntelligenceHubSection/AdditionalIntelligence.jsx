// Author: Abhirup Nandi — 2026-05-20
// Summary: New file — extracted from IntelligenceDashboard. Owns addlTab state + Audience / Competitive / Success Patterns tabs.

import React, { useState } from "react";
import {
  Users,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Mail,
  MousePointer,
  FileText,
} from "lucide-react";
import "./IntelligenceCss/AdditionalIntelligence.css";

export default function AdditionalIntelligence() {
  // Additional Intelligence — tab state
  const [addlTab, setAddlTab] = useState("audience"); // "audience" | "competitive" | "success"

  // Static datasets (kept inline — no API yet)
  const competitorThreats = [
    { name: "Descovy", detail: "Descovy pricing change in United States", level: "high threat" },
    { name: "Descovy", detail: "Descovy clinical data release in Europe", level: "high threat" },
    { name: "Descovy", detail: "Descovy pricing change in United States", level: "high threat" },
  ];
  const differentiationOpps = [
    {
      title: "Emphasize unique mechanism of action",
      detail: "Competitive analysis shows gap in MOA messaging",
    },
  ];
  const topSubjectLines = [
    { title: "Efficacy",           engagement: "0.4% engagement", uses: 24 },
    { title: "Dosing Convenience", engagement: "0.3% engagement", uses: 20 },
    { title: "Quality of Life",    engagement: "0.3% engagement", uses: 21 },
  ];
  const topCTAs = [
    { title: "Contact Us", conversion: "0.1% conversion", uses: 44 },
    { title: "Learn More", conversion: "0.1% conversion", uses: 44 },
    { title: "Download",   conversion: "0.1% conversion", uses: 26 },
  ];
  const topFormats = []; // empty as shown in screenshot

  return (
    <>
      <h3 className="ihub-sectionLabel">Additional Intelligence</h3>

      <div className="ihub-tabs ihub-tabs--plain">
        <button
          className={`ihub-tab ${addlTab === "audience" ? "active" : ""}`}
          onClick={() => setAddlTab("audience")}
        >
          Audience Insights
        </button>
        <button
          className={`ihub-tab ${addlTab === "competitive" ? "active" : ""}`}
          onClick={() => setAddlTab("competitive")}
        >
          Competitive
        </button>
        <button
          className={`ihub-tab ${addlTab === "success" ? "active" : ""}`}
          onClick={() => setAddlTab("success")}
        >
          Success Patterns
        </button>
      </div>

      {/* ───── Audience Insights tab ───── */}
      {addlTab === "audience" && (
        <section className="ihub-card ihub-addlCard">
          <div className="ihub-addlHead">
            <div className="ihub-addlTitle">
              <Users className="ihub-section-icon addl-slate" strokeWidth={2} />
              <div>
                <div className="ihub-intelName">Who You’re Writing For</div>
                <div className="ihub-intelSubtitle">Audience Size</div>
              </div>
            </div>

            <span className="ihub-pillData">100% data quality</span>
          </div>

          {/* Audience size big metric */}
          <div className="ihub-metricBlock">
            <div className="ihub-metricValue">232,052</div>
            <div className="ihub-metricHint">across all indications</div>
          </div>

          {/* Callout: Top concerns */}
          <div className="ihub-callout soft">
            <div className="ihub-calloutRow">
              <span className="ihub-calloutIcon">🟡</span>
              <div>
                <div className="ihub-calloutTitle">Top 3 Concerns They Have Right Now</div>
              </div>
            </div>
          </div>

          {/* Concern rows */}
          <div className="ihub-concernList">
            <div className="ihub-concernRow">
              <div className="ihub-concernTitle">Patient adherence challenges</div>
              <div className="ihub-concernSub">Mentioned 353 times • neutral sentiment</div>
            </div>

            <div className="ihub-concernRow">
              <div className="ihub-concernTitle">Safety profile concerns</div>
              <div className="ihub-concernSub">Mentioned 343 times • positive sentiment</div>
            </div>

            <div className="ihub-concernRow">
              <div className="ihub-concernTitle">Dosing regimen preferences</div>
              <div className="ihub-concernSub">Mentioned 320 times • positive sentiment</div>
            </div>
          </div>
        </section>
      )}

      {/* ───── Competitive tab ───── */}
      {addlTab === "competitive" && (
        <section className="ihub-card ihub-addlCard ihub-compCard">
          <div className="ihub-compHeader">
            <Shield className="ihub-section-icon comp-blue" strokeWidth={2} />
            <div className="ihub-compTitle">Competitive Context</div>
          </div>

          {/* Active Competitor Threats */}
          <div className="ihub-compGroup">
            <div className="ihub-compGroupHead threats">
              <AlertTriangle className="ihub-compGroupIcon" strokeWidth={2.2} />
              <span>Active Competitor Threats</span>
            </div>

            <div className="ihub-compList">
              {competitorThreats.map((t, idx) => (
                <div className="ihub-compThreat" key={idx}>
                  <div className="ihub-compThreatName">{t.name}</div>
                  <div className="ihub-compThreatDetail">{t.detail}</div>
                  <span className="ihub-compThreatPill">{t.level}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Differentiation Opportunities */}
          <div className="ihub-compGroup">
            <div className="ihub-compGroupHead opps">
              <CheckCircle2 className="ihub-compGroupIcon" strokeWidth={2.2} />
              <span>Your Differentiation Opportunities</span>
            </div>

            <div className="ihub-compList">
              {differentiationOpps.map((o, idx) => (
                <div className="ihub-compOpp" key={idx}>
                  <div className="ihub-compOppTitle">{o.title}</div>
                  <div className="ihub-compOppDetail">{o.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───── Success Patterns tab ───── */}
      {addlTab === "success" && (
        <section className="ihub-card ihub-addlCard ihub-successCard">
          <div className="ihub-successHeader">
            <Zap className="ihub-section-icon success-amber" strokeWidth={2} />
            <div className="ihub-successTitle">What’s Working in Your Content</div>
          </div>

          <div className="ihub-successGrid">
            {/* Top Subject Lines */}
            <div className="ihub-successCol">
              <div className="ihub-successColHead">
                <Mail className="ihub-successColIcon" strokeWidth={2} />
                <span>Top Subject Lines</span>
              </div>
              <div className="ihub-successList">
                {topSubjectLines.map((row, idx) => (
                  <div className="ihub-successItem" key={idx}>
                    <div className="ihub-successItemMain">
                      <div className="ihub-successItemTitle">{row.title}</div>
                      <div className="ihub-successItemSub">{row.engagement}</div>
                    </div>
                    <span className="ihub-successUses">{row.uses} uses</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top CTAs */}
            <div className="ihub-successCol">
              <div className="ihub-successColHead">
                <MousePointer className="ihub-successColIcon" strokeWidth={2} />
                <span>Top CTAs</span>
              </div>
              <div className="ihub-successList">
                {topCTAs.map((row, idx) => (
                  <div className="ihub-successItem" key={idx}>
                    <div className="ihub-successItemMain">
                      <div className="ihub-successItemTitle">{row.title}</div>
                      <div className="ihub-successItemSub">{row.conversion}</div>
                    </div>
                    <span className="ihub-successUses">{row.uses} uses</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Formats */}
            <div className="ihub-successCol">
              <div className="ihub-successColHead">
                <FileText className="ihub-successColIcon" strokeWidth={2} />
                <span>Top Formats</span>
              </div>
              <div className="ihub-successList">
                {topFormats.length === 0 ? (
                  <div className="ihub-successEmpty">&nbsp;</div>
                ) : (
                  topFormats.map((row, idx) => (
                    <div className="ihub-successItem" key={idx}>
                      <div className="ihub-successItemMain">
                        <div className="ihub-successItemTitle">{row.title}</div>
                        <div className="ihub-successItemSub">{row.sub}</div>
                      </div>
                      <span className="ihub-successUses">{row.uses} uses</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
