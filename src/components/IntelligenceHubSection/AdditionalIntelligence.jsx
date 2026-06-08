import React, { useState, useRef, useEffect } from "react";

import "./IntelligenceCss/AdditionalIntelligence.css";
import {  ArrowRight, Funnel, TrendingUp, Mail, Share2, Sparkles, Lightbulb, Layers, Zap, Users2 } from 'lucide-react';


export default function AdditionalIntelligence() {
  const [activeTab, setActiveTab] = useState("audience");

  // Example data (adjust as needed)
  const competitorThreats = [
    {
      name: "Descovy",
      note: "Descovy pricing change in United States",
      level: "high threat",
    },
    {
      name: "Descovy",
      note: "Descovy clinical data release in Europe",
      level: "high threat",
    },
    {
      name: "Descovy",
      note: "Descovy pricing change in United States",
      level: "high threat",
    },
  ];

  const topSubjectLines = [
    { title: "Efficacy", engagement: "0.4% engagement", uses: 24 },
    { title: "Dosing Convenience", engagement: "0.3% engagement", uses: 20 },
    { title: "Quality of Life", engagement: "0.3% engagement", uses: 21 },
  ];

  const topCTAs = [
    { title: "Contact Us", conv: "0.1% conversion", uses: 44 },
    { title: "Learn More", conv: "0.1% conversion", uses: 44 },
    { title: "Download", conv: "0.1% conversion", uses: 26 },
  ];

  const topFormats = [
    { title: "Email Series", meta: "High engagement" },
    { title: "One‑pager PDF", meta: "Steady conversions" },
    { title: "Web Article", meta: "Broad reach" },
  ];

  return (
      <div>
         <section className="ihub-card ihub-ccCard">
        <div className="ihub-tabs ihub-tabs--flush">
          <button
            className={`ihub-cross-tab ${activeTab === "audience" ? "active" : ""}`}
            onClick={() => setActiveTab("audience")}
          >
            Audience Insights
          </button>
          <button
            className={`ihub-cross-tab ${activeTab === "competitive" ? "active" : ""}`}
            onClick={() => setActiveTab("competitive")}
          >
            Competitive
          </button>
          <button
            className={`ihub-cross-tab ${activeTab === "success" ? "active" : ""}`}
            onClick={() => setActiveTab("success")}
          >
            Success Patterns
          </button>
        </div>

        {/* ===== Audience Insights (unchanged markup) ===== */}
        {activeTab === "audience" && (
          <section className=" ihub-addlCard">
            <div className="ihub-addlHead">
              <div className="ihub-addlTitle">
                <span> <Users2 size={16} className="h-1 w-1 mr-2 ihub-arrow-icon"/></span>
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
                  <div className="ihub-calloutTitle">
                    Top 3 Concerns They Have Right Now
                  </div>
                </div>
              </div>
            </div>

            {/* Concern rows */}
            <div className="ihub-concernList">
              <div className="ihub-concernRow">
                <div className="ihub-concernTitle">Patient adherence challenges</div>
                <div className="ihub-concernSub">
                  Mentioned 353 times • neutral sentiment
                </div>
              </div>

              <div className="ihub-concernRow">
                <div className="ihub-concernTitle">Safety profile concerns</div>
                <div className="ihub-concernSub">
                  Mentioned 343 times • positive sentiment
                </div>
              </div>

              <div className="ihub-concernRow">
                <div className="ihub-concernTitle">Dosing regimen preferences</div>
                <div className="ihub-concernSub">
                  Mentioned 320 times • positive sentiment
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== Competitive (new) ===== */}
        {activeTab === "competitive" && (
          <section className="ihub-card ihub-addlCard">
            <div className="aii-blockHeader">
              <div className="aii-blockTitle">
                <span className="aii-emoji">📊</span> Competitive Context
              </div>
            </div>

            <div className="aii-section aii-section--danger">
              <div className="aii-sectionTitle">
                <span className="aii-sectionIcon">⚠️</span> Active Competitor Threats
              </div>
              <div className="aii-threatList">
                {competitorThreats.map((t, idx) => (
                  <div className="aii-threatCard" key={`${t.name}-${idx}`}>
                    <div className="aii-threatHead">
                      <div className="aii-threatName">{t.name}</div>
                      <span className="aii-threatPill">{t.level}</span>
                    </div>
                    <div className="aii-threatNote">{t.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="aii-section aii-section--success">
              <div className="aii-sectionTitle">
                <span className="aii-sectionIcon">✅</span> Your Differentiation Opportunities
              </div>

              <div className="aii-diffCard">
                <div className="aii-diffTitle">Emphasize unique mechanism of action</div>
                <div className="aii-diffSub">
                  Competitive analysis shows gap in MOA messaging
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== Success Patterns (new) ===== */}
        {activeTab === "success" && (
          <section className="ihub-card ihub-addlCard">
            <div className="aii-blockHeader">
              <div className="aii-blockTitle">
                <span className="aii-emoji">⚡</span> What’s Working in Your Content
              </div>
            </div>

            <div className="aii-grid3">
              {/* Top Subject Lines */}
              <div className="aii-panel">
                <div className="aii-panelHead">
                  <span className="aii-panelIcon">✉️</span>
                  <span className="aii-panelTitle">Top Subject Lines</span>
                </div>
                <div className="aii-tileList">
                  {topSubjectLines.map((s) => (
                    <div className="aii-tile" key={s.title}>
                      <div className="aii-tileTitle">{s.title}</div>
                      <div className="aii-tileMeta">
                        <span>{s.engagement}</span>
                        <span className="aii-usesPill">{s.uses} uses</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top CTAs */}
              <div className="aii-panel">
                <div className="aii-panelHead">
                  <span className="aii-panelIcon">🖱️</span>
                  <span className="aii-panelTitle">Top CTAs</span>
                </div>
                <div className="aii-tileList">
                  {topCTAs.map((c) => (
                    <div className="aii-tile" key={c.title}>
                      <div className="aii-tileTitle">{c.title}</div>
                      <div className="aii-tileMeta">
                        <span>{c.conv}</span>
                        <span className="aii-usesPill">{c.uses} uses</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Formats */}
              <div className="aii-panel">
                <div className="aii-panelHead">
                  <span className="aii-panelIcon">🧾</span>
                  <span className="aii-panelTitle">Top Formats</span>
                </div>
                <div className="aii-tileList">
                  {topFormats.map((f) => (
                    <div className="aii-tile" key={f.title}>
                      <div className="aii-tileTitle">{f.title}</div>
                      <div className="aii-tileMeta">
                        <span>{f.meta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        </section>
      </div>
  );
}