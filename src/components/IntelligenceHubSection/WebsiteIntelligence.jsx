// Author: Abhirup Nandi — 2026-05-20
// Summary: Replaced inline SVGs with lucide-react icons (Globe / Clock / FileText / Users / TrendingUp).

//  import React from "react";
//  import "./IntelligenceCss/IntelligenceDashboard.css";
 
//  export default function WebsiteIntelligence() {
//   return (
//  <div className="ihub-ciCard">
//       <div className="ihub-ciHead">
//         <div className="ihub-ciTitle">
//           <span className="ihub-ciIcon globe">🌐</span>
//           <div>
//             <div className="ihub-ciName">Website Intelligence</div>
//             <div className="ihub-ciSubtitle">Performance insights for all visitors</div>
//           </div>
//         </div>
//       </div>

//       <div className="ihub-kpiRow">
//         <div className="ihub-kpi">
//           <div className="ihub-kpiValue primary">186s</div>
//           <div className="ihub-kpiLabel">Avg Session</div>
//         </div>
//         <div className="ihub-kpi">
//           <div className="ihub-kpiValue">0</div>
//           <div className="ihub-kpiLabel">Pages/Session</div>
//         </div>
//         <div className="ihub-kpi">
//           <div className="ihub-kpiValue">0%</div>
//           <div className="ihub-kpiLabel">Return Rate</div>
//         </div>
//         <div className="ihub-kpi">
//           <div className="ihub-kpiValue">0</div>
//           <div className="ihub-kpiLabel">Active Pages</div>
//         </div>
//       </div>
//        <div className="ihub-card ihub-panel">
//     <div className="ihub-tabs">
//       <button className="ihub-tab active">Top Pages</button>
//       <button className="ihub-tab">Downloads</button>
//       <button className="ihub-tab">Search Terms</button>
//       <button className="ihub-tab">CTAs</button>
//       <button className="ihub-tab">Journey</button>
//     </div>

//     <div className="ihub-panelBody empty">
//       {/* Intentionally blank to match screenshot placeholder area */}
//     </div>
//   </div>
//     </div>
//   );
//     }

import React from "react";
import { Globe, Clock, FileText, Users, TrendingUp } from "lucide-react";
import "./IntelligenceCss/IntelligenceDashboard.css";
import "./IntelligenceCss/WebsiteIntelligence.css";

export default function WebsiteIntelligence() {
  return (
    <div className="ihub-ciCard-exact">
      {/* Header */}
      <div className="ihub-header-exact">
        <div className="ihub-title-row">
          <Globe className="ihub-globe-icon" strokeWidth={2} />
          <h2>Website Intelligence</h2>
        </div>
        <p className="ihub-subtitle-exact">Performance insights for all visitors</p>
      </div>

      {/* KPI Row */}
      <div className="ihub-kpi-grid">
        {/* Blue Card */}
        <div className="ihub-kpi-box box-blue">
          <Clock className="kpi-icon" strokeWidth={2} />
          <div className="kpi-val">186s</div>
          <div className="kpi-label">Avg Session</div>
        </div>

        {/* Green Card */}
        <div className="ihub-kpi-box box-green">
          <FileText className="kpi-icon" strokeWidth={2} />
          <div className="kpi-val">0</div>
          <div className="kpi-label">Pages/Session</div>
        </div>

        {/* Purple Card */}
        <div className="ihub-kpi-box box-purple">
          <Users className="kpi-icon" strokeWidth={2} />
          <div className="kpi-val">0%</div>
          <div className="kpi-label">Return Rate</div>
        </div>

        {/* Orange Card */}
        <div className="ihub-kpi-box box-orange">
          <TrendingUp className="kpi-icon" strokeWidth={2} />
          <div className="kpi-val">0</div>
          <div className="kpi-label">Active Pages</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ihub-tabs-wrapper">
        <button className="ihub-tab-btn active">Top Pages</button>
        <button className="ihub-tab-btn">Downloads</button>
        <button className="ihub-tab-btn">Search Terms</button>
        <button className="ihub-tab-btn">CTAs</button>
        <button className="ihub-tab-btn">Journey</button>
      </div>
    </div>
  );
}
