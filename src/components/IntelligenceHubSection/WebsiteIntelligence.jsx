import React, { useEffect, useMemo, useRef, useState } from "react";
import "./IntelligenceCss/IntelligenceDashboard.css";
import {  Clock, FileText, Users, TrendingUp } from 'lucide-react';

export default function WebsiteIntelligence() {

  
const [activeTab, setActiveTab] = useState("Top Pages");

// 2) Tab list (easy to add/remove)
const tabs = ["Top Pages", "Downloads", "Search Terms", "CTAs", "Journey"];

 return (
<div className="ihub-web-ciCard">
     <div className="ihub-web-ciHead">
       <div className="ihub-web-ciTitle">
         <span className="ihub-web-ciIcon globe">🌐</span>
         <div>
           <div className="ihub-web-ciName">Website Intelligence</div>
           <div className="ihub-web-ciSubtitle">Performance insights for all visitors</div>
         </div>
       </div>
     </div>

     <div className="ihub-web-kpiRow">
       <div className="ihub-web-kpi-avg">
        <div className='mb-2'>  <Clock size={19} className="h-1 w-1 mr-2 ihub-web-avg"/></div>
         <div className="ihub-web-kpiValue primary">186s</div>
         <div className="ihub-web-kpiLabel ihub-web-avg">Avg Session</div>
       </div>
       <div className="ihub-web-kpi-page">
       <div className='mb-2'>  <FileText size={19} className="h-1 w-1 mr-2 ihub-web-page"/></div>
         <div className="ihub-web-kpiValue ihub-web-page">0</div>
         <div className="ihub-web-kpiLabel ihub-web-page">Pages/Session</div>
       </div>
       <div className="ihub-web-kpi-return">
       <div className='mb-2'>  <Users size={19} className="h-1 w-1 mr-2 ihub-web-return"/></div>
         <div className="ihub-web-kpiValue ihub-web-return">0%</div>
         <div className="ihub-web-kpiLabel ihub-web-return">Return Rate</div>
       </div>
       <div className="ihub-web-kpi-active">
       <div className='mb-2'>  <TrendingUp size={19} className="h-1 w-1 mr-2 ihub-web-active"/></div>
         <div className="ihub-web-kpiValue ihub-web-active">0</div>
         <div className="ihub-web-kpiLabel ihub-web-active">Active Pages</div>
       </div>
     </div>
      <div className="ihub-web-card ihub-web-panel">
   <div className="ihub-web-tabs">
     {/* <button className="ihub-web-tab active">Top Pages</button>
     <button className="ihub-web-tab">Downloads</button>
     <button className="ihub-web-tab">Search Terms</button>
     <button className="ihub-web-tab">CTAs</button>
     <button className="ihub-web-tab">Journey</button> */}
{tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`ihub-web-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
            >
              {tab}
            </button>
          ))}

   </div>

   {/* <div className="ihub-web-panelBody empty">
    
   </div> */}
 </div>
   </div>
 );
   }