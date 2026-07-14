// import { useState } from "react";
// import { RefreshCw } from "lucide-react";
// import "./IntelligenceCss/CompetitiveIntelligence.css";
// import { API_BASE, callConnectorAPI } from "../api/competitiveIntelligenceApi";

// /* ─────────────────────────────────────────────────────────
//    Backend integration (URLs, auth, fetch logic) lives in
//    src/api/competitiveIntelligenceApi.js — this component only
//    sends a connector_id and renders the response.
// ───────────────────────────────────────────────────────── */

// /* ─────────────────────────────────────────────────────────
//    CONNECTOR DATA  (display metadata only — no URLs, no keys)
// ───────────────────────────────────────────────────────── */
// const SOURCE_GROUPS = [
//   {
//     id: "regulatory",
//     label: "Regulatory Filings",
//     icon: "ti-building-bank",
//     shortCode: "REG",
//     desc: "Structured records of competitor drug approvals, label changes, and new indications from FDA, EMA, and other regulatory authorities.",
//     note: { type: "teal", text: "Shared with Regulatory Monitoring (Layer 4) — single ingestion pipeline, no duplication." },
//     connectors: [
//       { id: "openfda-approvals", name: "OpenFDA API — Drug Approvals",        icon: "ti-certificate",    iconColor: "ico-teal",   status: "Active",    lastIngested: "17 Jun 2026, 05:00 UTC" },
//       { id: "openfda-labels",    name: "OpenFDA API — Drug Labels",            icon: "ti-file-description", iconColor: "ico-teal", status: "Active",    lastIngested: "17 Jun 2026, 05:04 UTC" },
//       { id: "ema-epar",          name: "EMA EPAR (European Medicines Agency)", icon: "ti-world",          iconColor: "ico-blue",   status: "Disabled",  lastIngested: "Never" },
//       { id: "dailymed",          name: "DailyMed API (NLM)",                   icon: "ti-pill",           iconColor: "ico-blue",   status: "Active",    lastIngested: "17 Jun 2026, 05:22 UTC" },
//       { id: "fda-orangebook",    name: "FDA Orange Book",                      icon: "ti-book",           iconColor: "ico-amber",  status: "Active",    lastIngested: "15 Jun 2026, 08:00 UTC" },
//     ],
//   },
//   {
//     id: "congress",
//     label: "Congress Publications",
//     icon: "ti-microscope",
//     shortCode: "CON",
//     desc: "Competitor clinical trial results, new efficacy data, and patient population findings from medical congresses and peer-reviewed journals.",
//     note: null,
//     connectors: [
//       { id: "clinicaltrials", name: "ClinicalTrials.gov API v2",         icon: "ti-test-pipe",        iconColor: "ico-blue",   status: "Active",    lastIngested: "16 Jun 2026, 23:30 UTC" },
//       { id: "pubmed",         name: "PubMed API (NCBI E-utilities)",     icon: "ti-dna",              iconColor: "ico-teal",   status: "Active",    lastIngested: "17 Jun 2026, 04:45 UTC" },
//       { id: "europepmc",      name: "Europe PMC API",                    icon: "ti-books",            iconColor: "ico-purple", status: "Active",    lastIngested: "17 Jun 2026, 03:50 UTC" },
//       { id: "asco",           name: "ASCO Abstracts (Oncology)",         icon: "ti-stethoscope",      iconColor: "ico-blue",   status: "Active",    lastIngested: "02 Jun 2026, 12:00 UTC" },
//       { id: "ada",            name: "ADA Abstracts (Diabetes)",          icon: "ti-heart-rate-monitor", iconColor: "ico-teal", status: "Active",    lastIngested: "22 May 2026, 10:00 UTC" },
//       { id: "esc",            name: "ESC Abstracts (Cardiology)",        icon: "ti-heart",            iconColor: "ico-amber",  status: "Disabled",  lastIngested: "Never" },
//       { id: "ash",            name: "ASH Abstracts (Haematology)",       icon: "ti-drop",             iconColor: "ico-purple", status: "Disabled",  lastIngested: "Never" },
//     ],
//   },
//   {
//     id: "social",
//     label: "Social & Web Listening",
//     icon: "ti-world",
//     shortCode: "SWL",
//     desc: "Competitor website text, ad copy, press releases, and promotional page content — the public-facing narrative layer.",
//     note: null,
//     connectors: [
//       { id: "brandwatch", name: "Brandwatch API",                          icon: "ti-brand-twitter", iconColor: "ico-blue",   status: "Active",   lastIngested: "17 Jun 2026, 06:14 UTC", enterprise: true },
//       { id: "sprinklr",   name: "Sprinklr API (alternative)",              icon: "ti-broadcast",     iconColor: "ico-purple", status: "Disabled", lastIngested: "Never",                  enterprise: true },
//       { id: "crawl",      name: "Competitor Brand Websites (direct crawl)", icon: "ti-spider",       iconColor: "ico-amber",  status: "Active",   lastIngested: "17 Jun 2026, 06:00 UTC" },
//     ],
//   },
//   {
//     id: "adIntel",
//     label: "Ad Intelligence",
//     icon: "ti-speakerphone",
//     shortCode: "ADI",
//     desc: "Records of competitor ads observed in market — creative text, channels (digital, print, TV, HCP), and impression frequency. Observed activity only.",
//     note: { type: "amber", text: "This source does NOT provide budget or spend figures. Observed ad activity only. Never state or imply competitor spend amounts." },
//     connectors: [
//       { id: "pathmatics",  name: "Pathmatics API (Sensor Tower)",   icon: "ti-ad",              iconColor: "ico-amber",  status: "Active",   lastIngested: "17 Jun 2026, 06:00 UTC", enterprise: true },
//       { id: "sensortower", name: "Sensor Tower API (alternative)",  icon: "ti-device-analytics", iconColor: "ico-purple", status: "Disabled", lastIngested: "Never",                  enterprise: true },
//     ],
//   },
// ];

// /* ─────────────────────────────────────────────────────────
//    COMPONENTS
// ───────────────────────────────────────────────────────── */

// /* Sanju changes - 29th June 2026 — format any date / ISO string in India
//    Standard Time (Asia/Kolkata). Called with no argument to stamp "now". */
// function formatIST(value) {
//   const d = value ? new Date(value) : new Date();
//   return d.toLocaleString("en-IN", {
//     timeZone: "Asia/Kolkata",
//     day: "2-digit", month: "short", year: "numeric",
//     hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
//   }) + " IST";
// }

// function StatusPill({ status, fetching }) {
//   if (fetching) {
//     return <span className="sp spf"><span className="spd2" />Fetching…</span>;
//   }
//   const cls = { Active: "spa", Error: "spe", Disabled: "spd" };
//   return <span className={`sp ${cls[status] || "spd"}`}><span className="spd2" />{status}</span>;
// }

// /* ─────────────────────────────────────────────────────────
//    PAYLOAD → TABLE
//    Each connector returns a different raw_payload shape
//    (OpenFDA results[], ClinicalTrials studies[], PubMed idlist,
//    html_scrape preview, …). These helpers turn any of them into
//    a readable table with proper column names — no raw JSON.
// ───────────────────────────────────────────────────────── */
// const MAX_COLS  = 12;
// const CELL_CHARS = 160;

// /* Curated columns per connector. `key` is a flattened path (see flatten());
//    an array of paths picks the first non-empty value. Connectors not listed
//    here fall back to auto-detected columns. */
// const COLUMN_MAP = {
//   "openfda-approvals": [
//     { key: "application_number",                              label: "Application No." },
//     { key: "sponsor_name",                                   label: "Sponsor" },
//     { key: ["products.brand_name", "openfda.brand_name"],    label: "Brand" },
//     { key: "products.dosage_form",                           label: "Dosage Form" },
//     { key: "products.route",                                 label: "Route" },
//     { key: "products.marketing_status",                      label: "Marketing Status" },
//   ],
//   "fda-orangebook": [
//     { key: "application_number",                              label: "Application No." },
//     { key: "sponsor_name",                                   label: "Sponsor" },
//     { key: ["products.brand_name", "openfda.brand_name"],    label: "Brand" },
//     { key: "products.dosage_form",                           label: "Dosage Form" },
//     { key: "products.marketing_status",                      label: "Marketing Status" },
//   ],
//   "openfda-labels": [
//     { key: "openfda.brand_name",         label: "Brand" },
//     { key: "openfda.generic_name",       label: "Generic Name" },
//     { key: "openfda.manufacturer_name",  label: "Manufacturer" },
//     { key: "effective_date",             label: "Effective Date" },
//   ],
//   "dailymed": [
//     { key: "title",          label: "Title" },
//     { key: "setid",          label: "Set ID" },
//     { key: "published_date", label: "Published" },
//     { key: "spl_version",    label: "SPL Version" },
//   ],
//   "clinicaltrials": [
//     { key: "protocolSection.identificationModule.nctId",      label: "NCT ID" },
//     { key: "protocolSection.identificationModule.briefTitle", label: "Title" },
//     { key: "protocolSection.statusModule.overallStatus",      label: "Status" },
//     { key: "protocolSection.conditionsModule.conditions",     label: "Conditions" },
//     { key: "protocolSection.designModule.phases",             label: "Phase" },
//   ],
//   "europepmc": [
//     { key: "pmid",                                       label: "PMID" },
//     { key: "title",                                      label: "Title" },
//     { key: "authorString",                               label: "Authors" },
//     { key: ["journalInfo.journal.title", "journalTitle"],label: "Journal" },
//     { key: "pubYear",                                    label: "Year" },
//   ],
//   "brandwatch": [
//     { key: "title",     label: "Title" },
//     { key: "date",      label: "Date" },
//     { key: "sentiment", label: "Sentiment" },
//     { key: "url",       label: "URL" },
//   ],
//   "pathmatics": [
//     { key: "creative_text", label: "Creative" },
//     { key: "channel",       label: "Channel" },
//     { key: "advertiser",    label: "Advertiser" },
//     { key: "first_seen",    label: "First Seen" },
//     { key: "last_seen",     label: "Last Seen" },
//   ],
// };

// // First non-empty value for a curated column def (`key` may be a fallback list).
// function pickVal(row, key) {
//   const keys = Array.isArray(key) ? key : [key];
//   for (const k of keys) {
//     const v = row[k];
//     if (v !== undefined && v !== null && String(v) !== "") return v;
//   }
//   return "";
// }

// // Pull the main array of records out of a heterogeneous payload.
// function extractRecords(payload) {
//   if (Array.isArray(payload)) return payload;
//   if (!payload || typeof payload !== "object") return null;
//   const candidates = [
//     payload.results,
//     payload.studies,
//     payload.data,
//     payload.ads,
//     payload.resultList && payload.resultList.result,
//     payload.esearchresult && payload.esearchresult.idlist,
//   ];
//   for (const c of candidates) if (Array.isArray(c) && c.length) return c;
//   return null;
// }

// // Flatten one record into { "a.b.c": primitive } columns.
// function flatten(value, prefix, out, depth) {
//   if (depth > 3) { out[prefix] = JSON.stringify(value).slice(0, CELL_CHARS); return; }
//   if (value === null || value === undefined) { if (prefix) out[prefix] = ""; return; }
//   if (Array.isArray(value)) {
//     if (!value.length) { out[prefix] = ""; return; }
//     if (value.every(v => typeof v !== "object" || v === null)) out[prefix] = value.join(", ");
//     else flatten(value[0], prefix, out, depth + 1);   // surface first item's fields
//     return;
//   }
//   if (typeof value === "object") {
//     for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
//     return;
//   }
//   out[prefix || "value"] = value;
// }

// // "products.brand_name" → "Products › Brand Name"
// function humanize(key) {
//   return key
//     .split(".")
//     .map(seg =>
//       seg.replace(/_/g, " ")
//          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
//          .replace(/\b\w/g, c => c.toUpperCase()))
//     .join(" › ");
// }

// function cell(v) {
//   const s = v === null || v === undefined ? "" : String(v);
//   return s.length > CELL_CHARS ? s.slice(0, CELL_CHARS) + "…" : s;
// }

// function PayloadTable({ payload, connectorId }) {
//   const records = extractRecords(payload);

//   // ── Case 1: a list of records → multi-column table ──
//   if (records && records.length) {
//     const allPrimitive = records.every(r => typeof r !== "object" || r === null);
//     if (allPrimitive) {
//       const primLabel = connectorId === "pubmed" ? "PMID" : "Value";
//       return (
//         <div className="pl-scroll">
//           <table className="pl-table mt-3">
//             <thead><tr><th className="pl-idx">#</th><th>{primLabel}</th></tr></thead>
//             <tbody>
//               {records.map((r, i) => (
//                 <tr key={i}><td className="pl-idx">{i + 1}</td><td>{cell(r)}</td></tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       );
//     }

//     const rows = records.map(r => { const o = {}; flatten(r, "", o, 0); return o; });

//     // Curated columns for known connectors; otherwise auto-detect.
//     const curated = COLUMN_MAP[connectorId];
//     let defs, hidden = 0;
//     if (curated) {
//       defs = curated;
//     } else {
//       const cols = [];
//       rows.forEach(o => Object.keys(o).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
//       const shown = cols.slice(0, MAX_COLS);
//       hidden = cols.length - shown.length;
//       defs = shown.map(k => ({ key: k, label: humanize(k) }));
//     }

//     return (
//       <>
//         <div className="pl-scroll">
//           <table className="pl-table">
//             <thead>
//               <tr>
//                 <th className="pl-idx">#</th>
//                 {defs.map(d => <th key={d.label}>{d.label}</th>)}
//               </tr>
//             </thead>
//             <tbody>
//               {rows.map((o, i) => (
//                 <tr key={i}>
//                   <td className="pl-idx">{i + 1}</td>
//                   {defs.map(d => {
//                     const v = pickVal(o, d.key);
//                     return <td key={d.label} title={v != null ? String(v) : ""}>{cell(v)}</td>;
//                   })}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         {hidden > 0 && (
//           <div className="pl-note">+{hidden} more field(s) hidden</div>
//         )}
//       </>
//     );
//   }

//   // ── Case 2: a single object → Field / Value table ──
//   if (payload && typeof payload === "object") {
//     const o = {}; flatten(payload, "", o, 0);
//     const entries = Object.entries(o);
//     if (entries.length) {
//       return (
//         <div className="pl-scroll">
//           <table className="pl-table pl-kv">
//             <thead><tr><th>Field</th><th>Value</th></tr></thead>
//             <tbody>
//               {entries.map(([k, v]) => (
//                 <tr key={k}>
//                   <td className="pl-key">{humanize(k)}</td>
//                   <td title={v != null ? String(v) : ""}>{cell(v)}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       );
//     }
//   }

//   // ── Case 3: nothing tabular ──
//   return <div className="pl-empty">No tabular data in this response.</div>;
// }

// function FetchDrawer({ data, loading, error, onClose }) {
//   return (
//     <div className="fetch-drawer">
//       {loading && (
//         <div className="fd-loading">
//           <div className="fd-spinner" />
//           Calling backend API and fetching latest data…
//         </div>
//       )}
//       {error && (
//         <div className="fd-error">
//           <i className="ti ti-alert-circle" style={{ fontSize: 14, flexShrink: 0 }} />
//           <div>
//             <span className="fd-error-title">Backend error</span>
//             <span className="fd-error-msg">{error}</span>
//           </div>
//           <button className="fd-close" onClick={onClose}>✕</button>
//         </div>
//       )}
//       {data && !loading && (
//         <>
//           <div className="fd-header">
//             <span className="fd-title">
//               <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
//               Response from backend API
//             </span>
//             <button className="fd-close" onClick={onClose}>✕</button>
//           </div>
//           <div className="fd-meta-grid">
//             <div className="fd-meta-item">
//               <div className="fd-meta-label">Records</div>
//               <div className="fd-meta-value">{(data.records ?? 0).toLocaleString()}</div>
//             </div>
//             <div className="fd-meta-item">
//               <div className="fd-meta-label">Response time</div>
//               <div className="fd-meta-value">{data.response_time_ms}ms</div>
//             </div>
//             <div className="fd-meta-item">
//               <div className="fd-meta-label">Status</div>
//               <div className="fd-meta-value" style={{ textTransform: "capitalize" }}>{data.status}</div>
//             </div>
//             <div className="fd-meta-item">
//               <div className="fd-meta-label">Fetched at</div>
//               <div className="fd-meta-value" style={{ fontSize: 11 }}>{formatIST(data.fetched_at)}</div>{/* Sanju changes - 29th June 2026 — IST */}
//             </div>
//           </div>
//           <div className="fd-meta-item" style={{ marginBottom: 8 }}>
//             <div className="fd-meta-label">Latest record</div>
//             <div className="fd-meta-value" style={{ fontSize: 12, lineHeight: 1.5 }}>{data.latest_record}</div>
//           </div>
//           <div className="fd-payload">
//             <div className="fd-payload-label">
//               <i className="ti ti-table" style={{ fontSize: 12 }} /> Records from external source
//             </div>
//             <PayloadTable payload={data.raw_payload} connectorId={data.connector_id} />
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// function ConnectorRow({ connector }) {
//   const [open,      setOpen]      = useState(false);
//   const [loading,   setLoading]   = useState(false);
//   const [result,    setResult]    = useState(null);
//   const [apiError,  setApiError]  = useState(null);
//   const [spinning,  setSpinning]  = useState(false);
//   // Sanju changes - 29th June 2026 — per-connector refresh stamp (IST)
//   const [lastRefreshed, setLastRefreshed] = useState(null);  // IST stamp, updated on each refresh click
//   // Connectors display as Disabled by default; only after the user hits play
//   // and data comes back do they flip to Active (Error connectors stay Error).
//   const [localStatus, setLocalStatus] = useState(
//     connector.status === "Active" ? "Disabled" : connector.status
//   );

//   const rowClass = localStatus === "Error"    ? "cr-row--error"
//                  : localStatus === "Disabled" ? "cr-row--disabled"
//                  : loading                         ? "cr-row--fetching"
//                  : "";

//   async function handleFetch(e) {
//     e?.stopPropagation();
//     // Toggle drawer closed if already open with result
//     if (open && result && !loading) { setOpen(false); setResult(null); setApiError(null); return; }

//   // mark disabled immediately when user clicks, then set active/error after fetch
//   setLocalStatus("Disabled");
//   setOpen(true);
//   setLoading(true);
//     setResult(null);
//     setApiError(null);

//     try {
//       const data = await callConnectorAPI(connector.id);
//       setResult(data);
//       setLocalStatus("Active");
//     } catch (err) {
//       setApiError(err.message);
//       setLocalStatus("Error");
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleRefresh(e) {
//     e.stopPropagation();
//     // Spin the refresh icon while it re-checks the source, then settle.
//     setSpinning(true);
//     // Sanju changes - 29th June 2026 — stamp the moment of this refresh (IST).
//     setLastRefreshed(formatIST());
//     setTimeout(() => setSpinning(false), 1000);
//   }

//   function handleClose() { setOpen(false); setResult(null); setApiError(null); }

//   return (
//     <>
//       <div
//         className={`connector-row ${rowClass}`}
//         onClick={handleFetch}
//         title="Click to fetch via backend API"
//       >
//         {/* Centre — name + last ingested only */}
//         <div className="cr-center">
//           <div className="cr-name">
//             {connector.name}
//             {connector.enterprise && <span className="badge b-enterprise">Enterprise</span>}
//           </div>
//           {connector.status === "Error" && (
//             <div className="cr-error-strip" onClick={e => e.stopPropagation()}>
//               <i className="ti ti-alert-triangle" style={{ fontSize: 12, color: "var(--red)", flexShrink: 0 }} />
//               <div>
//                 <span className="cr-err-type">{connector.errorType}</span>
//                 <span className="cr-err-since">First detected: {connector.errorSince}</span>
//               </div>
//             </div>
//           )}
//           {/* Sanju changes - 29th June 2026 — refresh stamp (IST) */}
//           {lastRefreshed && (
//             <div className="cr-refreshed">Last refreshed: {lastRefreshed}</div>
//           )}
//         </div>

//         {/* Right — status pill + play (fetch) + refresh */}
//         <div className="cr-right" onClick={e => e.stopPropagation()}>
//           <StatusPill status={localStatus} fetching={loading} />
//           <button
//             className={`cr-action-btn play ${loading ? "loading" : ""}`}
//             title={`POST /api/connector/fetch  { connector_id: "${connector.id}" }`}
//             onClick={handleFetch}
//           >
//             <i className={`ti ${loading ? "ti-loader-2" : "ti-player-play"}`}
//               style={loading ? { animation: "spin .7s linear infinite" } : {}} />
//           </button>
//           <button
//             className={`cr-action-btn refresh ${spinning ? "spinning" : ""}`}
//             title="Refresh ingestion timestamp"
//             onClick={handleRefresh}
//           >
//             <RefreshCw size={15} strokeWidth={2} className={spinning ? "cr-spin" : ""} />
//           </button>
//         </div>
//       </div>

//       {open && (
//         <FetchDrawer
//           data={result}
//           loading={loading}
//           error={apiError}
//           onClose={handleClose}
//         />
//       )}
//     </>
//   );
// }

// function SourceGroupCard({ group }) {
//   const [open, setOpen] = useState(false);
//   const activeCount = group.connectors.filter(c => c.status === "Active").length;
//   const errorCount  = group.connectors.filter(c => c.status === "Error").length;
//   const iconCol = { regulatory: "var(--teal)", congress: "var(--blue-mid)", social: "var(--purple)", adIntel: "var(--amber)" };

//   return (
//     <div className="sgc">
//       {/* <div className="sgc-hdr" onClick={() => setOpen(o => !o)} style={{ cursor: "pointer" }}> */}
//       <div className="sgc-hdr">
//         <div className="sgc-left">
//           <div className="sgc-title-row">
//             <i className={`ti ${group.icon}`} style={{ fontSize: 19, color: iconCol[group.id] }} />
//             <span className="sgc-title">{group.label}</span>
//           </div>
//           {!open && <div style={{ fontSize: 12, color: "var(--gray4)", marginTop: 6 }}>{group.connectors.length} connectors</div>}
//         </div>
//         <div className="sgc-right">
//           {/* <span className="count-tag">{activeCount} active</span> */}
//           {errorCount > 0 && <span className="err-tag">{errorCount} ERROR</span>}
//           {/* <span className={`sgc-toggle ${open ? "open" : ""}`} aria-hidden="true">
//             <i className="ti ti-chevron-down" />
//           </span> */}
//           <span
//   className="sgc-toggle"
//   onClick={(e) => {
//     e.stopPropagation();
//     setOpen(o => !o);
//   }}
// >
  
// <span style={{ fontSize: "15px", fontWeight: "bold" }}>
//   {open ? "▲" : "▼"}
// </span>

// </span>
//         </div>
//       </div>

//       {/* {group.note && (
//         <div className={`info-strip info-strip--${group.note.type}`}>
//           <i className={`ti ${group.note.type === "amber" ? "ti-alert-circle" : "ti-info-circle"}`}
//             style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }} />
//           {group.note.text}
//         </div>
//       )} */}

//       {open && group.connectors.map(c => <ConnectorRow key={c.id} connector={c} />)}
//     </div>
//   );
// }

// function CoverageBar({ groups }) {
//   const errGroups = groups.filter(g => g.connectors.some(c => c.status === "Error"));
//   const ok = errGroups.length === 0;
//   return (
//     <div className={`coverage-bar ${ok ? "coverage-bar--ok" : "coverage-bar--warn"}`}>
//       <div className="coverage-bar__left">
//         <span className="cov-dot" />
//         <span className="cov-label">
//           {ok
//             ? "All four intelligence source types operational — full competitive coverage active."
//             : `Coverage gap: ${errGroups.map(g => g.label).join(", ")} has connector errors.`}
//         </span>
//       </div>
//       <div className="coverage-pills">
//         {groups.map(g => {
//           const s = g.connectors.some(c => c.status === "Error") ? "err"
//                   : g.connectors.some(c => c.status === "Active") ? "ok" : "dis";
//           return <span key={g.id} className={`cpill cpill--${s}`} title={g.label}>{g.shortCode}</span>;
//         })}
//       </div>
//     </div>
//   );
// }

// function ScopeModal({ onClose, onSubmit }) {
//   const [desc, setDesc] = useState("");
//   const [done, setDone] = useState(false);
//   function submit() {
//     if (!desc.trim()) return;
//     setDone(true);
//     setTimeout(() => { onSubmit(desc); onClose(); }, 1500);
//   }
//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal" onClick={e => e.stopPropagation()}>
//         <div className="modal__header">
//           <h3 className="modal__title">Request Scope Change</h3>
//           <button className="modal__close" onClick={onClose}>✕</button>
//         </div>
//         {!done ? (
//           <>
//             <p className="modal__desc">Request changes to competitive intelligence coverage — adding a competitor, updating keyword sets, or expanding geographic scope. Routed to CTS Platform Admin.</p>
//             <div className="modal__field">
//               <label className="modal__label">Description of requested change</label>
//               <textarea className="modal__textarea" rows={5}
//                 placeholder="e.g. Add Competitor X to Social & Web Listening…"
//                 value={desc} onChange={e => setDesc(e.target.value)} />
//             </div>
//             <div className="modal__meta"><span className="modal__label">Requestor</span><span className="modal__meta-val">Global Brand Manager</span></div>
//             <div className="modal__meta"><span className="modal__label">Timestamp</span><span className="modal__meta-val">{formatIST()}</span></div>{/* Sanju changes - 29th June 2026 — IST */}
//             <div className="modal__actions">
//               <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
//               <button className={`btn btn--primary ${!desc.trim() ? "btn--disabled" : ""}`}
//                 onClick={submit} disabled={!desc.trim()}>Submit Request</button>
//             </div>
//           </>
//         ) : (
//           <div className="modal__success">
//             <span className="modal__success-icon">✓</span>
//             <p>Request logged and routed to CTS Platform Admin.</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ─────────────────────────────────────────────────────────
//    APP ROOT
// ───────────────────────────────────────────────────────── */
// export default function CompetitiveIntelligence() {
//   const [activeId,  setActiveId]  = useState(null);
//   const [showModal, setShowModal] = useState(false);
//   const [requests,  setRequests]  = useState([]);

//   const visible = activeId ? SOURCE_GROUPS.filter(g => g.id === activeId) : SOURCE_GROUPS;

//   return (
//     <div className="ci-root">
//       <header className="ci-topbar">
//         <div className="tb-brand">
//           <span className="tb-title">Competitive Intelligence</span>
//           {/* <span className="tb-divider" />
//           <span className="tb-sub">Source & Connector Status</span> */}
//         </div>
//         <div className="tb-right">
//           {/* <span className="role-pill">
//             <i className="ti ti-lock" style={{ fontSize: 11 }} />
//             Global Brand Manager · Read-Only
//           </span> */}
//           <button className="btn btn--outline" onClick={() => setShowModal(true)}>
//             <i className="ti ti-plus" style={{ fontSize: 13 }} /> Request Scope Change
//           </button>
//         </div>
//       </header>

//       {/* <div className="ci-coverage-wrap">
//         <CoverageBar groups={SOURCE_GROUPS} />
//       </div> */}

//       <div className="ci-body">
//         {/* <aside className="ci-sidebar">
//           <p className="s-heading">Source Types</p>
//           <div className={`nav-item ${!activeId ? "active" : ""}`} onClick={() => setActiveId(null)}>
//             <span className="nav-icon"><i className="ti ti-layout-grid" /></span>
//             <div className="nav-text">
//               <span className="nav-label">All Sources</span>
//               <span className="nav-sub">{SOURCE_GROUPS.reduce((a, g) => a + g.connectors.length, 0)} connectors</span>
//             </div>
//           </div>
//           {SOURCE_GROUPS.map(g => {
//             const ec = g.connectors.filter(c => c.status === "Error").length;
//             const ac = g.connectors.filter(c => c.status === "Active").length;
//             return (
//               <div key={g.id} className={`nav-item ${activeId === g.id ? "active" : ""}`} onClick={() => setActiveId(g.id)}>
//                 <span className="nav-icon"><i className={`ti ${g.icon}`} /></span>
//                 <div className="nav-text">
//                   <span className="nav-label">{g.label}</span>
//                   <span className="nav-sub">{ac} active · {g.connectors.length} total</span>
//                 </div>
//                 {ec > 0 && <span className="nav-errbadge">{ec}</span>}
//               </div>
//             );
//           })}
//           {requests.length > 0 && (
//             <>
//               <p className="s-heading" style={{ marginTop: "1.5rem" }}>Pending Requests</p>
//               {requests.map(r => (
//                 <div key={r.id} className="pending-req">
//                   <span className="pending-dot" />
//                   <span className="pending-text">{r.desc.slice(0, 64)}{r.desc.length > 64 ? "…" : ""}</span>
//                 </div>
//               ))}
//             </>
//           )}
//         </aside> */}

//         <main className="ci-main">
//           {/* <div className="page-heading">
//             <h1>Competitive Intelligence</h1>
//           </div> */}
//           {visible.map(g => <SourceGroupCard key={g.id} group={g} />)}
//         </main>
//       </div>

//       {showModal && (
//         <ScopeModal
//           onClose={() => setShowModal(false)}
//           onSubmit={desc => setRequests(p => [...p, { id: Date.now(), desc }])}
//         />
//       )}
//     </div>
//   );
// }

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import CompetitorInventory from "./CompetitorInventory";
import "./IntelligenceCss/CompetitiveIntelligence.css";
import { API_BASE, callConnectorAPI } from "../api/competitiveIntelligenceApi";
import ClaimsComparison from "./ClaimsComparison";
import CompetitiveManageGaps from "./CompetitiveManageGaps";
import CompetitiveAlertDashboard from "./CompetitiveAlertDashboard";

/* ─────────────────────────────────────────────────────────
   Backend integration (URLs, auth, fetch logic) lives in
   src/api/competitiveIntelligenceApi.js — this component only
   sends a connector_id and renders the response.
───────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────
   CONNECTOR DATA  (display metadata only — no URLs, no keys)
───────────────────────────────────────────────────────── */
const SOURCE_GROUPS = [
  {
    id: "regulatory",
    label: "Regulatory Filings",
    icon: "ti-building-bank",
    shortCode: "REG",
    desc: "Structured records of competitor drug approvals, label changes, and new indications from FDA, EMA, and other regulatory authorities.",
    note: { type: "teal", text: "Shared with Regulatory Monitoring (Layer 4) — single ingestion pipeline, no duplication." },
    connectors: [
      { id: "openfda-approvals", name: "OpenFDA API — Drug Approvals",        icon: "ti-certificate",    iconColor: "ico-teal",   status: "Active",    lastIngested: "17 Jun 2026, 05:00 UTC" },
      { id: "openfda-labels",    name: "OpenFDA API — Drug Labels",            icon: "ti-file-description", iconColor: "ico-teal", status: "Active",    lastIngested: "17 Jun 2026, 05:04 UTC" },
      { id: "ema-epar",          name: "EMA EPAR (European Medicines Agency)", icon: "ti-world",          iconColor: "ico-blue",   status: "Disabled",  lastIngested: "Never" },
      { id: "dailymed",          name: "DailyMed API (NLM)",                   icon: "ti-pill",           iconColor: "ico-blue",   status: "Active",    lastIngested: "17 Jun 2026, 05:22 UTC" },
      { id: "fda-orangebook",    name: "FDA Orange Book",                      icon: "ti-book",           iconColor: "ico-amber",  status: "Active",    lastIngested: "15 Jun 2026, 08:00 UTC" },
    ],
  },
  {
    id: "congress",
    label: "Congress Publications",
    icon: "ti-microscope",
    shortCode: "CON",
    desc: "Competitor clinical trial results, new efficacy data, and patient population findings from medical congresses and peer-reviewed journals.",
    note: null,
    connectors: [
      { id: "clinicaltrials", name: "ClinicalTrials.gov API v2",         icon: "ti-test-pipe",        iconColor: "ico-blue",   status: "Active",    lastIngested: "16 Jun 2026, 23:30 UTC" },
      { id: "pubmed",         name: "PubMed API (NCBI E-utilities)",     icon: "ti-dna",              iconColor: "ico-teal",   status: "Active",    lastIngested: "17 Jun 2026, 04:45 UTC" },
      { id: "europepmc",      name: "Europe PMC API",                    icon: "ti-books",            iconColor: "ico-purple", status: "Active",    lastIngested: "17 Jun 2026, 03:50 UTC" },
      { id: "asco",           name: "ASCO Abstracts (Oncology)",         icon: "ti-stethoscope",      iconColor: "ico-blue",   status: "Active",    lastIngested: "02 Jun 2026, 12:00 UTC" },
      { id: "ada",            name: "ADA Abstracts (Diabetes)",          icon: "ti-heart-rate-monitor", iconColor: "ico-teal", status: "Active",    lastIngested: "22 May 2026, 10:00 UTC" },
      { id: "esc",            name: "ESC Abstracts (Cardiology)",        icon: "ti-heart",            iconColor: "ico-amber",  status: "Disabled",  lastIngested: "Never" },
      { id: "ash",            name: "ASH Abstracts (Haematology)",       icon: "ti-drop",             iconColor: "ico-purple", status: "Disabled",  lastIngested: "Never" },
    ],
  },
  {
    id: "social",
    label: "Social & Web Listening",
    icon: "ti-world",
    shortCode: "SWL",
    desc: "Competitor website text, ad copy, press releases, and promotional page content — the public-facing narrative layer.",
    note: null,
    connectors: [
      { id: "brandwatch", name: "Brandwatch API",                          icon: "ti-brand-twitter", iconColor: "ico-blue",   status: "Active",   lastIngested: "17 Jun 2026, 06:14 UTC", enterprise: true },
      { id: "sprinklr",   name: "Sprinklr API (alternative)",              icon: "ti-broadcast",     iconColor: "ico-purple", status: "Disabled", lastIngested: "Never",                  enterprise: true },
      { id: "crawl",      name: "Competitor Brand Websites (direct crawl)", icon: "ti-spider",       iconColor: "ico-amber",  status: "Active",   lastIngested: "17 Jun 2026, 06:00 UTC" },
    ],
  },
  {
    id: "adIntel",
    label: "Ad Intelligence",
    icon: "ti-speakerphone",
    shortCode: "ADI",
    desc: "Records of competitor ads observed in market — creative text, channels (digital, print, TV, HCP), and impression frequency. Observed activity only.",
    note: { type: "amber", text: "This source does NOT provide budget or spend figures. Observed ad activity only. Never state or imply competitor spend amounts." },
    connectors: [
      { id: "pathmatics",  name: "Pathmatics API (Sensor Tower)",   icon: "ti-ad",              iconColor: "ico-amber",  status: "Active",   lastIngested: "17 Jun 2026, 06:00 UTC", enterprise: true },
      { id: "sensortower", name: "Sensor Tower API (alternative)",  icon: "ti-device-analytics", iconColor: "ico-purple", status: "Disabled", lastIngested: "Never",                  enterprise: true },
    ],
  },
];

/* ─────────────────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────────────────── */

/* Sanju changes - 29th June 2026 — format any date / ISO string in India
   Standard Time (Asia/Kolkata). Called with no argument to stamp "now". */
function formatIST(value) {
  const d = value ? new Date(value) : new Date();
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }) + " IST";
}

function StatusPill({ status, fetching }) {
  if (fetching) {
    return <span className="sp spf"><span className="spd2" />Fetching…</span>;
  }
  const cls = { Active: "spa", Error: "spe", Disabled: "spd" };
  return <span className={`sp ${cls[status] || "spd"}`}><span className="spd2" />{status}</span>;
}

/* ─────────────────────────────────────────────────────────
   PAYLOAD → TABLE
   Each connector returns a different raw_payload shape
   (OpenFDA results[], ClinicalTrials studies[], PubMed idlist,
   html_scrape preview, …). These helpers turn any of them into
   a readable table with proper column names — no raw JSON.
───────────────────────────────────────────────────────── */
const MAX_COLS  = 12;
const CELL_CHARS = 160;

/* Curated columns per connector. `key` is a flattened path (see flatten());
   an array of paths picks the first non-empty value. Connectors not listed
   here fall back to auto-detected columns. */
const COLUMN_MAP = {
  "openfda-approvals": [
    { key: "application_number",                              label: "Application No." },
    { key: "sponsor_name",                                   label: "Sponsor" },
    { key: ["products.brand_name", "openfda.brand_name"],    label: "Brand" },
    { key: "products.dosage_form",                           label: "Dosage Form" },
    { key: "products.route",                                 label: "Route" },
    { key: "products.marketing_status",                      label: "Marketing Status" },
  ],
  "fda-orangebook": [
    { key: "application_number",                              label: "Application No." },
    { key: "sponsor_name",                                   label: "Sponsor" },
    { key: ["products.brand_name", "openfda.brand_name"],    label: "Brand" },
    { key: "products.dosage_form",                           label: "Dosage Form" },
    { key: "products.marketing_status",                      label: "Marketing Status" },
  ],
  "openfda-labels": [
    { key: "openfda.brand_name",         label: "Brand" },
    { key: "openfda.generic_name",       label: "Generic Name" },
    { key: "openfda.manufacturer_name",  label: "Manufacturer" },
    { key: "effective_date",             label: "Effective Date" },
  ],
  "dailymed": [
    { key: "title",          label: "Title" },
    { key: "setid",          label: "Set ID" },
    { key: "published_date", label: "Published" },
    { key: "spl_version",    label: "SPL Version" },
  ],
  "clinicaltrials": [
    { key: "protocolSection.identificationModule.nctId",      label: "NCT ID" },
    { key: "protocolSection.identificationModule.briefTitle", label: "Title" },
    { key: "protocolSection.statusModule.overallStatus",      label: "Status" },
    { key: "protocolSection.conditionsModule.conditions",     label: "Conditions" },
    { key: "protocolSection.designModule.phases",             label: "Phase" },
  ],
  "europepmc": [
    { key: "pmid",                                       label: "PMID" },
    { key: "title",                                      label: "Title" },
    { key: "authorString",                               label: "Authors" },
    { key: ["journalInfo.journal.title", "journalTitle"],label: "Journal" },
    { key: "pubYear",                                    label: "Year" },
  ],
  "brandwatch": [
    { key: "title",     label: "Title" },
    { key: "date",      label: "Date" },
    { key: "sentiment", label: "Sentiment" },
    { key: "url",       label: "URL" },
  ],
  "pathmatics": [
    { key: "creative_text", label: "Creative" },
    { key: "channel",       label: "Channel" },
    { key: "advertiser",    label: "Advertiser" },
    { key: "first_seen",    label: "First Seen" },
    { key: "last_seen",     label: "Last Seen" },
  ],
};

// First non-empty value for a curated column def (`key` may be a fallback list).
function pickVal(row, key) {
  const keys = Array.isArray(key) ? key : [key];
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v) !== "") return v;
  }
  return "";
}

// Pull the main array of records out of a heterogeneous payload.
function extractRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.results,
    payload.studies,
    payload.data,
    payload.ads,
    payload.resultList && payload.resultList.result,
    payload.esearchresult && payload.esearchresult.idlist,
  ];
  for (const c of candidates) if (Array.isArray(c) && c.length) return c;
  return null;
}

// Flatten one record into { "a.b.c": primitive } columns.
function flatten(value, prefix, out, depth) {
  if (depth > 3) { out[prefix] = JSON.stringify(value).slice(0, CELL_CHARS); return; }
  if (value === null || value === undefined) { if (prefix) out[prefix] = ""; return; }
  if (Array.isArray(value)) {
    if (!value.length) { out[prefix] = ""; return; }
    if (value.every(v => typeof v !== "object" || v === null)) out[prefix] = value.join(", ");
    else flatten(value[0], prefix, out, depth + 1);   // surface first item's fields
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
    return;
  }
  out[prefix || "value"] = value;
}

// "products.brand_name" → "Products › Brand Name"
function humanize(key) {
  return key
    .split(".")
    .map(seg =>
      seg.replace(/_/g, " ")
         .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
         .replace(/\b\w/g, c => c.toUpperCase()))
    .join(" › ");
}

function cell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return s.length > CELL_CHARS ? s.slice(0, CELL_CHARS) + "…" : s;
}

function PayloadTable({ payload, connectorId }) {
  const records = extractRecords(payload);

  // ── Case 1: a list of records → multi-column table ──
  if (records && records.length) {
    const allPrimitive = records.every(r => typeof r !== "object" || r === null);
    if (allPrimitive) {
      const primLabel = connectorId === "pubmed" ? "PMID" : "Value";
      return (
        <div className="pl-scroll">
          <table className="pl-table mt-3">
            <thead><tr><th className="pl-idx">#</th><th>{primLabel}</th></tr></thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}><td className="pl-idx">{i + 1}</td><td>{cell(r)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const rows = records.map(r => { const o = {}; flatten(r, "", o, 0); return o; });

    // Curated columns for known connectors; otherwise auto-detect.
    const curated = COLUMN_MAP[connectorId];
    let defs, hidden = 0;
    if (curated) {
      defs = curated;
    } else {
      const cols = [];
      rows.forEach(o => Object.keys(o).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
      const shown = cols.slice(0, MAX_COLS);
      hidden = cols.length - shown.length;
      defs = shown.map(k => ({ key: k, label: humanize(k) }));
    }

    return (
      <>
        <div className="pl-scroll">
          <table className="pl-table">
            <thead>
              <tr>
                <th className="pl-idx">#</th>
                {defs.map(d => <th key={d.label}>{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((o, i) => (
                <tr key={i}>
                  <td className="pl-idx">{i + 1}</td>
                  {defs.map(d => {
                    const v = pickVal(o, d.key);
                    return <td key={d.label} title={v != null ? String(v) : ""}>{cell(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hidden > 0 && (
          <div className="pl-note">+{hidden} more field(s) hidden</div>
        )}
      </>
    );
  }

  // ── Case 2: a single object → Field / Value table ──
  if (payload && typeof payload === "object") {
    const o = {}; flatten(payload, "", o, 0);
    const entries = Object.entries(o);
    if (entries.length) {
      return (
        <div className="pl-scroll">
          <table className="pl-table pl-kv">
            <thead><tr><th>Field</th><th>Value</th></tr></thead>
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k}>
                  <td className="pl-key">{humanize(k)}</td>
                  <td title={v != null ? String(v) : ""}>{cell(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  // ── Case 3: nothing tabular ──
  return <div className="pl-empty">No tabular data in this response.</div>;
}

function FetchDrawer({ data, loading, error, onClose }) {
  return (
    <div className="fetch-drawer">
      {loading && (
        <div className="fd-loading">
          <div className="fd-spinner" />
          Calling backend API and fetching latest data…
        </div>
      )}
      {error && (
        <div className="fd-error">
          <i className="ti ti-alert-circle" style={{ fontSize: 14, flexShrink: 0 }} />
          <div>
            <span className="fd-error-title">Backend error</span>
            <span className="fd-error-msg">{error}</span>
          </div>
          <button className="fd-close" onClick={onClose}>✕</button>
        </div>
      )}
      {data && !loading && (
        <>
          <div className="fd-header">
            <span className="fd-title">
              <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
              Response from backend API
            </span>
            <button className="fd-close" onClick={onClose}>✕</button>
          </div>
          <div className="fd-meta-grid">
            <div className="fd-meta-item">
              <div className="fd-meta-label">Records</div>
              <div className="fd-meta-value">{(data.records ?? 0).toLocaleString()}</div>
            </div>
            <div className="fd-meta-item">
              <div className="fd-meta-label">Response time</div>
              <div className="fd-meta-value">{data.response_time_ms}ms</div>
            </div>
            <div className="fd-meta-item">
              <div className="fd-meta-label">Status</div>
              <div className="fd-meta-value" style={{ textTransform: "capitalize" }}>{data.status}</div>
            </div>
            <div className="fd-meta-item">
              <div className="fd-meta-label">Fetched at</div>
              <div className="fd-meta-value" style={{ fontSize: 11 }}>{formatIST(data.fetched_at)}</div>{/* Sanju changes - 29th June 2026 — IST */}
            </div>
          </div>
          <div className="fd-meta-item" style={{ marginBottom: 8 }}>
            <div className="fd-meta-label">Latest record</div>
            <div className="fd-meta-value" style={{ fontSize: 12, lineHeight: 1.5 }}>{data.latest_record}</div>
          </div>
          <div className="fd-payload">
            <div className="fd-payload-label">
              <i className="ti ti-table" style={{ fontSize: 12 }} /> Records from external source
            </div>
            <PayloadTable payload={data.raw_payload} connectorId={data.connector_id} />
          </div>
        </>
      )}
    </div>
  );
}

function ConnectorRow({ connector }) {
  const [open,      setOpen]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [apiError,  setApiError]  = useState(null);
  const [spinning,  setSpinning]  = useState(false);
  // Sanju changes - 29th June 2026 — per-connector refresh stamp (IST)
  const [lastRefreshed, setLastRefreshed] = useState(null);  // IST stamp, updated on each refresh click
  // Connectors display as Disabled by default; only after the user hits play
  // and data comes back do they flip to Active (Error connectors stay Error).
  const [localStatus, setLocalStatus] = useState(
    connector.status === "Active" ? "Disabled" : connector.status
  );

  const rowClass = localStatus === "Error"    ? "cr-row--error"
                 : localStatus === "Disabled" ? "cr-row--disabled"
                 : loading                         ? "cr-row--fetching"
                 : "";

  async function handleFetch(e) {
    e?.stopPropagation();
    // Toggle drawer closed if already open with result
    if (open && result && !loading) { setOpen(false); setResult(null); setApiError(null); return; }

  // mark disabled immediately when user clicks, then set active/error after fetch
  setLocalStatus("Disabled");
  setOpen(true);
  setLoading(true);
    setResult(null);
    setApiError(null);

    try {
      const data = await callConnectorAPI(connector.id);
      setResult(data);
      setLocalStatus("Active");
    } catch (err) {
      setApiError(err.message);
      setLocalStatus("Error");
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh(e) {
    e.stopPropagation();
    // Spin the refresh icon while it re-checks the source, then settle.
    setSpinning(true);
    // Sanju changes - 29th June 2026 — stamp the moment of this refresh (IST).
    setLastRefreshed(formatIST());
    setTimeout(() => setSpinning(false), 1000);
  }

  function handleClose() { setOpen(false); setResult(null); setApiError(null); }

  return (
    <>
      <div
        className={`connector-row ${rowClass}`}
        onClick={handleFetch}
        title="Click to fetch via backend API"
      >
        {/* Centre — name + last ingested only */}
        <div className="cr-center">
          <div className="cr-name">
            {connector.name}
            {connector.enterprise && <span className="badge b-enterprise">Enterprise</span>}
          </div>
          {localStatus === "Error" && (
            <div className="cr-error-strip" onClick={e => e.stopPropagation()}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 12, color: "var(--red)", flexShrink: 0 }} />
              <div>
                <span className="cr-err-type">{apiError || connector.errorType || "Connector error"}</span>
                <span className="cr-err-since">First detected: {connector.errorSince}</span>
              </div>
            </div>
          )}
          {/* Sanju changes - 29th June 2026 — refresh stamp (IST) */}
          {lastRefreshed && (
            <div className="cr-refreshed">Last refreshed: {lastRefreshed}</div>
          )}
        </div>

        {/* Right — status pill + play (fetch) + refresh */}
        <div className="cr-right" onClick={e => e.stopPropagation()}>
          <StatusPill status={localStatus} fetching={loading} />
          <button
            className={`cr-action-btn play ${loading ? "loading" : ""}`}
            title={`POST /api/connector/fetch  { connector_id: "${connector.id}" }`}
            onClick={handleFetch}
          >
            <i className={`ti ${loading ? "ti-loader-2" : "ti-player-play"}`}
              style={loading ? { animation: "spin .7s linear infinite" } : {}} />
          </button>
          <button
            className={`cr-action-btn refresh ${spinning ? "spinning" : ""}`}
            title="Refresh ingestion timestamp"
            onClick={handleRefresh}
          >
            <RefreshCw size={15} strokeWidth={2} className={spinning ? "cr-spin" : ""} />
          </button>
        </div>
      </div>

      {open && (
        <FetchDrawer
          data={result}
          loading={loading}
          error={apiError}
          onClose={handleClose}
        />
      )}
    </>
  );
}

function SourceGroupCard({ group }) {
  const [open, setOpen] = useState(false);
  const activeCount = group.connectors.filter(c => c.status === "Active").length;
  const errorCount  = group.connectors.filter(c => c.status === "Error").length;
  const iconCol = { regulatory: "var(--teal)", congress: "var(--blue-mid)", social: "var(--purple)", adIntel: "var(--amber)" };

  return (
    <div className="sgc">
      {/* <div className="sgc-hdr" onClick={() => setOpen(o => !o)} style={{ cursor: "pointer" }}> */}
      <div className="sgc-hdr">
        <div className="sgc-left">
          <div className="sgc-title-row">
            <i className={`ti ${group.icon}`} style={{ fontSize: 19, color: iconCol[group.id] }} />
            <span className="sgc-title">{group.label}</span>
          </div>
          {!open && <div style={{ fontSize: 12, color: "var(--gray4)", marginTop: 6 }}>{group.connectors.length} connectors</div>}
        </div>
        <div className="sgc-right">
          {/* <span className="count-tag">{activeCount} active</span> */}
          {errorCount > 0 && <span className="err-tag">{errorCount} ERROR</span>}
          {/* <span className={`sgc-toggle ${open ? "open" : ""}`} aria-hidden="true">
            <i className="ti ti-chevron-down" />
          </span> */}
          <span
            className="sgc-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(o => !o);
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: "bold" }}>
              {open ? "▲" : "▼"}
            </span>
          </span>
        </div>
      </div>

      {/* {group.note && (
        <div className={`info-strip info-strip--${group.note.type}`}>
          <i className={`ti ${group.note.type === "amber" ? "ti-alert-circle" : "ti-info-circle"}`}
            style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }} />
          {group.note.text}
        </div>
      )} */}

      {open && group.connectors.map(c => <ConnectorRow key={c.id} connector={c} />)}
    </div>
  );
}

function CoverageBar({ groups }) {
  const errGroups = groups.filter(g => g.connectors.some(c => c.status === "Error"));
  const ok = errGroups.length === 0;
  return (
    <div className={`coverage-bar ${ok ? "coverage-bar--ok" : "coverage-bar--warn"}`}>
      <div className="coverage-bar__left">
        <span className="cov-dot" />
        <span className="cov-label">
          {ok
            ? "All four intelligence source types operational — full competitive coverage active."
            : `Coverage gap: ${errGroups.map(g => g.label).join(", ")} has connector errors.`}
        </span>
      </div>
      <div className="coverage-pills">
        {groups.map(g => {
          const s = g.connectors.some(c => c.status === "Error") ? "err"
                  : g.connectors.some(c => c.status === "Active") ? "ok" : "dis";
          return <span key={g.id} className={`cpill cpill--${s}`} title={g.label}>{g.shortCode}</span>;
        })}
      </div>
    </div>
  );
}

function ScopeModal({ onClose, onSubmit }) {
  const [desc, setDesc] = useState("");
  const [done, setDone] = useState(false);
  function submit() {
    if (!desc.trim()) return;
    setDone(true);
    setTimeout(() => { onSubmit(desc); onClose(); }, 1500);
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Request Scope Change</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        {!done ? (
          <>
            <p className="modal__desc">Request changes to competitive intelligence coverage — adding a competitor, updating keyword sets, or expanding geographic scope. Routed to CTS Platform Admin.</p>
            <div className="modal__field">
              <label className="modal__label">Description of requested change</label>
              <textarea className="modal__textarea" rows={5}
                placeholder="e.g. Add Competitor X to Social & Web Listening…"
                value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div className="modal__meta"><span className="modal__label">Requestor</span><span className="modal__meta-val">Global Brand Manager</span></div>
            <div className="modal__meta"><span className="modal__label">Timestamp</span><span className="modal__meta-val">{formatIST()}</span></div>{/* Sanju changes - 29th June 2026 — IST */}
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
              <button className={`btn btn--primary ${!desc.trim() ? "btn--disabled" : ""}`}
                onClick={submit} disabled={!desc.trim()}>Submit Request</button>
            </div>
          </>
        ) : (
          <div className="modal__success">
            <span className="modal__success-icon">✓</span>
            <p>Request logged and routed to CTS Platform Admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   APP ROOT
───────────────────────────────────────────────────────── */
export default function CompetitiveIntelligence() {
  const [activeId,  setActiveId]  = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [requests,  setRequests]  = useState([]);

  const visible = activeId ? SOURCE_GROUPS.filter(g => g.id === activeId) : SOURCE_GROUPS;

  return (
    <div className="ci-root">
      <header className="ci-topbar">
        <div className="tb-brand">
          <span className="tb-title">Competitive Intelligence</span>
          {/* <span className="tb-divider" />
          <span className="tb-sub">Source & Connector Status</span> */}
        </div>
        <div className="tb-right">
          {/* <span className="role-pill">
            <i className="ti ti-lock" style={{ fontSize: 11 }} />
            Global Brand Manager · Read-Only
          </span> */}
          <button className="btn btn--outline" onClick={() => setShowModal(true)}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} /> Request Scope Change
          </button>
        </div>
      </header>

      {/* <div className="ci-coverage-wrap">
        <CoverageBar groups={SOURCE_GROUPS} />
      </div> */}

      <div className="ci-body">
        {/* <aside className="ci-sidebar">
          <p className="s-heading">Source Types</p>
          <div className={`nav-item ${!activeId ? "active" : ""}`} onClick={() => setActiveId(null)}>
            <span className="nav-icon"><i className="ti ti-layout-grid" /></span>
            <div className="nav-text">
              <span className="nav-label">All Sources</span>
              <span className="nav-sub">{SOURCE_GROUPS.reduce((a, g) => a + g.connectors.length, 0)} connectors</span>
            </div>
          </div>
          {SOURCE_GROUPS.map(g => {
            const ec = g.connectors.filter(c => c.status === "Error").length;
            const ac = g.connectors.filter(c => c.status === "Active").length;
            return (
              <div key={g.id} className={`nav-item ${activeId === g.id ? "active" : ""}`} onClick={() => setActiveId(g.id)}>
                <span className="nav-icon"><i className={`ti ${g.icon}`} /></span>
                <div className="nav-text">
                  <span className="nav-label">{g.label}</span>
                  <span className="nav-sub">{ac} active · {g.connectors.length} total</span>
                </div>
                {ec > 0 && <span className="nav-errbadge">{ec}</span>}
              </div>
            );
          })}
          {requests.length > 0 && (
            <>
              <p className="s-heading" style={{ marginTop: "1.5rem" }}>Pending Requests</p>
              {requests.map(r => (
                <div key={r.id} className="pending-req">
                  <span className="pending-dot" />
                  <span className="pending-text">{r.desc.slice(0, 64)}{r.desc.length > 64 ? "…" : ""}</span>
                </div>
              ))}
            </>
          )}
        </aside> */}

        <main className="ci-main">
          {/* <div className="page-heading">
            <h1>Competitive Intelligence</h1>
          </div> */}
          {visible.map(g => <SourceGroupCard key={g.id} group={g} />)}

          {/* Competitor Claims Inventory (US 2.2) rendered below the source cards */}
          <CompetitorInventory />
          <ClaimsComparison/>
          <CompetitiveManageGaps />
          <CompetitiveAlertDashboard />
        </main>
      </div>

      {showModal && (
        <ScopeModal
          onClose={() => setShowModal(false)}
          onSubmit={desc => setRequests(p => [...p, { id: Date.now(), desc }])}
        />
      )}
    </div>
  );
}