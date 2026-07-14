import React, { useState } from "react";

import "./IntelligenceCss/CompetitiveAlertDashboard.css";
const sampleAlert={
 id:"ALT-2026-001",
 version:"v1.0",
 detectedAt:"13 Jul 2026 08:15 AM",
 eventType:"New Indication Approval",
 competitor:"Pfizer",
 product:"DrugX",
 authority:"FDA",
 authorityDate:"12 Jul 2026",
 indication:"Metastatic Breast Cancer",
 markets:"US, Canada",
 description:"FDA approved a new indication for DrugX in metastatic breast cancer. The approval expands the eligible patient population.",
 aiAssessment:"Competitor DrugX now has an approved indication in an area where own brand currently has limited approved claims. This may affect HCP perception in this patient population.",
 predictedGapTypes:["Claims Gap","Messaging Gap","Audience Gap"],
 actions:["Review positioning","Assess content impact","Monitor HCP response"]
};
export default function CompetitiveAlertDashboard(){
 const [ack,setAck]=useState(false);
 return (<div className="cad-page">
 <header className="cad-hero"><h1>Competitive Alert — New Entrant & Regulatory Event Detection</h1><span className="cad-sla">HIGH PRIORITY • 4-Hour SLA</span></header>
 <section className="cad-banner">
 <div className="cad-top-row"><span className="cad-badge cad-regulatory">REGULATORY ALERT</span><span>Version {sampleAlert.version}</span></div>
 <h2>{sampleAlert.eventType}</h2>
 <p>{sampleAlert.description}</p>
 <div className="cad-grid">
 <div><b>Competitor</b><p>{sampleAlert.competitor}</p></div>
 <div><b>Product</b><p>{sampleAlert.product}</p></div>
 <div><b>Authority</b><p>{sampleAlert.authority}</p></div>
 <div><b>Published Date</b><p>{sampleAlert.authorityDate}</p></div>
 <div><b>Indication</b><p>{sampleAlert.indication}</p></div>
 <div><b>Affected Markets</b><p>{sampleAlert.markets}</p></div>
 </div>
 <div className="cad-assessment"><h3>AI Assessment — Not Confirmed</h3><p>{sampleAlert.aiAssessment}</p></div>
 <div className="cad-prediction"><h3>Predicted Gap Types — Pending Confirmation</h3>{sampleAlert.predictedGapTypes.map(g=><span key={g} className="cad-chip">{g}</span>)}</div>
 <div className="cad-rerun">Gap Analysis Re-Run Status: <span className="cad-pending">Pending</span></div>
 <div className="cad-suggestions"><h3>Suggested Immediate Actions</h3><ul>{sampleAlert.actions.map(a=><li key={a}>{a}</li>)}</ul></div>
 <div className="cad-buttons">
 <button onClick={()=>setAck(true)}>Acknowledge & Monitor</button>
 <button>Convert to Urgent Content Opportunity</button>
 <button>Escalate to Medical/Regulatory Affairs</button>
 </div>
 {ack && <div className="cad-audit">Acknowledged by Brand Manager • Timestamp Logged to Audit Trail</div>}
 </section>
 <section className="cad-notification-card">
 <h3>Notification Delivery</h3>
 <p>In-Platform Notification: Sent</p><p>Email Notification: Sent</p>
 </section>
 <section className="cad-audit-panel">
 <h3>Audit & Version History</h3>
 <table><thead><tr><th>Action</th><th>User</th><th>Timestamp</th></tr></thead><tbody><tr><td>Alert Created</td><td>System</td><td>13 Jul 2026 08:15 AM</td></tr></tbody></table>
 </section>
 </div>)}
