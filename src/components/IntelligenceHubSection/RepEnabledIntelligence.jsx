import React, { useState } from "react";
// import "./IntelligenceCss/IntelligenceDashboard.css";
import "./IntelligenceCss/RepEnabledIntelligence.css";
import {  TrendingUp, Share2, MessageCircle, Target, MapPin, ThumbsUp, Clock, Minus, ThumbsDown, Sparkles, FileText,Users, BarChart3 } from 'lucide-react';

export default function WebsiteIntelligence() {
  const [activeTab, setActiveTab] = useState("Activity Heatmap");

  return (
    <div className="ihub-card ihub-intelCard">
      <div className="ihub-intelHead">
        <div className="ihub-intelTitle">
          <Users size={24} className="h-1 w-1 mr-2 ihub-social-icon" style={{color: "#f97316"}}/>
          <div>
            <div className="ihub-web-ciName">Rep‑Enabled Intelligence</div>
            <div className="ihub-web-ciSubtitle">Field activity and content effectiveness insights</div>
          </div>
        </div>
      </div>

      {/* mini stats */}
      <div className="ihub-miniRow">
        <div className="ihub-web-kpi-active">
    <div className='mb-2'>  <Users size={19} className="h-1 w-1 mr-2 ihub-web-active"/></div>
      <div className="ihub-miniValue ihub-web-active">1,000</div>
      <div className="ihub-miniLabel ihub-web-active">Total Calls</div>
    </div>
    <div className="ihub-web-kpi-page">
    <div className='mb-2'>  <BarChart3 size={19} className="h-1 w-1 mr-2 ihub-web-page"/></div>
      <div className="ihub-miniValue ihub-web-page">5.4</div>
      <div className="ihub-miniLabel ihub-web-page">Avg Engagement</div>
    </div>
        <div className="ihub-web-kpi-return">
    <div className='mb-2'>  <FileText size={19} className="h-1 w-1 mr-2 ihub-web-return"/></div>
      <div className="ihub-miniValue ihub-web-return">0</div>
      <div className="ihub-miniLabel ihub-web-return">Content Pieces</div>
    </div>
    <div className="ihub-web-kpi-avg">
    <div className='mb-2'>  <Target size={19} className="h-1 w-1 mr-2 ihub-web-avg"/></div>
      <div className="ihub-miniValue ihub-web-avg">4</div>
      <div className="ihub-miniLabel ihub-web-avg">Active NBAs</div>
    </div>
    
      </div>

      {/* tabs */}
      <div className="ihub-web-card ihub-web-panel">
        <div className="ihub-rep-tabs">
          {["Activity Heatmap", "Content", "Next Best Actions", "Trends"].map((tab) => (
            <button
              key={tab}
              className={`ihub-rep-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Routing */}
      <div className="ihub-tab-content">
        
        {/* --- ACTIVITY HEATMAP TAB --- */}
        {activeTab === "Activity Heatmap" && (
          <>
            {/* <div className="ihub-softHeader">
              <span className="ihub-loc-icon">📍</span> Activity by Specialty &amp; Region
            </div> */}
            <div className="ihub-inforepCard">
              <div className="ihub-inforepTitle"><MapPin size={17} className="h-1 w-1 mr-4 mb-1" style={{color: "#f97316"}}/> Activity by Specialty &amp; Region</div>
            </div>
            <div className="ihub-activityList">
              {[
                { name: "HIV Specialist", sub: "Northeast", calls: "90", eng: "5.3" },
                { name: "Infectious Disease", sub: "Southeast", calls: "90", eng: "5.4" },
                { name: "Primary Care", sub: "Midwest", calls: "87", eng: "5.5" },
                { name: "Internal Medicine", sub: "West", calls: "85", eng: "5.2" },
                { name: "HIV Specialist", sub: "Southwest", calls: "83", eng: "5.1" },
                { name: "Infectious Disease", sub: "Northwest", calls: "82", eng: "5.1" },
                { name: "Primary Care", sub: "Northeast", calls: "82", eng: "5.0" },
                { name: "Internal Medicine", sub: "Southeast", calls: "82", eng: "5.5" },
              ].map((item, idx) => (
                <div className="ihub-activityRow" key={idx}>
                  <div className="ihub-activityMain">
                    <div className="ihub-activityName">{item.name}</div>
                    <div className="ihub-activitySub">{item.sub}</div>
                  </div>
                  <div className="ihub-activityRight">
                    <span className="ihub-qty">{item.calls} calls</span>
                    <span className="ihub-chip green">{item.eng} engagement</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- CONTENT TAB --- */}
        {activeTab === "Content" && (
          <>
            <div className="ihub-banner mint-banner">
              <div className="ihub-banner-title">
              <FileText size={17} className="h-1 w-1 mr-4" style={{color: "#16a34a"}}/> Content Effectiveness
              </div>
              <div className="ihub-banner-sub">See which content pieces drive the highest HCP engagement.</div>
            </div>
            {/* <button className="ihub-action-bar">
               <span className="ihub-magic-icon">✨</span> Generate Sales Aid
            </button> */}
            <button className="ihub-soc-genBtn">
  <Sparkles size={15} className="h-1 w-1 mr-2" style={{ color: "#0f172a" }} />
  Generate Sales Aid
</button>
          </>
        )}

        {/* --- NEXT BEST ACTIONS TAB --- */}
        {activeTab === "Next Best Actions" && (
          <>
            <div className="ihub-banner purple-banner">
              <div className="ihub-banner-title">
              <Target size={17} className="h-1 w-1 mr-4" style={{color: "#9333ea"}}/> Next Best Actions
              </div>
              <div className="ihub-banner-sub">Most effective follow-up actions from field visits.</div>
            </div>
            <div className="ihub-activityList">
              {[
                { name: "Follow-up", sub: "Recommended 254 times", conv: "30%" },
                { name: "Sample Request", sub: "Recommended 253 times", conv: "35%" },
                { name: "Educational Material", sub: "Recommended 248 times", conv: "40%" },
                { name: "Clinical Discussion", sub: "Recommended 245 times", conv: "36%" },
              ].map((item, idx) => (
                <div className="ihub-activityRow" key={idx}>
                  <div className="ihub-activityMain">
                    <div className="ihub-activityName">{item.name}</div>
                    <div className="ihub-activitySub">{item.sub}</div>
                  </div>
                  <div className="ihub-activityRight">
                    <span className="ihub-conversion-chip">{item.conv} conversion</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- TRENDS TAB --- */}
        {activeTab === "Trends" && (
          <>
            <div className="ihub-banner sky-banner">
              <div className="ihub-banner-title">
              <TrendingUp size={17} className="h-1 w-1 mr-4" style={{color: "#2563eb"}}/> Engagement Trends
              </div>
            </div>
            <div className="ihub-activityList">
              {[
                { name: "Aug 2024", calls: "268", eng: "7.5" },
                { name: "Sep 2024", calls: "289", eng: "7.8" },
                { name: "Oct 2024", calls: "256", eng: "7.4" },
                { name: "Nov 2024", calls: "312", eng: "8.1" },
              ].map((item, idx) => (
                <div className="ihub-activityRow" key={idx}>
                  <div className="ihub-activityMain">
                    <div className="ihub-activityName">{item.name}</div>
                  </div>
                  <div className="ihub-activityRight">
                    <span className="ihub-qty">{item.calls} calls</span>
                    <span className="ihub-chip green">{item.eng} engagement</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}