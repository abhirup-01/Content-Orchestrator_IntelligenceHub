// Author: Abhirup Nandi — 2026-05-20
// Summary: Added Layers / Users header icons; wired useNavigate for "Back to Dashboard"; extracted Cross-Channel + Additional Intelligence into child components; mounted <BrandIntelligence /> and <BrandIntelligenceContext />.

// import React from "react";
// import "./IntelligenceCss/IntelligenceDashboard.css";
// import WebsiteIntelligence from "./WebsiteIntelligence";
// import EmailIntelligence from "./EmailIntelligence";
// import SocialIntelligence from "./SocialIntelligence";

// const IconCheck = ({ size = 16 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// );

// const IconBack = ({ size = 16 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// );

// const IconRefresh = ({ size = 16 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <path d="M21 12a9 9 0 11-3-6.708" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//     <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// );

// const IconPlus = ({ size = 16 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//   </svg>
// );

// const IconGlobe = ({ size = 18 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
//     <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" stroke="currentColor" strokeWidth="2"/>
//   </svg>
// );

// const IconMail = ({ size = 18 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
//     <path d="M4 6l8 7 8-7" stroke="currentColor" strokeWidth="2" />
//   </svg>
// );

// const IconHash = ({ size = 18 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <path d="M10 3L7 21M17 3l-3 18M4 9h16M3 15h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//   </svg>
// );

// const IconHeadset = ({ size = 18 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <path d="M4 12a8 8 0 0116 0v5a3 3 0 01-3 3h-2v-6h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//     <path d="M7 20H6a3 3 0 01-3-3v-2a3 3 0 013-3h1v8z" stroke="currentColor" strokeWidth="2"/>
//   </svg>
// );

// const IconVideo = ({ size = 18 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
//     <path d="M16 10l5-3v10l-5-3v-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
//   </svg>
// );

// const ChevronDown = ({ size = 16 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//     <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// );

// const ChannelTile = ({ icon, title, desc, active }) => (
//   <button className={`ihub-channel ${active ? "active" : ""}`}>
//     <div className="ihub-channel-icon">{icon}</div>
//     <div className="ihub-channel-main">
//       <div className="ihub-channel-title">{title}</div>
//       <div className="ihub-channel-desc">{desc}</div>
//     </div>
//   </button>
// );

// const Select = ({ label, value = "All" }) => (
//   <div className="ihub-field">
//     <label className="ihub-label">{label}</label>
//     <div className="ihub-select">
//       <span>{value}</span>
//       <ChevronDown />
//     </div>
//   </div>
// );

// export default function IntelligenceDashboard() {
//   return (
//     <div className="ihub-wrap">
//       {/* top bar */}
//       <div className="ihub-toprow">
//         <button className="ihub-back">
//           <IconBack />
//           <span>Back to Dashboard</span>
//         </button>

//         <div className="ihub-spacer" />

//         <div className="ihub-actions">
//           <button className="ihub-btn ghost">
//             <IconRefresh />
//             <span>Refresh Data</span>
//           </button>
//           <button className="ihub-btn primary">
//             <IconPlus />
//             <span>Create from Scratch</span>
//           </button>
//         </div>
//       </div>

//       {/* title */}
//       <div className="ihub-heading">
//         <h1 className="ihub-title">
//           Intelligence <span className="ihub-title-accent">Hub</span>
//         </h1>
//         <p className="ihub-subtitle">
//           Channel‑first intelligence for smarter content creation • Select a channel and audience to discover insights
//         </p>
//       </div>

//       {/* Select Channel card */}
//       <section className="ihub-card">
//         <div className="ihub-card-title">
//           <span className="dot" /> Select Channel
//         </div>

//         <div className="ihub-channel-grid">
//           <ChannelTile
//             active
//             icon={<IconGlobe />}
//             title="Website"
//             desc="Page engagement, downloads, CTAs, search terms"
//           />
//           <ChannelTile
//             icon={<IconMail />}
//             title="Email"
//             desc="Open rates, click rates, subject lines, send timing"
//           />
//           <ChannelTile
//             icon={<IconHash />}
//             title="Social"
//             desc="Sentiment, trending topics, platform engagement"
//           />
//           <ChannelTile
//             icon={<IconHeadset />}
//             title="Rep-Enabled"
//             desc="Field activity, content effectiveness, NBA tracking"
//           />
//           <ChannelTile
//             icon={<IconVideo />}
//             title="Video/Webinar"
//             desc="Watch time, completion rates, engagement"
//           />
//         </div>

//         {/* Filters */}
//         <div className="ihub-filters">
//           <Select label="Audience Type" />
//           <Select label="Segment" />
//           <Select label="Region" />
//           <Select label="Time Range" value="All Time" />
//         </div>
//       </section>

//       {/* Opportunities */}
//       <section className="ihub-card">
//         <div className="ihub-card-head">
//           <div className="ihub-card-title">
//             <span className="bulb">💡</span> Content Opportunities
//           </div>
//           <span className="ihub-pill">2 opportunities</span>
//         </div>
//         <p className="ihub-muted">
//           Data‑driven content recommendations for all channels
//         </p>

       
//       </section>
//       {/* --- More Opportunities (detailed cards) --- */}
// <section className="ihub-card ihub-card--soft">
//   {/* Opportunity #1 */}
//   <div className="ihub-opCard">
//     <div className="ihub-opCard-left">
//       <div className="ihub-opCard-titleRow">
//         <span className="ihub-opBullet danger" />
//         <h3 className="ihub-opCard-title">Re‑engage HCP‑Infectious Disease Segment</h3>
//       </div>

//       <p className="ihub-opCard-subtext">
//         <strong>3.1% engagement</strong> – create targeted campaign to re‑activate this audience.
//       </p>

//       <div className="ihub-opCard-tagsRow">
//         <span className="ihub-tag light"><span className="ico">@</span> Email</span>
//         <span className="ihub-tag light">HCP</span>
//         <span className="ihub-tag light">Source: sfmc_campaign_raw</span>
//       </div>

//       <div className="ihub-opCard-recoRow">
//         <span className="ihub-recoLabel">Recommended:</span>
//         <div className="ihub-recoChips">
//           <span className="ihub-chip green">HCP Email</span>
//           <span className="ihub-chip blue">Rep Triggered Email</span>
//         </div>
//       </div>
//     </div>

//     <div className="ihub-opCard-right">
//       <button className="ihub-btn teal">
//         <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
//           <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//         </svg>
//         <span>Generate from Opportunity</span>
//       </button>
//     </div>
//   </div>

//   {/* divider */}
//   <div className="ihub-divider"></div>

//   {/* Opportunity #2 */}
//   <div className="ihub-opCard">
//     <div className="ihub-opCard-left">
//       <div className="ihub-opCard-titleRow">
//         <span className="ihub-opBullet success" />
//         <h3 className="ihub-opCard-title">Amplify “efficacy” Momentum</h3>
//       </div>

//       <p className="ihub-opCard-subtext">
//         <strong>25% growth with positive sentiment (50%)</strong> – create content to ride this wave.
//       </p>

//       <div className="ihub-opCard-tagsRow">
//         <span className="ihub-tag light"><span className="ico">#</span> Social</span>
//         <span className="ihub-tag light">All</span>
//         <span className="ihub-tag light">Source: social_listening_raw</span>
//       </div>

//       <div className="ihub-opCard-recoRow">
//         <span className="ihub-recoLabel">Recommended:</span>
//         <div className="ihub-recoChips">
//           <span className="ihub-chip violet">Social Media Post</span>
//           <span className="ihub-chip indigo">Paid Social Ad</span>
//         </div>
//       </div>
//     </div>

//     <div className="ihub-opCard-right">
//       <button className="ihub-btn teal">
//         <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
//           <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//         </svg>
//         <span>Generate from Opportunity</span>
//       </button>
//     </div>
//   </div>
// </section>

// {/* --- Channel Intelligence --- */}
// <section className="ihub-card">
//   <div className="ihub-card-title">
//     Channel Intelligence
//   </div>

//   <div className="ihub-ciGrid">
//     {/* Website Intelligence */}
//     <WebsiteIntelligence />

//     {/* Email Intelligence */}
//     <EmailIntelligence />
//   </div>
// </section>
// {/* --- Website Panels (Tabs stub + blank body) & Email Campaigns List --- */}
// <section className="ihub-twoCol">
//   {/* LEFT: Website tabs */}
 

//   {/* RIGHT: Email campaigns with tabs */}
 
// </section>
// {/* --- Social & Rep-Enabled Intelligence --- */}
// <section className="ihub-intelGrid">
//   {/* Left: Social Intelligence */}
 
//   <SocialIntelligence />

//   {/* Right: Rep-Enabled Intelligence */}
//   <div className="ihub-card ihub-intelCard">
//     <div className="ihub-intelHead">
//       <div className="ihub-intelTitle">
//         <span className="ihub-dot indigo"></span>
//         <div>
//           <div className="ihub-intelName">Rep‑Enabled Intelligence</div>
//           <div className="ihub-intelSubtitle">Field activity and content effectiveness insights</div>
//         </div>
//       </div>
//     </div>

//     {/* mini stats */}
//     <div className="ihub-miniRow">
//       <div className="ihub-mini peach">
//         <div className="ihub-miniValue">1,000</div>
//         <div className="ihub-miniLabel">Total Calls</div>
//       </div>
//       <div className="ihub-mini sky">
//         <div className="ihub-miniValue">5.4</div>
//         <div className="ihub-miniLabel">Avg Engagement</div>
//       </div>
//       <div className="ihub-mini mint">
//         <div className="ihub-miniValue">0</div>
//         <div className="ihub-miniLabel">Content Pieces</div>
//       </div>
//       <div className="ihub-mini purple">
//         <div className="ihub-miniValue">4</div>
//         <div className="ihub-miniLabel">Active NBIAs</div>
//       </div>
//     </div>

//     {/* tabs */}
//     <div className="ihub-tabs">
//       <button className="ihub-tab active">Activity Heatmap</button>
//       <button className="ihub-tab">Content</button>
//       <button className="ihub-tab">Next Best Actions</button>
//       <button className="ihub-tab">Trends</button>
//     </div>

//     {/* Activity section */}
//     <div className="ihub-softHeader">Activity by Specialty &amp; Region</div>

//     <div className="ihub-activityList">
//       <div className="ihub-activityRow">
//         <div className="ihub-activityMain">
//           <div className="ihub-activityName">HIV Specialist</div>
//           <div className="ihub-activitySub">Northeast</div>
//         </div>
//         <div className="ihub-activityRight">
//           <span className="ihub-qty">90 calls</span>
//           <span className="ihub-chip green">5.3 engagement</span>
//         </div>
//       </div>

//       <div className="ihub-activityRow">
//         <div className="ihub-activityMain">
//           <div className="ihub-activityName">Infectious Disease</div>
//           <div className="ihub-activitySub">Southeast</div>
//         </div>
//         <div className="ihub-activityRight">
//           <span className="ihub-qty">90 calls</span>
//           <span className="ihub-chip green">5.4 engagement</span>
//         </div>
//       </div>

//       <div className="ihub-activityRow">
//         <div className="ihub-activityMain">
//           <div className="ihub-activityName">Primary Care</div>
//           <div className="ihub-activitySub">Midwest</div>
//         </div>
//         <div className="ihub-activityRight">
//           <span className="ihub-qty">87 calls</span>
//           <span className="ihub-chip green">5.5 engagement</span>
//         </div>
//       </div>
//     </div>
//   </div>
// </section>
// {/* ===== Cross-Channel Insights ===== */}
// <h3 className="ihub-sectionLabel">Cross-Channel Insights</h3>

// <section className="ihub-card ihub-ccCard">
//   <div className="ihub-ccTop">
//     <div className="ihub-ccTitle">
//       <span className="ihub-dot indigo"></span>
//       <div>
//         <div className="ihub-intelName">Cross-Channel Intelligence</div>
//         <div className="ihub-intelSubtitle">
//           Understand how channels work together to drive conversions
//         </div>
//       </div>
//     </div>

//     <button className="ihub-pillAction">Multi-Touch Analysis</button>
//   </div>

//   {/* Tabs */}
//   <div className="ihub-tabs ihub-tabs--flush">
//     <button className="ihub-tab active">Customer Journeys</button>
//     <button className="ihub-tab">Attribution</button>
//     <button className="ihub-tab">Multi-Touch Insights</button>
//   </div>

//   {/* Top converting journeys callout */}
//   <div className="ihub-callout">
//     <div className="ihub-calloutTitle">Top Converting Journeys</div>
//     <div className="ihub-calloutText">
//       These channel combinations drive the highest conversion rates.
//     </div>
//   </div>

//   {/* Journeys list */}
//   <div className="ihub-journeyList">
//     {/* Row 1 */}
//     <div className="ihub-journeyRow">
//       <div className="ihub-journeyMain">
//         <div className="ihub-flow">
//           <span className="ihub-flowChip">Email</span>
//           <span className="ihub-flowSep">→</span>
//           <span className="ihub-flowChip">Website</span>
//           <span className="ihub-flowSep">→</span>
//           <span className="ihub-flowChip">Resource Download</span>
//         </div>
//         <div className="ihub-journeySub">855 conversions</div>
//       </div>
//       <span className="ihub-pillRate">24.1% conversion rate</span>
//     </div>

//     {/* Row 2 */}
//     <div className="ihub-journeyRow">
//       <div className="ihub-journeyMain">
//         <div className="ihub-flow">
//           <span className="ihub-flowChip">Rep Visit</span>
//           <span className="ihub-flowSep">→</span>
//           <span className="ihub-flowChip">Website</span>
//           <span className="ihub-flowSep">→</span>
//           <span className="ihub-flowChip">Prescription</span>
//         </div>
//         <div className="ihub-journeySub">150 conversions</div>
//       </div>
//       <span className="ihub-pillRate">18.7% conversion rate</span>
//     </div>

//     {/* Row 3 */}
//     <div className="ihub-journeyRow">
//       <div className="ihub-journeyMain">
//         <div className="ihub-flow">
//           <span className="ihub-flowChip">Website</span>
//           <span className="ihub-flowSep">→</span>
//           <span className="ihub-flowChip">Email Signup</span>
//           <span className="ihub-flowSep">→</span>
//           <span className="ihub-flowChip">Sample Request</span>
//         </div>
//         <div className="ihub-journeySub">120 conversions</div>
//       </div>
//       <span className="ihub-pillRate">12.3% conversion rate</span>
//     </div>

//     {/* Row 4 */}
//     <div className="ihub-journeyRow">
//       <div className="ihub-journeyMain">
//         <div className="ihub-flow">
//           <span className="ihub-flowChip">Social</span>
//           <span className="ihub-flowSep">→</span>
//           <span className="ihub-flowChip">Website</span>
//           <span className="ihub-flowSep">→</span>
//           <span className="ihub-flowChip">Email Signup</span>
//         </div>
//         <div className="ihub-journeySub">90 conversions</div>
//       </div>
//       <span className="ihub-pillRate">10.1% conversion rate</span>
//     </div>
//   </div>
// </section>
// {/* ===== Additional Intelligence ===== */}
// <h3 className="ihub-sectionLabel">Additional Intelligence</h3>

// <div className="ihub-tabs ihub-tabs--plain">
//   <button className="ihub-tab active">Audience Insights</button>
//   <button className="ihub-tab">Competitive</button>
//   <button className="ihub-tab">Success Patterns</button>
// </div>

// <section className="ihub-card ihub-addlCard">
//   <div className="ihub-addlHead">
//     <div className="ihub-addlTitle">
//       <span className="ihub-dot indigo"></span>
//       <div>
//         <div className="ihub-intelName">Who You’re Writing For</div>
//         <div className="ihub-intelSubtitle">Audience Size</div>
//       </div>
//     </div>

//     <span className="ihub-pillData">100% data quality</span>
//   </div>

//   {/* Audience size big metric */}
//   <div className="ihub-metricBlock">
//     <div className="ihub-metricValue">232,052</div>
//     <div className="ihub-metricHint">across all indications</div>
//   </div>

//   {/* Callout: Top concerns */}
//   <div className="ihub-callout soft">
//     <div className="ihub-calloutRow">
//       <span className="ihub-calloutIcon">🟡</span>
//       <div>
//         <div className="ihub-calloutTitle">Top 3 Concerns They Have Right Now</div>
//       </div>
//     </div>
//   </div>

//   {/* Concern rows */}
//   <div className="ihub-concernList">
//     <div className="ihub-concernRow">
//       <div className="ihub-concernTitle">Patient adherence challenges</div>
//       <div className="ihub-concernSub">Mentioned 353 times • neutral sentiment</div>
//     </div>

//     <div className="ihub-concernRow">
//       <div className="ihub-concernTitle">Safety profile concerns</div>
//       <div className="ihub-concernSub">Mentioned 343 times • positive sentiment</div>
//     </div>

//     <div className="ihub-concernRow">
//       <div className="ihub-concernTitle">Dosing regimen preferences</div>
//       <div className="ihub-concernSub">Mentioned 320 times • positive sentiment</div>
//     </div>
//   </div>
// </section>
//     </div>
//   );
// }

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./IntelligenceCss/IntelligenceDashboard.css";
import WebsiteIntelligence from "./WebsiteIntelligence";
import EmailIntelligence from "./EmailIntelligence";
import SocialIntelligence from "./SocialIntelligence";
import RepEnabledIntelligence  from "./RepEnabledIntelligence";
import CrossChannelInsights from "./CrossChannelInsights";
import AdditionalIntelligence from "./AdditionalIntelligence";
import BrandIntelligence from "./BrandIntelligence";
import {  ArrowLeft, Funnel, TrendingUp, Mail, Share2, Sparkles, Lightbulb, Layers } from 'lucide-react';
// Modified by Abhirup Nandi — 2026-05-25: BrandIntelligenceContext is now
// rendered inside <BrandIntelligence /> as a continuation of the Ingested
// Documents card, so it is no longer mounted separately here.

const IconCheck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBack = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconRefresh = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 12a9 9 0 11-3-6.708" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlus = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconGlobe = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const IconMail = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
    <path d="M4 6l8 7 8-7" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconHash = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M10 3L7 21M17 3l-3 18M4 9h16M3 15h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconHeadset = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12a8 8 0 0116 0v5a3 3 0 01-3 3h-2v-6h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 20H6a3 3 0 01-3-3v-2a3 3 0 013-3h1v8z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const IconVideo = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 10l5-3v10l-5-3v-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

const ChevronDown = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChannelTile = ({ icon, title, desc, active }) => (
  <button className={`ihub-channel ${active ? "active" : ""}`}>
    <div className="ihub-channel-icon">{icon}</div>
    <div className="ihub-channel-main">
      <div className="ihub-channel-title">{title}</div>
      <div className="ihub-channel-desc">{desc}</div>
    </div>
  </button>
);

// --- UPDATED SELECT COMPONENT ---
const Select = ({ label, options = [], initialValue = "All" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="ihub-field" ref={dropdownRef} style={{ position: "relative" }}>
      <label className="ihub-label">{label}</label>
      <div 
        className="ihub-select" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>{selectedValue}</span>
        <ChevronDown />
      </div>

      {isOpen && options.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          marginTop: "4px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          zIndex: 50,
          padding: "4px 0",
          overflow: "hidden"
        }}>
          {options.map((option) => {
            const isSelected = selectedValue === option;
            return (
              <div
                key={option}
                onClick={() => {
                  setSelectedValue(option);
                  setIsOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "14px",
                  backgroundColor: isSelected ? "#730000" : "transparent", // Dark red matching screenshot
                  color: isSelected ? "#ffffff" : "#333333",
                  transition: "background-color 0.1s"
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#f8fafc" }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent" }}
              >
                <span style={{ width: "24px", display: "flex", alignItems: "center" }}>
                  {isSelected && <IconCheck size={14} />}
                </span>
                {option}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
// --------------------------------

export default function IntelligenceDashboard() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState("All");
const [secondary, setSecondary] = useState("All");
const [region, setRegion] = useState("All");
const [timeRange, setTimeRange] = useState("All Time");

// DEPENDENT LOGIC BASED ON AUDIENCE TYPE
let secondaryLabel = "Segment";
let secondaryOptions = ["All"];

if (audience === "HCP") {
  secondaryLabel = "Specialty";
  secondaryOptions = [
    "All",
    "HIV Specialist",
    "Infectious Disease",
    "Primary Care",
    "Pharmacist",
    "Nurse-NP-PA",
    "Internal Medicine",
  ];
}

if (audience === "Patient") {
  secondaryLabel = "Journey Stage";
  secondaryOptions = [
    "All",
    "Newly Diagnosed",
    "Treatment Experienced",
    "Switching Treatment",
    "Long-term Managed",
  ];
}

if (audience === "Caregiver") {
  secondaryLabel = "Segment";
  secondaryOptions = [
    "All",
    "Family Caregiver",
    "Professional Caregiver",
  ];
}

// When audience changes → reset secondary
const handleAudienceChange = (value) => {
  setAudience(value);
  setSecondary("All");
};


const activeFilters = [];

if (audience !== "All") activeFilters.push(audience);
if (secondary !== "All") activeFilters.push(secondary);
if (region !== "All") activeFilters.push(region);
if (timeRange !== "All Time") activeFilters.push(timeRange);

// Clear all filters
const clearAllFilters = () => {
  setAudience("All");
  setSecondary("All");
  setRegion("All");
  setTimeRange("All Time");
};


  return (
    <div className="ihub-wrap">
      {/* top bar */}
      <div className="ihub-toprow">
        <button className="ihub-back" onClick={() => navigate('/')}>
          <IconBack />
          <span>Back to Dashboard</span>
        </button>

        <div className="ihub-spacer" />

        <div className="ihub-actions">
          <button className="ihub-btn ghost">
            <IconRefresh />
            <span>Refresh Data</span>
          </button>
          <button className="ihub-btn primary">
            <IconPlus />
            <span>Create from Scratch</span>
          </button>
        </div>
      </div>

      {/* title */}
      <div className="ihub-heading">
        <h1 className="ihub-title">
          Intelligence Hub
        </h1>
        <p className="ihub-subtitle">
          Channel‑first intelligence for smarter content creation • Select a channel and audience to discover insights
        </p>
      </div>

     {/* Select Channel card */}
     <section className="ihub-card">
        <div className="ihub-card-title1">
        <svg

    width="20"

    height="20"

    viewBox="0 0 24 24"

    fill="none"

    stroke="#00CFFF"

    strokeWidth="2"

    strokeLinecap="round"

    strokeLinejoin="round"

    style={{ marginRight: '1px' }}

  >

    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>

  </svg> Select Channel
        </div>

        <div className="ihub-channel-grid">
          <ChannelTile
            // active
            icon={<IconGlobe />}
            title="Website"
            desc="Page engagement, downloads, CTAs, search terms"
          />
          <ChannelTile
            icon={<IconMail />}
            title="Email"
            desc="Open rates, click rates, subject lines, send timing"
          />
          <ChannelTile
            icon={<IconHash />}
            title="Social"
            desc="Sentiment, trending topics, platform engagement"
          />
          <ChannelTile
            icon={<IconHeadset />}
            title="Rep-Enabled"
            desc="Field activity, content effectiveness, NBA tracking"
          />
          <ChannelTile
            icon={<IconVideo />}
            title="Video/Webinar"
            desc="Watch time, completion rates, engagement"
          />
        </div>

        {/* Filters */}
        <div className="ihub-filters">
       
{/* Audience Type */}
  <div className="ihub-field">
    <label className="ihub-label">Audience Type</label>
    <select
      className="ihub-native-select"
      value={audience}
      onChange={(e) => handleAudienceChange(e.target.value)}
    >
      <option>All</option>
      <option>HCP</option>
      <option>Patient</option>
      <option>Caregiver</option>
    </select>
  </div>

  {/* Specialty / Journey Stage / Segment */}
  <div className="ihub-field">
    <label className="ihub-label">{secondaryLabel}</label>
    <select
      className="ihub-native-select"
      value={secondary}
      onChange={(e) => setSecondary(e.target.value)}
      disabled={secondaryOptions.length === 1}
    >
      {secondaryOptions.map((item) => (
        <option key={item}>{item}</option>
      ))}
    </select>
  </div>

  {/* Region */}
  <div className="ihub-field">
    <label className="ihub-label">Region</label>
    <select
      className="ihub-native-select"
      value={region}
      onChange={(e) => setRegion(e.target.value)}
    >
      <option>All</option>
      <option>Northeast</option>
      <option>Southeast</option>
      <option>Midwest</option>
      <option>West</option>
      <option>Southwest</option>
    </select>
  </div>

  {/* Time Range */}
  <div className="ihub-field">
    <label className="ihub-label">Time Range</label>
    <select
      className="ihub-native-select"
      value={timeRange}
      onChange={(e) => setTimeRange(e.target.value)}
    >
      <option>All Time</option>
      <option>Last 7 Days</option>
      <option>Last 30 Days</option>
      <option>Last 90 Days</option>
      <option>Last 12 Months</option>
    </select>
  </div>
        </div>
        {/* Active filter chips (as in screenshots) */}
 <div className="ihub-active-filters">
         
{activeFilters.length > 0 && (
  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
    <strong>Active filters:</strong>

    {activeFilters.map((f) => (
      <span
        key={f}
        style={{
          background: "#eef2ff",
          padding: "4px 10px",
          borderRadius: "20px",
          fontSize: "12px",
          color: "#3730a3",
          fontWeight: "600"
        }}
      >
        {f}
      </span>
    ))}

    {/* Clear All */}
    <button
      onClick={clearAllFilters}
      style={{
        background: "none",
        border: "none",
        color: "#0ea5e9",
        fontWeight: "600",
        cursor: "pointer"
      }}
    >
      Clear all
    </button>
  </div>
)}

        </div>

      </section>

     {/* Opportunities */}
     {/* <section className="ihub-card">
        <div className="ihub-card-head">
          <div className="ihub-card-title">
            <span className="bulb">💡</span> Content Opportunities
          </div>
          <span className="ihub-pill">2 opportunities</span>
        </div>
        <p className="ihub-muted">
          Data‑driven content recommendations for all channels
        </p>
       
      
     
  <div className="ihub-opCard">
    <div className="ihub-opCard-left">
      <div className="ihub-opCard-titleRow">
      <Lightbulb size={19} className="h-1 w-1 mr-2 ihub-web-return"/>
        <h3 className="ihub-opCard-title">Re‑engage HCP‑Infectious Disease Segment</h3>
      </div>

      <p className="ihub-opCard-subtext">
        3.1% engagement – create targeted campaign to re‑activate this audience.
      </p>

      <div className="ihub-opCard-tagsRow">
        <span className="ihub-tag light"> <Mail size={15} className="h-1 w-1 mr-2" style={{color: "black"}}/> Email</span>
        <span className="ihub-tag light">HCP</span>
        <span className="ihub-tag light">Source: sfmc_campaign_raw</span>
      </div>
      <div className="soft-divider" />
      <div className="ihub-opCard-recoRow">
        <span className="ihub-recoLabel">Recommended:</span>
        <div className="ihub-recoChips">
          <span className="ihub-chip green">HCP Email</span>
          <span className="ihub-chip blue">Rep Triggered Email</span>
        </div>
      </div>
    </div>

    <div className="ihub-opCard-right">
      <button className="ihub-btn teal">
      <Sparkles size={15} className="h-1 w-1 mr-2" style={{color: "white"}}/>
        <span>Generate from Opportunity</span>
      </button>
    </div>
  </div>


  <div className="ihub-divider"></div>


  <div className="ihub-opCard">
    <div className="ihub-opCard-left">
      <div className="ihub-opCard-titleRow">
      <TrendingUp size={19} className="h-1 w-1 mr-2 ihub-web-page"/>
        <h3 className="ihub-opCard-title">Amplify “efficacy” Momentum</h3>
      </div>

      <p className="ihub-opCard-subtext">
        25% growth with positive sentiment (50%) – create content to ride this wave.
      </p>

      <div className="ihub-opCard-tagsRow">
        <span className="ihub-tag light"> <Share2 size={15} className="h-1 w-1 mr-2" style={{color: "black"}}/> Social</span>
        <span className="ihub-tag light">All</span>
        <span className="ihub-tag light">Source: social_listening_raw</span>
      </div>
      <div className="soft-divider" />
      <div className="ihub-opCard-recoRow">
        <span className="ihub-recoLabel">Recommended:</span>
        <div className="ihub-recoChips">
          <span className="ihub-chip violet">Social Media Post</span>
          <span className="ihub-chip indigo">Paid Social Ad</span>
        </div>
      </div>
    </div>

    <div className="ihub-opCard-right">
      <button className="ihub-btn teal">
      <Sparkles size={15} className="h-1 w-1 mr-2" style={{color: "white"}}/>
        <span>Generate from Opportunity</span>
      </button>
    </div>
  </div> 
</section> */}

<section className="ihub-card">
 {/* --- Brand Intelligence Connectors (data sources) --- */}
 <BrandIntelligence />
 </section>

   {/* </section> */}
{/* --- Channel Intelligence --- */}
<section className="ihub-card">
  <div className="ihub-card-title">
    Channel Intelligence
  </div>

  <div className="ihub-ciGrid">
    {/* Website Intelligence */}
    <WebsiteIntelligence />

    {/* Email Intelligence */}
    <EmailIntelligence />
  </div>

{/* --- Website Panels (Tabs stub + blank body) & Email Campaigns List --- */}
{/* <section className="ihub-twoCol">
 
</section> */}
{/* --- Social & Rep-Enabled Intelligence --- */}
<section className="ihub-intelGrid">
  <SocialIntelligence />
  {/* <div className="ihub-card ihub-intelCard"> */}
 <RepEnabledIntelligence />
  {/* </div> */}
</section>
</section>
{/* ===== Cross-Channel Insights ===== */}
<h3 className="ihub-sectionLabel">Cross-Channel Insights</h3>
<CrossChannelInsights />

{/* ===== Additional Intelligence ===== */}
 <h3 className="ihub-sectionLabel">Additional Intelligence</h3>
<AdditionalIntelligence />
    </div>
  );
}