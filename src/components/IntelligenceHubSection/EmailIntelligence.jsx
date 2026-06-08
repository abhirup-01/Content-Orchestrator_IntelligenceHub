import React, { useState } from "react";
import "./IntelligenceCss/IntelligenceDashboard.css";
import "./IntelligenceCss/EmailIntelligence.css";
import { Mail, MousePointerClick, BarChart3, TrendingUp, Clock, Users } from 'lucide-react';


export default function EmailIntelligence() {
  // 1) ADD: tab state
  const [activeTab, setActiveTab] = useState("Campaigns");

  // Optional: mock data for the Subject Lines list
  const subjectLines = [
    { title: '“Email Campaign Jan 2025 – Wave 6”', metric: '31.5% open rate' },
    { title: '“Email Campaign Aug 2024 – Wave 3”', metric: '31.5% open rate' },
    { title: '“Email Campaign Nov 2024 – Wave 12”', metric: '31.1% open rate' },
    { title: '“Email Campaign Oct 2024 – Wave 14”', metric: '31.1% open rate' },
    { title: '“Email Campaign Oct 2023 – Wave 15”', metric: '31.1% open rate' },
  ];

  // ADD-ON: Send Timing Data
  const sendTimes = [
    { label: "Saturday at 5:00", metric: "21.6% avg open rate" },
    { label: "Tuesday at 5:00", metric: "21.5% avg open rate" },
    { label: "Thursday at 5:00", metric: "21.3% avg open rate" },
    { label: "Monday at 5:00", metric: "21% avg open rate" },
    { label: "Sunday at 5:00", metric: "20.7% avg open rate" },
  ];

  // ADD-ON: Segments Data
  const segments = [
    { name: "HCP-Infectious Disease", trend: "Stable", icon: "➡️", eng: "3.1% engagement" },
    { name: "Patient-Established", trend: "Improving", icon: "📈", eng: "3.1% engagement" },
    { name: "HCP-HIV Specialist", trend: "Stable", icon: "➡️", eng: "3% engagement" },
    { name: "HCP-Primary Care", trend: "Improving", icon: "📈", eng: "3% engagement" },
    { name: "HCP-Pharmacist", trend: "Improving", icon: "📈", eng: "3% engagement" },
    { name: "HCP-Nurse-NP-PA", trend: "Stable", icon: "➡️", eng: "3% engagement" },
    { name: "Patient-Newly Diagnosed", trend: "Stable", icon: "➡️", eng: "3% engagement" },
    { name: "Patient-Treatment-Experienced", trend: "Stable", icon: "➡️", eng: "3% engagement" },
    { name: "Caregiver-Family", trend: "Improving", icon: "📈", eng: "2.9% engagement" },
    { name: "Caregiver-Professional", trend: "Stable", icon: "➡️", eng: "2.9% engagement" },
  ];

  // 2) ADD: renderer for tab panels
  const renderTabPanel = () => {
    switch (activeTab) {
      case "Campaigns":
        return (
          <div>
            {/* Your original Campaign rows stay as-is */}
            {/* Row 1 */}
            <div className="ihub-camp-row">
              <div className="ihub-rowMain">
                <div className="ihub-rowTitle">Email Campaign Jan 2025 – Wave 6</div>
                <div className="ihub-rowSub">Patient: Newly Diagnosed</div>
                <div className="ihub-rowMeta">
                  <span>Opens: <b>31.5%</b></span>
                  <span>Clicks: <b>9.3%</b></span>
                  <span>Conv.: <b>4.3%</b></span>
                  <span>Sends: <b>30,042</b></span>
                </div>
              </div>
              <span className="ihub-pillState up">Above avg</span>
            </div>

            {/* Row 2 */}
            <div className="ihub-row">
              <div className="ihub-rowMain">
                <div className="ihub-rowTitle">Email Campaign Aug 2024 – Wave 3</div>
                <div className="ihub-rowSub">HCP: Primary Care</div>
                <div className="ihub-rowMeta">
                  <span>Opens: <b>31.5%</b></span>
                  <span>Clicks: <b>4.3%</b></span>
                  <span>Conv.: <b>4.3%</b></span>
                  <span>Sends: <b>37,868</b></span>
                </div>
              </div>
              <span className="ihub-pillState up">Above avg</span>
            </div>

            {/* Row 3 */}
            <div className="ihub-row">
              <div className="ihub-rowMain">
                <div className="ihub-rowTitle">Email Campaign Nov 2024 – Wave 12</div>
                <div className="ihub-rowSub">HCP: Infectious Disease</div>
                <div className="ihub-rowMeta">
                  <span>Opens: <b>31.1%</b></span>
                  <span>Clicks: <b>7.2%</b></span>
                  <span>Conv.: <b>7.2%</b></span>
                  <span>Sends: <b>42,802</b></span>
                </div>
              </div>
              <span className="ihub-pillState down">Below avg</span>
            </div>

            {/* Row 4 */}
            <div className="ihub-row">
              <div className="ihub-rowMain">
                <div className="ihub-rowTitle">Email Campaign Oct 2024 – Wave 14</div>
                <div className="ihub-rowSub">HCP: Pharmaceutical</div>
                <div className="ihub-rowMeta">
                  <span>Opens: <b>31.1%</b></span>
                  <span>Clicks: <b>8.3%</b></span>
                  <span>Conv.: <b>8.3%</b></span>
                  <span>Sends: <b>30,532</b></span>
                </div>
              </div>
              <span className="ihub-pillState up">Above avg</span>
            </div>

            {/* Row 5 */}
            <div className="ihub-row">
              <div className="ihub-rowMain">
                <div className="ihub-rowTitle">Email Campaign Oct 2023 – Wave 15</div>
                <div className="ihub-rowSub">HCP: Nurse NP‑PA</div>
                <div className="ihub-rowMeta">
                  <span>Opens: <b>31.1%</b></span>
                  <span>Clicks: <b>6.7%</b></span>
                  <span>Conv.: <b>6.7%</b></span>
                  <span>Sends: <b>58,213</b></span>
                </div>
              </div>
              <span className="ihub-pillState down">Below avg</span>
            </div>
          </div>
        );

      case "Subject Lines":
        // 3) SUBJECT LINES panel like your screenshot
        return (
          <div className="ihub-list">
            <div className="ihub-infoCard">
              {/* <div className="ihub-infoTitle">📈 Top Performing Subject Lines</div> */}
              <div className="ihub-infoTitle"><TrendingUp size={17} className="h-1 w-1 mr-4 mb-1"/> Top Performing Subject Lines</div>
              <div className="ihub-infoText">
                Use these patterns to improve your email open rates.
              </div>
            </div>

            {subjectLines.map((item, idx) => (
              <div className="ihub-sub-row" key={idx}>
                <div className="ihub-rowMain">
                  <div className="ihub-sub-rowTitle">{item.title}</div>
                </div>
                <span className="ihub-pillState soft success">{item.metric}</span>
              </div>
            ))}

            <div>
              <button className="ihub-ghostBtn">
                ✨ Generate Email Content
              </button>
            </div>
          </div>
        );

      case "Send Timing":
        return (
          <div className="ihub-list">
            <div className="ihub-infoCard">
              <div className="ihub-infoTitle"><Clock size={17} className="h-1 w-1 mr-2 mb-1"/> Optimal Send Times</div>
              <div className="ihub-infoText">
                Best times to reach your audience based on historical data.
              </div>
            </div>
            {sendTimes.map((item, idx) => (
              <div className="ihub-sub-row" key={idx}>
                <div className="ihub-rowMain flex-row">
                  <span className="ihub-rowIcon"><Clock size={16} className="h-1 w-1 mr-2"/></span>
                  <div className="ihub-rowTitle">{item.label}</div>
                </div>
                <span className="ihub-pillState soft grey">{item.metric}</span>
              </div>
            ))}
          </div>
        );

      case "Segments":
        return (
          <div className="ihub-list">
            <div className="ihub-infoCard">
              <div className="ihub-infoTitle"><Users size={17} className="h-1 w-1 mr-4 mb-1"/> Audience Segment Performance</div>
            </div>
            {segments.map((item, idx) => (
              <div className="ihub-sub-row" key={idx}>
                <div className="ihub-rowMain">
                  <div className="ihub-sub-rowTitle">{item.name}</div>
                  <div className="ihub-trend">
                    Trend: <span className={`trend-box ${item.trend === 'Stable' ? 'blue' : 'white'}`}>{item.icon}</span> {item.trend}
                  </div>
                </div>
                <span className="ihub-pillState soft success">{item.eng}</span>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ihub-web-ciCard">
     {/* <div className="ihub-ciHead">
  <div className="ihub-ciTitle">
    <Mail className="ihub-ciIcon main-green" size={24} />
    <div>
      <div className="ihub-ciName">Email Intelligence</div>
      <p className="ihub-subtitle-exact">Campaign performance for all audiences</p>
    </div>
  </div>
</div> */}

<div className="ihub-web-ciHead">
       <div className="ihub-web-ciTitle">
         <Mail className="ihub-ciIcon main-green" size={12}/>
         <div>
           <div className="ihub-web-eiName">Email Intelligence</div>
           <div className="ihub-web-ciSubtitle">Campaign performance for all audiences</div>
         </div>
       </div>
     </div>
      <div className="ihub-web-kpiRow">
  <div  className="ihub-web-kpi-page">
  <div className='mb-2'><Mail className="h-1 w-1 mr-2 ihub-web-page" size={19} /></div>
    <div className="ihub-web-kpiValue ihub-web-page">31.1%</div>
    <div className="ihub-web-kpiLabel ihub-web-page">Avg Open Rate</div>
  </div>
        <div className="ihub-web-kpi-avg">
        <div className='mb-2'><MousePointerClick className="h-1 w-1 mr-2 ihub-web-avg" size={19} /></div>
  <div className="ihub-web-kpiValue primary">6.9%</div>
  <div className="ihub-web-kpiLabel ihub-web-avg">Avg Click Rate</div>
        </div>
        <div className="ihub-web-kpi-active">
        <div className='mb-2'><BarChart3 className="h-1 w-1 mr-2 ihub-web-active" size={19} /></div>
  <div className="ihub-web-kpiValue ihub-web-active">10</div>
  <div className="ihub-web-kpiLabel ihub-web-active">Campaigns</div>
        </div>
        <div className="ihub-web-kpi-return">
        <div className='mb-2'><TrendingUp className="h-1 w-1 mr-2 ihub-web-return" size={19} /></div>
  <div className="ihub-web-kpiValue ihub-web-return">9.3%</div>
  <div className="ihub-web-kpiLabel ihub-web-return">Top Conv. Rate</div>
        </div>
      </div>

      <div className="ihub-web-card ihub-web-panel">
        {/* 4) REPLACE your static tabs with clickable tabs + active class */}
        <div className="ihub-web-tabs">
          <button
            className={`ihub-email-tab ${activeTab === "Campaigns" ? "active" : ""}`}
            onClick={() => setActiveTab("Campaigns")}
          >
            Campaigns
          </button>
          <button
            className={`ihub-email-tab ${activeTab === "Subject Lines" ? "active" : ""}`}
            onClick={() => setActiveTab("Subject Lines")}
          >
            Subject Lines
          </button>
          <button
            className={`ihub-email-tab ${activeTab === "Send Timing" ? "active" : ""}`}
            onClick={() => setActiveTab("Send Timing")}
          >
            Send Timing
          </button>
          <button
            className={`ihub-email-tab ${activeTab === "Segments" ? "active" : ""}`}
            onClick={() => setActiveTab("Segments")}
          >
            Segments
          </button>
        </div>

        {/* 5) RENDER the current tab's panel */}
        {renderTabPanel()}
      </div>
    </div>
  );
}