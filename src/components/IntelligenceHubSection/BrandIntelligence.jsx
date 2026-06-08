// Author: Abhirup Nandi — 2026-05-20
// Summary: New file — Brand Intelligence Connectors + Ingested Documents card with Add-connector modal, file-upload picker, auto-refresh loop, default-Disabled state machine, Veeva API integration. See inline "Added/Modified by Abhirup Nandi" markers for function-level changes.
// Modified by Abhirup Nandi — 2026-05-20 (later): mapVeevaToDoc no longer hardcodes contentType to "claims". The mapper reads asset_type / contentType / type / status from the Veeva payload and only uses the themed Claims pill when Veeva itself flags the doc as a claim. Other Veeva categories (Email Template, Material, Multichannel Presentation, Multichannel Slide, etc.) pass through verbatim and render via the existing unknown-type fallback in the documents list.

import { useState, useEffect, useRef } from "react";
import {
  Plug2,
  Database,
  Folder,
  Upload,
  Plus,
  Pause,
  Play,
  RotateCcw,
  X,
  FileText,
  FileCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
   Search, Filter,
} from "lucide-react";
// Added by Abhirup Nandi - 2026-05-20: import Veeva data-service to wire the Veeva connector to the real API (same source used by ImportContentPage.jsx).
// Added by Abhirup Nandi - 2026-05-25: import Claims data-service to wire the Claims connector to the get_claims API.
import { getveevaData, getClaimsData } from "../api/dataService";
// Lightweight /status fetch for the top sticky status bar. Reuses the
// shared intelligenceHubApi client so auth headers + error interceptors
// are consistent across the page.
import { getProfileStatus } from "../api/intelligenceHubApi";
// Added by Abhirup Nandi — 2026-05-25: BrandIntelligenceContext now renders
// inside the Ingested Documents card as one continuous card (its outer
// section/card wrappers were removed in BrandIntelligenceContext.jsx).
import BrandIntelligenceContext from "./BrandIntelligenceContext";
// Added by Abhirup Nandi — 2026-05-25: BrandIntelligenceProfile is the
// AI-extracted draft profile review panel — mounted as the third section
// inside the same card (no own card frame).
import BrandIntelligenceProfile from "./BrandIntelligenceProfile";
// US 1.4 — activation, version control, filtered insights. BR-SIH-002 gate.
import BrandIntelligenceActivation from "./BrandIntelligenceActivation";
// Added by Sanju Kumari — 2026-06-01
// US 1.5 — incremental refresh, change detection, 90-day expiry. BR-SIH-001 gate.
// Modified by Sanju Kumari — 2026-06-01: swapped <BrandIntelligenceRefresh />
// for <BrandIncrementalProfile />, which renders the same US 1.5 section with
// the new design.
import BrandIncrementalProfile from "./BrandIncrementalProfile";
// Cross-section UX shells — kept lightweight (no deps) so they can drop
// into the existing layout without touching the per-section components.
// BrandIntelligenceStatusBar import removed — sticky bar was overlapping
// the section title. Re-add when we find a non-colliding layout slot.
// import BrandIntelligenceStatusBar from "./BrandIntelligenceStatusBar";
import { ToastProvider } from "./Toast";
import "./IntelligenceCss/BrandIntelligence.css";

/**
 * Brand Intelligence Connectors.
 *
 * Shows source systems feeding Brand Intelligence (claims libraries, brand
 * guidelines, approved content, reference docs). Edit + run-cycle interactions
 * are local-state only; ready to be wired to a backend later.
 */

// Status cycle order — clicking the run button advances to the next entry.
const STATUS_CYCLE = ["Active", "Disabled", "Error"];

// Format a Date as "May 19, 2026 · 08:14 AM".
function formatTimestamp(date) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const m = months[date.getMonth()];
  const d = date.getDate();
  const y = date.getFullYear();
  let h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${m} ${d}, ${y} · ${String(h).padStart(2, "0")}:${min} ${ampm}`;
}

// Content-type catalogue per the AC: claims, guidelines, approved content, reference.
// Modified by Abhirup Nandi — 2026-05-20: added three Veeva-specific types.
const CONTENT_TYPES = {
  claims:             { label: "Claims",            cls: "bic-doc-pill-claims"            },
  guidelines:         { label: "Brand guidelines",  cls: "bic-doc-pill-guidelines"        },
  approved:           { label: "Approved content",  cls: "bic-doc-pill-approved"          },
  reference:          { label: "Reference",         cls: "bic-doc-pill-reference"         },
  material:           { label: "Material",          cls: "bic-doc-pill-material"          },
  email_template:     { label: "Email template",    cls: "bic-doc-pill-email-template"    },
  multichannel_slide: { label: "Multichannel slide",cls: "bic-doc-pill-multichannel-slide"},
};

// Modified by Abhirup Nandi — 2026-05-20
// Normalise a raw contentType string (which may be a Veeva API value like
// "Multichannel Slide") to the key used in CONTENT_TYPES and the filter
// dropdown (e.g. "multichannel_slide").
// This bridges the gap between mapVeevaToDoc (which stores the raw Veeva
// string verbatim) and the filter/pill lookup (which uses underscore keys).
function normaliseContentType(raw) {
  if (!raw) return "reference";
  const lower = raw.toLowerCase().trim().replace(/\s+/g, "_");
  // If it already matches a key, return as-is.
  if (CONTENT_TYPES[lower]) return lower;
  // Fallback map for common Veeva strings that need special handling.
  const FALLBACK = {
    "multichannel_presentation": "multichannel_slide",
    "multichannel_content":      "multichannel_slide",
  };
  return FALLBACK[lower] ?? (CONTENT_TYPES[lower] ? lower : lower);
}

// Default: every connector starts Disabled with no prior ingest. Status is
// event-driven from here on:
//   - flips to Active when a document successfully arrives
//   - flips to Error when an ingestion attempt fails validation
//   - reverts to Disabled after IDLE_REVERT_MS of no fresh content
function buildInitialConnectors() {
  return [
    {
      id: "veeva",
      name: "Veeva Vault — approved documents",
      type: "veeva",
      lastIngested: null,
      status: "Disabled",
    },
    // Added by Abhirup Nandi - 2026-05-25: Claims library connector — fetches
    // from the get_claims endpoint via getClaimsData(). Mirrors the Veeva
    // connector wiring; uses its own fetching/in-flight state.
    {
      id: "claims",
      name: "Veeva Vault Claims Library",
      type: "claims",
      lastIngested: null,
      status: "Disabled",
    },
    {
      id: "sharepoint",
      name: "SharePoint / DAM / Brand Portal",
      type: "sharepoint",
      lastIngested: null,
      status: "Disabled",
    },
    {
      id: "manual",
      name: "Manual document upload",
      type: "manual",
      lastIngested: null,
      status: "Disabled",
    },
  ];
}

// No hardcoded documents — the list is populated only by real ingestion.
// Manual uploads are the one user-facing entry point right now; in production,
// Veeva / SharePoint connectors would push docs in here on auto-refresh.
function buildInitialDocuments() {
  return [];
}

// Auto-refresh tunables.
// Modified by Abhirup Nandi — 2026-05-20 (later): AUTO_REFRESH_INTERVAL_MS
// and TICK_INTERVAL_MS removed alongside the auto-refresh interval — refresh
// is manual only now (button click), so no poll cadence and no tick re-render needed.
const SPIN_MIN_MS              = 500;     // floor on the spin animation so it's perceptible
const IDLE_REVERT_MS           = 3 * 60 * 1000;  // connectors revert Disabled after 3 min of no new content
const IDLE_CHECK_INTERVAL_MS   = 15_000;  // how often we sweep for idle connectors

/**
 * Validate an uploaded File looks plausibly real.
 * For now: must have a non-empty name and at least one byte.
 * Returning false here flips the Manual connector to Error and skips the doc.
 */
function isUploadedFileValid(file) {
  if (!file) return false;
  if (typeof file.name !== "string" || file.name.trim() === "") return false;
  if (typeof file.size === "number" && file.size <= 0) return false;
  return true;
}

// Manual-upload text extraction. Match by MIME and extension because the
// Windows file picker often leaves MIME blank for .md/.yaml/etc.
const PLAIN_TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "log",
  "html", "htm", "xml", "yaml", "yml", "rtf",
]);

function fileExtension(file) {
  const name = (file?.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : "";
}

function isPlainText(file) {
  const mime = (file?.type || "").toLowerCase();
  if (mime.startsWith("text/")) return true;
  if (mime === "application/json" || mime === "application/xml") return true;
  return PLAIN_TEXT_EXTENSIONS.has(fileExtension(file));
}

// Plain-text reader. Returns "" for binary files — those go through
// readFileAsBase64 instead so the backend can extract text server-side
// (PyMuPDF / python-docx) rather than relying on heavy browser parsers.
function readFileAsText(file) {
  if (!isPlainText(file)) return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => {
      console.warn("[BrandIntelligence] readFileAsText failed for", file?.name, reader.error);
      resolve("");
    };
    reader.readAsText(file);
  });
}

// Read raw bytes as base64 for binary uploads (PDF / DOCX / …). The backend
// decodes them and runs PyMuPDF / python-docx server-side to extract real
// text into the LLM prompt. Returns "" for plain-text files where
// readFileAsText already covers the payload.
function readFileAsBase64(file) {
  if (!file || isPlainText(file)) return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      // readAsDataURL returns "data:<mime>;base64,<payload>" — strip the
      // header so the backend gets a clean base64 string.
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => {
      console.warn("[BrandIntelligence] readFileAsBase64 failed for", file?.name, reader.error);
      resolve("");
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validate a doc object produced by the backend (or any other source).
 * Real ingestion payload needs at minimum: id, name, sourceId.
 */
function isFetchedDocValid(d) {
  if (!d || typeof d !== "object") return false;
  if (!d.id || typeof d.id !== "string") return false;
  if (!d.name || typeof d.name !== "string") return false;
  if (!d.sourceId || typeof d.sourceId !== "string") return false;
  return true;
}

/**
 * Added by Abhirup Nandi - 2026-05-20
 * Map a Veeva API item → our document model.
 * Mirrors `mapVeevaItem` in ImportContentPage.jsx, but emits the shape this
 * panel consumes: { id, name, contentType, sourceId, lastRefresh }.
 *
 * Modified by Abhirup Nandi — 2026-05-20 (later): contentType is no longer
 * hardcoded to "claims". The Veeva API returns documents of many types
 * (Email Template, Material, Multichannel Presentation, Multichannel Slide…)
 * — we now read the real asset_type / contentType / type field and only fall
 * back to our themed "claims" key when Veeva itself flags the doc as a claim
 * in either its type or status. Everything else passes through verbatim so
 * the user sees the actual Veeva category in the pill.
 */
function mapVeevaToDoc(item, now) {
  const rawId = item?.document_id ?? item?.documentId;
  const id = rawId
    ? String(rawId)
    : `doc-veeva-${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`;
  const name = item?.file_name ?? item?.name ?? "(Untitled)";

  // Read the document type and status from the Veeva payload. Field names
  // vary by API version — try each in priority order, same as ImportContentPage.
  const rawType   = String(item?.asset_type ?? item?.contentType ?? item?.type ?? "").trim();
  const rawStatus = String(item?.status ?? item?.status_v ?? "").trim();

  // Use the themed "claims" key only when Veeva explicitly tags the doc as a
  // claim (in type or status). Everything else keeps its real Veeva type, so
  // "Email Template", "Material", etc. show through in the pill instead of
  // being collapsed into the generic Claims label. The render fallback at the
  // documents list handles unknown content-type keys gracefully.
  const isClaim = /claim/i.test(rawType) || /claim/i.test(rawStatus);
  const contentType = isClaim ? "claims" : (rawType || "reference");

  return {
    id,
    name,
    contentType,
    sourceId: "veeva",
    lastRefresh: now,
  };
}

/**
 * Added by Abhirup Nandi - 2026-05-25
 * Map a Claims API item → our document model. Parallel to mapVeevaToDoc.
 *
 * Real get_claims response shape (per Postman sample, 2026-05-25):
 *   { claim_id, name, lifecycle_state, product, country, match_text, references }
 *
 * `name` is a short code like "CL-000001"; `match_text` is the actual claim
 * sentence. We display `match_text` as the document title since that's the
 * human-readable content, and keep the short code as a parenthetical prefix
 * for quick scanning. Falls back gracefully if either field is missing.
 */
function mapClaimToDoc(item, now) {
  const rawId =
    item?.claim_id ??
    item?.id ??
    item?.document_id ??
    item?.documentId;
  const id = rawId
    ? String(rawId)
    : `doc-claims-${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`;

  const code = item?.name ?? item?.code ?? "";
  const text =
    item?.match_text ??
    item?.claim_text ??
    item?.claim ??
    item?.title ??
    item?.file_name ??
    "";

  let name;
  if (code && text)      name = `${code} — ${text}`;
  else if (text)         name = text;
  else if (code)         name = code;
  else                   name = "(Untitled claim)";

  return {
    id,
    name: String(name),
    contentType: "claims",
    sourceId: "claims",
    lastRefresh: now,
  };
}

/**
 * Stub: fetch newly-ingested documents from the active connectors.
 *
 * In production this would hit the backend (one call per Active connector or a
 * single aggregated endpoint) and return the delta since `since`. Returns []
 * for now — no fake data — so the auto-refresh loop is fully wired but adds
 * nothing visible until a real ingestion source is connected. Manual uploads
 * bypass this path (they push directly into `documents` via the file picker).
 */
async function fetchNewDocuments(/* since: Date */) {
  return [];
}

// Modified by Abhirup Nandi — 2026-05-20 (later): formatRelative removed —
// only the now-deleted "Auto-refreshed · Xs ago" badge label used it. The
// new plain Refresh button shows a static label.

function ConnectorIcon({ type }) {
  if (type === "veeva")      return <Database  className="bic-row-icon" strokeWidth={2} />;
  if (type === "claims")     return <FileCheck className="bic-row-icon" strokeWidth={2} />;
  if (type === "sharepoint") return <Folder    className="bic-row-icon" strokeWidth={2} />;
  if (type === "manual")     return <Upload    className="bic-row-icon" strokeWidth={2} />;
  return null;
}

// Lucide icon for the status pill — inherits the pill's text color via currentColor.
function StatusIcon({ status }) {
  if (status === "Active") return <CheckCircle2 size={12} strokeWidth={2.5} className="bic-status-icon" />;
  if (status === "Error")  return <AlertCircle  size={12} strokeWidth={2.5} className="bic-status-icon" />;
  return <MinusCircle size={12} strokeWidth={2.5} className="bic-status-icon" />;
}

function StatusPill({ status }) {
  const cls =
    status === "Active"   ? "bic-status-pill bic-status-active"   :
    status === "Error"    ? "bic-status-pill bic-status-error"    :
                            "bic-status-pill bic-status-disabled";
  return (
    <span className={cls}>
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

// Pick the right icon for the run button given the current status and connector type.
// Non-manual connectors cycle Active → Disabled → Error → Active.
// Manual connector swaps the Play/Retry icon for an Upload icon — the action is
// "pick files from your computer", not "trigger ingestion".
function RunIcon({ status, type }) {
  if (status === "Active") return <Pause size={14} strokeWidth={2} />;
  if (type === "manual")   return <Upload size={14} strokeWidth={2} />;
  if (status === "Disabled") return <Play size={14} strokeWidth={2} />;
  return <RotateCcw size={14} strokeWidth={2} />;
}
function runTooltip(status, type) {
  if (status === "Active") return "Deactivate connector (Active → Disabled)";
  if (type === "manual")   return "Upload documents…";
  if (status === "Disabled") return "Flag connector (Disabled → Error)";
  return "Activate connector (Error → Active)";
}

// Source types offered when adding a new connector.
const SOURCE_TYPES = [
  { value: "veeva",      label: "Veeva Vault",                     Icon: Database  },
  { value: "claims",     label: "Veeva Vault Claims Library",      Icon: FileCheck },
  { value: "sharepoint", label: "SharePoint / DAM / Brand Portal", Icon: Folder    },
  { value: "manual",     label: "Manual document upload",          Icon: Upload    },
];

export default function BrandIntelligence() {
  const [connectors, setConnectors] = useState(buildInitialConnectors);
  // Ingested-documents list — read-only from the user's perspective for the
  // Veeva / SharePoint connectors (auto-refreshed), and populated by file picks
  // for the Manual upload connector.
  const [documents, setDocuments] = useState(buildInitialDocuments);
  // Added by Sanju Kumari — 2026-05-29: profile_id of the draft currently
  // loaded inside <BrandIntelligenceProfile />. Lifted up so the sibling
  // <BrandIntelligenceActivation /> can call POST /profile/{id}/activate.
  const [activeProfileId, setActiveProfileId] = useState(null);

  // Status fetched once when the active profile changes. Drives the top
  // sticky status bar so the user always sees their current state without
  // scrolling back to the activation panel. Best-effort — failure leaves
  // the bar in a benign "—" state instead of breaking the page.
  const [profileStatus, setProfileStatus] = useState(null);
  useEffect(() => {
    if (!activeProfileId) {
      setProfileStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getProfileStatus(activeProfileId);
        if (!cancelled) setProfileStatus(res?.data || res || null);
      } catch (_) {
        if (!cancelled) setProfileStatus(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeProfileId]);

  // Hidden file input — clicked by the Manual connector's run button.
  const fileInputRef = useRef(null);

  // Added by Abhirup Nandi — 2026-05-25
  // Tracks the last connector that successfully ingested documents. Used by
  // filteredDocuments so docs stay visible even after the connector flips
  // back to Disabled (via the idle-revert sweep or a manual deactivate).
  const [lastActiveConnectorId, setLastActiveConnectorId] = useState(null);

  // Added by Abhirup Nandi - 2026-05-20
  // Veeva fetch state — true while a getveevaData() call is in flight.
  // Used to disable the run button + spin its icon, mirroring the
  // `veevaLoading` flag used in ImportContentPage.jsx.
  const [veevaFetching, setVeevaFetching] = useState(false);
  // Per-connector record of which button triggered the in-flight fetch
  // ("run" vs "refresh"). Lets us spin only the clicked button — the other
  // one stays static so the UI doesn't look like both actions are running.
  // Keyed by connector id. Cleared when the fetch resolves.
  const [clickedAction, setClickedAction] = useState({});

  // Added by Abhirup Nandi - 2026-05-25
  // Claims fetch state — true while a getClaimsData() call is in flight.
  // Parallel to veevaFetching; drives the spin/disabled state on the
  // Claims connector's run button.
  const [claimsFetching, setClaimsFetching] = useState(false);

  // Inline-edit state for connector names.
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  // Refresh state for the documents panel. lastRefreshAt is still used as the
  // `since` argument to fetchNewDocuments(), but the user no longer sees the
  // value on screen (the badge timestamp was removed with the auto-refresh).
  // Modified by Abhirup Nandi — 2026-05-20 (later): setNowTick removed — only
  // the deleted "Xs ago" label needed periodic re-renders.
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Search + filter state for the Ingested Documents panel
const [docSearch, setDocSearch] = useState("");
const [docFilter, setDocFilter] = useState("all"); // "all" | "claims" | "guidelines" | "approved" | "reference"
// Inclusion state for the ingested-documents list.
// Semantic: docs are INCLUDED in the next ingestion by default. The set
// stores the IDs the user has EXCLUDED. So checkbox-checked == !excluded.
// Down at the ingestion call site, we filter the documents array by
// `!excludedDocIds.has(d.id)` before passing it to <BrandIntelligenceProfile />.
const [excludedDocIds, setExcludedDocIds] = useState(() => new Set());

  // Single refresh pass — used by both the auto-interval and the click handler.
  //
  // Drives connector status by ingestion outcome:
  //   - fetch throws            → auto-refresh connectors (non-manual) → Error
  //   - fetch returns valid docs → originating connectors → Active + lastIngested = now
  //   - fetch returns []         → no status change (idle revert handles eventual Disabled)
  //
  // Uses functional state setters only so the auto-interval doesn't capture stale state.
  const runRefresh = async () => {
    const startedAt = Date.now();
    setIsRefreshing(true);
    try {
      let incoming;
      try {
        incoming = await fetchNewDocuments(lastRefreshAt);
      } catch (err) {
        // Auto-refresh fetch failed → flag every non-manual connector as Error.
        console.warn("[BrandIntelligence] fetch failed", err);
        setConnectors((prev) =>
          prev.map((c) => (c.type === "manual" ? c : { ...c, status: "Error" }))
        );
        return;
      }
      if (!Array.isArray(incoming) || incoming.length === 0) return;

      // Validate every payload — silently drop anything malformed.
      const valid = incoming.filter(isFetchedDocValid);
      if (valid.length === 0) {
        // We got *something* but it didn't pass validation — treat as failure.
        const offendingSources = new Set(
          incoming.map((d) => d && d.sourceId).filter(Boolean)
        );
        setConnectors((prev) =>
          prev.map((c) =>
            offendingSources.has(c.id) ? { ...c, status: "Error" } : c
          )
        );
        return;
      }

      // Dedupe by id so repeated polls can't double-add.
      const now = new Date();
      setDocuments((prev) => {
        const seen = new Set(prev.map((d) => d.id));
        const fresh = valid.filter((d) => !seen.has(d.id));
        return fresh.length ? [...fresh, ...prev] : prev;
      });

      // Flip every connector that produced fresh content → Active + lastIngested = now.
      const activeSources = new Set(valid.map((d) => d.sourceId));
      setConnectors((prev) =>
        prev.map((c) =>
          activeSources.has(c.id)
            ? { ...c, status: "Active", lastIngested: now }
            : c
        )
      );
    } finally {
      setLastRefreshAt(new Date());
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, SPIN_MIN_MS - elapsed);
      setTimeout(() => setIsRefreshing(false), remaining);
    }
  };

  // Idle revert — periodically sweep for non-Disabled connectors whose
  // lastIngested is older than IDLE_REVERT_MS (or never set) and reset them.
  useEffect(() => {
    const sweep = () => {
      const cutoff = Date.now() - IDLE_REVERT_MS;
      setConnectors((prev) =>
        prev.map((c) => {
          if (c.status === "Disabled") return c;
          const ts = c.lastIngested ? c.lastIngested.getTime() : 0;
          if (ts < cutoff) {
            return { ...c, status: "Disabled" };
          }
          return c;
        })
      );
    };
    const id = setInterval(sweep, IDLE_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Modified by Abhirup Nandi — 2026-05-20 (later): auto-refresh interval +
  // relative-label tick removed. Refresh is manual only — click the Refresh
  // button (was the "Auto-refreshed" badge) to trigger runRefresh() on demand.
  // The previous 30-second loop was re-rendering the documents list faster
  // than the search/filter state could settle, so just-generated content
  // briefly flickered out of view.

  // Add-connector modal state.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(SOURCE_TYPES[0].value);

  // Added by Abhirup Nandi - 2026-05-20
  // ----- Veeva Vault ingestion -----
  // Mirrors the fetch path in ImportContentPage.jsx:
  //   getveevaData() → res.data → normalize to array → map to doc model.
  // On success: docs land in the documents list (deduped), Veeva → Active.
  // On failure (network/error/empty): Veeva → Error.
  const fetchVeevaDocuments = async () => {
    if (veevaFetching) return; // guard against double-clicks
    setVeevaFetching(true);

    try {
      const res = await getveevaData();

      // dataService.getveevaData swallows network errors and resolves to
      // `undefined`. Treat that as a failed fetch.
      if (!res || !res.data) {
        throw new Error("Veeva API returned no data");
      }

      const json = res.data;
      const itemsArray =
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json)        ? json :
        (json && typeof json === "object") ? [json] : [];

      const now = new Date();
      const mapped = itemsArray.map((item) => mapVeevaToDoc(item, now));
      console.log("[BrandIntelligence] Veeva fetch:", mapped);

      if (mapped.length === 0) {
        // API responded, but with zero usable docs — surface as Error so
        // the user sees the failure rather than a silent no-op.
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === "veeva" ? { ...c, status: "Error" } : c
          )
        );
        return;
      }

      // Dedupe by id so re-clicking doesn't double-add the same documents.
      setDocuments((prev) => {
        const seen = new Set(prev.map((d) => d.id));
        const fresh = mapped.filter((d) => !seen.has(d.id));
        return fresh.length ? [...fresh, ...prev] : prev;
      });

      setConnectors((prev) =>
        prev.map((c) =>
          c.id === "veeva"
            ? { ...c, status: "Active", lastIngested: now }
            : c
        )
      );
      setLastActiveConnectorId("veeva"); // Added by Abhirup Nandi — 2026-05-25
      setLastRefreshAt(now);
    } catch (err) {
      console.warn("[BrandIntelligence] Veeva fetch failed:", err);
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === "veeva" ? { ...c, status: "Error" } : c
        )
      );
    } finally {
      setVeevaFetching(false);
      // Reset the per-button marker so neither button keeps spinning
      // after the underlying fetch resolves.
      setClickedAction((prev) => ({ ...prev, veeva: null }));
    }
  };

  // Added by Abhirup Nandi - 2026-05-25
  // ----- Claims library ingestion -----
  // Parallel to fetchVeevaDocuments above. Hits getClaimsData() (which maps
  // to the get_claims endpoint in dataService.js), normalises the response
  // to an array, maps each item via mapClaimToDoc, and merges into the
  // documents list deduped by id. Success → Claims connector goes Active +
  // lastIngested = now. Empty/failed payload → Claims goes Error.
  const fetchClaimsDocuments = async () => {
    if (claimsFetching) return; // guard against double-clicks
    setClaimsFetching(true);

    try {
      const res = await getClaimsData();

      // dataService.getClaimsData swallows network errors and resolves to
      // `undefined`. Treat that as a failed fetch.
      if (!res || !res.data) {
        throw new Error("Claims API returned no data");
      }

      const json = res.data;
      const itemsArray =
        Array.isArray(json?.items)  ? json.items :
        Array.isArray(json?.claims) ? json.claims :
        Array.isArray(json)         ? json :
        (json && typeof json === "object") ? [json] : [];

      const now = new Date();
      const mapped = itemsArray.map((item) => mapClaimToDoc(item, now));
      console.log("[BrandIntelligence] Claims fetch:", mapped);

      if (mapped.length === 0) {
        // API responded, but with zero usable docs — surface as Error so
        // the user sees the failure rather than a silent no-op.
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === "claims" ? { ...c, status: "Error" } : c
          )
        );
        return;
      }

      // Dedupe by id so re-clicking doesn't double-add the same claims.
      setDocuments((prev) => {
        const seen = new Set(prev.map((d) => d.id));
        const fresh = mapped.filter((d) => !seen.has(d.id));
        return fresh.length ? [...fresh, ...prev] : prev;
      });

      setConnectors((prev) =>
        prev.map((c) =>
          c.id === "claims"
            ? { ...c, status: "Active", lastIngested: now }
            : c
        )
      );
      setLastActiveConnectorId("claims"); // Added by Abhirup Nandi — 2026-05-25
      setLastRefreshAt(now);
    } catch (err) {
      console.warn("[BrandIntelligence] Claims fetch failed:", err);
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === "claims" ? { ...c, status: "Error" } : c
        )
      );
    } finally {
      setClaimsFetching(false);
      setClickedAction((prev) => ({ ...prev, claims: null }));
    }
  };

  // Modified by Abhirup Nandi - 2026-05-20: added Veeva branch — clicking the
  // run button on the Veeva row triggers fetchVeevaDocuments() instead of
  // cycling status manually.
  //
  // Run-button click handler.
  //  - Manual connector: button means "pick files" when not Active,
  //    and "deactivate" when Active. Real ingestion (file picker) happens
  //    on click; status flips to Active only after files are chosen.
  //  - Veeva connector: button means "fetch from Veeva Vault" when not Active,
  //    and "deactivate" when Active. Status flips after the API call resolves.
  //  - Other connectors: simple Active → Disabled → Error → Active cycle.
  // Per-connector Refresh — re-runs the connector's fetch without
  // toggling its status. Lets the user re-pull docs they previously
  // removed via the ingested-documents list, or grab newly-added
  // upstream content, without having to Pause-then-Play.
  // Manual connector "refresh" re-opens the file picker so the user
  // can append more files.
  const refreshConnector = (id) => {
    const conn = connectors.find((c) => c.id === id);
    if (!conn) return;
    setClickedAction((prev) => ({ ...prev, [id]: "refresh" }));
    if (conn.type === "veeva")  { fetchVeevaDocuments();  return; }
    if (conn.type === "claims") { fetchClaimsDocuments(); return; }
    if (conn.type === "manual") {
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }
    // SharePoint and any other connector types: no real fetch wired yet
    // — just bump the timestamp so the UI signals an attempt was made.
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, lastIngested: new Date().toISOString() } : c
      )
    );
    // No async fetch for SharePoint yet — clear the marker immediately.
    setClickedAction((prev) => ({ ...prev, [id]: null }));
  };

  const cycleStatus = (id) => {
    const conn = connectors.find((c) => c.id === id);
    if (!conn) return;
    // Mark this as a "run" click so the spin animation only lights up the
    // Run / Pause button, not the Refresh button.
    setClickedAction((prev) => ({ ...prev, [id]: "run" }));

    if (conn.type === "manual") {
      if (conn.status === "Active") {
        // Deactivate manual connector
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, status: "Disabled" } : c
          )
        );
     } else {
  setConnectors((prev) =>
    prev.map((c) => c.id === id ? c : { ...c, status: "Disabled" })
  );
  setDocuments([]);  // ← clear previous connector's docs
  setLastActiveConnectorId(null); // new session starting
  if (fileInputRef.current) fileInputRef.current.click();
}
      return;
    }

    if (conn.type === "veeva") {
      if (conn.status === "Active") {
        // Deactivate Veeva connector — keeps already-ingested docs visible.
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, status: "Disabled" } : c
          )
        );
    } else {
  setConnectors((prev) =>
    prev.map((c) => c.id === id ? c : { ...c, status: "Disabled" })
  );
  setDocuments([]);  // ← clear previous connector's docs
  setLastActiveConnectorId(null); // new session starting
  fetchVeevaDocuments();
}
      return;
    }

    // Added by Abhirup Nandi - 2026-05-25: Claims branch — mirrors Veeva.
    // Run button on the Claims row triggers fetchClaimsDocuments() (which
    // hits the get_claims endpoint) when activating; deactivates locally
    // when already Active. Deactivating other connectors + clearing the
    // documents list matches the single-connector-at-a-time UX above.
    if (conn.type === "claims") {
      if (conn.status === "Active") {
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, status: "Disabled" } : c
          )
        );
      } else {
        setConnectors((prev) =>
          prev.map((c) => c.id === id ? c : { ...c, status: "Disabled" })
        );
        setDocuments([]);  // ← clear previous connector's docs
        setLastActiveConnectorId(null); // new session starting
        fetchClaimsDocuments();
      }
      return;
    }

    setConnectors((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const idx = STATUS_CYCLE.indexOf(c.status);
       const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
const next = { ...c, status: nextStatus };
if (nextStatus === "Active") {
  next.lastIngested = new Date();
  // Deactivate all other connectors
  return next;
}
return next;
      })
    );
  };

  // Manual document upload. Cancelled picker = no state change. Some valid
  // files → ingest + Manual → Active. All invalid → Manual → Error.
  const onFilesSelected = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-picking the same file later
    if (picked.length === 0) return;

    const now = new Date();
    const validFiles = picked.filter(isUploadedFileValid);

    if (validFiles.length === 0) {
      console.warn("[BrandIntelligence] Manual upload: no valid files");
      setConnectors((prev) =>
        prev.map((c) => (c.id === "manual" ? { ...c, status: "Error" } : c))
      );
      return;
    }

    // Modified by Sanju Kumari — 2026-05-29: read BOTH client-side text and
    // base64 bytes per file. readFileAsBase64 returns "" for plain-text files,
    // readFileAsText returns "" for binary the client can't decode, so each
    // doc carries exactly the payloads the backend can use.
    const newDocs = await Promise.all(
      validFiles.map(async (f, i) => {
        const [text, file_b64] = await Promise.all([
          readFileAsText(f),
          readFileAsBase64(f),
        ]);
        return {
          id: `doc-${now.getTime()}-${i}`,
          name: f.name,
          contentType: "reference",
          sourceId: "manual",
          lastRefresh: now,
          text,
          file_b64,
          mime: f.type || "",
          size: typeof f.size === "number" ? f.size : 0,
        };
      })
    );

    setDocuments((prev) => [...newDocs, ...prev]);
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === "manual" ? { ...c, status: "Active", lastIngested: now } : c
      )
    );
    setLastActiveConnectorId("manual");
    setLastRefreshAt(now);
  };

  // Added by Abhirup Nandi — 2026-05-25
  // Delete a manually-uploaded document by id. Only manual docs render the
  // delete button — Veeva/Claims/SharePoint docs are read-only. If removing
  // the last manual doc, the Manual connector also reverts to Disabled so
  // the row state stays consistent with what the list actually shows.
  // Toggle a single row's "include in ingestion" checkbox. If the doc is
  // currently EXCLUDED, this re-includes it (deletes from the excluded
  // set); otherwise it excludes it.
  const toggleDocIncluded = (docId) => {
    setExcludedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  // Bulk Select-all / Deselect-all for ingestion. Operates on the
  // currently-filtered view so the user can search/filter first and then
  // bulk-toggle just what they see.
  //   shouldInclude=true  → include all visible docs (remove from excluded)
  //   shouldInclude=false → exclude all visible docs (add to excluded)
  const setAllVisibleIncluded = (docs, shouldInclude) => {
    setExcludedDocIds((prev) => {
      const next = new Set(prev);
      for (const d of docs) {
        if (shouldInclude) next.delete(d.id);
        else next.add(d.id);
      }
      return next;
    });
  };

  const deleteDocument = (docId) => {
    setDocuments((prev) => {
      const remaining = prev.filter((d) => d.id !== docId);
      const stillHasManual = remaining.some((d) => d.sourceId === "manual");
      if (!stillHasManual) {
        setConnectors((c) =>
          c.map((conn) =>
            conn.id === "manual"
              ? { ...conn, status: "Disabled", lastIngested: null }
              : conn
          )
        );
        setLastActiveConnectorId((prev) => (prev === "manual" ? null : prev));
      }
      return remaining;
    });
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditDraft(c.name);
  };
  const commitEdit = () => {
    if (editingId == null) return;
    const trimmed = editDraft.trim();
    if (trimmed) {
      setConnectors((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, name: trimmed } : c))
      );
    }
    setEditingId(null);
    setEditDraft("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };
  const onEditKeyDown = (e) => {
    if (e.key === "Enter")  { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  };

  // ----- Add-connector modal handlers -----
  const openAdd = () => {
    setNewName("");
    setNewType(SOURCE_TYPES[0].value);
    setIsAddOpen(true);
  };
  const closeAdd = () => setIsAddOpen(false);
  const submitAdd = (e) => {
    if (e) e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setConnectors((prev) => [
      ...prev,
      {
        id: `connector-${Date.now()}`,
        name: trimmed,
        type: newType,
        lastIngested: null,   // never ingested yet — rendered as "Never"
        status: "Disabled",   // user can activate via the run-cycle button
      },
    ]);
    setIsAddOpen(false);
  };

  // Esc closes the add-connector modal.
  useEffect(() => {
    if (!isAddOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setIsAddOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAddOpen]);

 const activeConnector = connectors.find((c) => c.status === "Active");

// Modified by Abhirup Nandi — 2026-05-25: use displayConnectorId so docs
// from the active connector (or the last one that ingested successfully)
// stay visible even after the idle-revert sweep flips the connector to
// Disabled. If nothing has ever ingested, show everything (true fallback).
const displayConnectorId = activeConnector?.id ?? lastActiveConnectorId;
const filteredDocuments = documents.filter((d) => {
  const matchesConnector = displayConnectorId ? d.sourceId === displayConnectorId : true;
  const matchesSearch    = d.name.toLowerCase().includes(docSearch.toLowerCase());
  // Modified by Abhirup Nandi — 2026-05-20: normalise d.contentType so raw
  // Veeva strings ("Multichannel Slide") match dropdown keys ("multichannel_slide").
  const matchesFilter    = docFilter === "all" || normaliseContentType(d.contentType) === docFilter;
  return matchesConnector && matchesSearch && matchesFilter;
});
  return (
    <ToastProvider>
    <section className="bic-section" aria-label="Brand Intelligence Connectors">
      {/* Hidden file input — clicked programmatically by the Manual connector's run button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="bic-hidden-file-input"
        onChange={onFilesSelected}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Outer wrapper card — encloses the section title + the two inner
          cards (Data source connections, Ingested documents) in a single
          visual frame, matching the design mockup. */}
      {/* <div className="bic-outer-card"> */}
      <div className="bic-section-label">Brand Intelligence</div>

      <div className="bic-card">
        {/* Header */}
        <div className="bic-card-head">
          <div className="bic-card-titleBlock">
            <div className="bic-card-titleRow">
              <Plug2 className="bic-card-icon bic-card-icon--connections" strokeWidth={2} />
              <h3 className="bic-card-title">Data source connections</h3>
            </div>
            <p className="bic-card-sub">
              Connect source systems to power intelligence features
            </p>
          </div>

          <button className="bic-add-btn" onClick={openAdd}>
            <Plus className="bic-add-icon" strokeWidth={2.2} />
            <span>Add connector</span>
          </button>
        </div>

        {/* Connector rows */}
        <div className="bic-list">
          {connectors.map((c) => {
            const isEditing = editingId === c.id;
            // Added by Abhirup Nandi - 2026-05-20: drives the spinning icon,
            // disabled run button, and "Fetching from Veeva Vault…" subtitle
            // while a getveevaData() call is in flight on the Veeva row.
            const isVeevaInFlight = c.type === "veeva" && veevaFetching;
            // Added by Abhirup Nandi - 2026-05-25: same idea for the Claims row.
            const isClaimsInFlight = c.type === "claims" && claimsFetching;
            const isInFlight = isVeevaInFlight || isClaimsInFlight;
            const inFlightLabel = isVeevaInFlight
              ? "Fetching from Veeva Vault…"
              : isClaimsInFlight
                ? "Fetching claims…"
                : null;
            return (
              <div className="bic-row" key={c.id}>
                <div className={`bic-row-iconWrap bic-row-iconWrap--${c.type}`}>
                  <ConnectorIcon type={c.type} />
                </div>

                <div className="bic-row-main">
                  {isEditing ? (
                    <input
                      className="bic-row-edit-input"
                      value={editDraft}
                      autoFocus
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={onEditKeyDown}
                      onBlur={commitEdit}
                      aria-label="Edit connector name"
                    />
                  ) : (
                    <div className="bic-row-name">{c.name}</div>
                  )}
                  <div className="bic-row-sub">
                    {inFlightLabel ? (
                      <span>{inFlightLabel}</span>
                    ) : (
                      <>
                        Last ingested:{" "}
                        {c.lastIngested ? formatTimestamp(c.lastIngested) : "Never"}
                      </>
                    )}
                  </div>
                </div>

                <div className="bic-row-actions">
                  <StatusPill status={c.status} />

                  {/* Per-connector Refresh — only this button spins when
                      the user clicked it; the Run button stays static.
                      Tracking via clickedAction[c.id] from state above. */}
                  <button
                    className="bic-icon-btn"
                    onClick={() => refreshConnector(c.id)}
                    disabled={isInFlight}
                    aria-label={`Refresh ${c.name}`}
                    title={
                      isInFlight
                        ? "Already in progress…"
                        : "Refresh — re-fetch documents from this source"
                    }
                  >
                    <RefreshCw
                      size={14}
                      strokeWidth={2}
                      className={
                        isInFlight && clickedAction[c.id] === "refresh"
                          ? "bic-spin"
                          : ""
                      }
                    />
                  </button>

                  <button
                    className="bic-icon-btn"
                    onClick={() => cycleStatus(c.id)}
                    disabled={isInFlight}
                    aria-label={
                      inFlightLabel ?? runTooltip(c.status, c.type)
                    }
                    title={
                      inFlightLabel ?? runTooltip(c.status, c.type)
                    }
                  >
                    {isInFlight && clickedAction[c.id] === "run" ? (
                      <RefreshCw size={14} strokeWidth={2} className="bic-spin" />
                    ) : (
                      <RunIcon status={c.status} type={c.type} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───── Ingested Documents (read-only) ───── */}
    <div className="bic-card bic-doc-card">
  <div className="bic-card-head">
    <div className="bic-card-titleBlock">
      <div className="bic-card-titleRow">
        <FileText className="bic-card-icon bic-card-icon--documents" strokeWidth={2} />
        <h3 className="bic-card-title">Ingested documents</h3>
      </div>
      <p className="bic-card-sub">
        Read-only list of documents brought in by each connector
      </p>
    </div>
    {/* Modified by Abhirup Nandi — 2026-05-20 (later): replaced the green
        "Auto-refreshed · Xs ago" pill badge with a plain Refresh outline
        button. The click handler is unchanged — only the label and visual
        treatment changed. */}
    <button
      type="button"
      className={`bic-refresh-btn ${isRefreshing ? "is-refreshing" : ""}`}
      onClick={runRefresh}
      disabled={isRefreshing}
      title="Refresh documents"
      aria-label="Refresh documents"
    >
      <RefreshCw size={14} strokeWidth={2.2} className="bic-refresh-btn-icon" />
      <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
    </button>
  </div>

  {/* ── Search + Filter toolbar ── */}
  <div className="bic-doc-toolbar">
    <div className="bic-doc-search-wrap">
      <Search size={13} strokeWidth={2} className="bic-doc-search-icon" />
      <input
        type="text"
        className="bic-doc-search-input"
        placeholder="Search documents…"
        value={docSearch}
        onChange={(e) => setDocSearch(e.target.value)}
        aria-label="Search ingested documents"
      />
      {docSearch && (
        <button
          className="bic-doc-search-clear"
          onClick={() => setDocSearch("")}
          aria-label="Clear search"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>

    <div className="bic-doc-filter-wrap">
      <Filter size={13} strokeWidth={2} className="bic-doc-filter-icon" />
      <select
        className="bic-doc-filter-select"
        value={docFilter}
        onChange={(e) => setDocFilter(e.target.value)}
        aria-label="Filter by content type"
      >
        <option value="all">All types</option>
        <option value="claims">Claims</option>
        <option value="guidelines">Brand guidelines</option>
        <option value="approved">Approved content</option>
        <option value="reference">Reference</option>
        <option value="material">Material</option>
        <option value="email_template">Email template</option>
        <option value="multichannel_slide">Multichannel slide</option>
      </select>
    </div>
  </div>

  {/* Bulk Select-for-Ingestion toolbar — appears only when there are docs.
      Checkboxes here represent INCLUSION in the next ingestion (checked =
      will be ingested). Default is everything ingested; user unchecks
      anything they want to leave out of this run. */}
  {filteredDocuments.length > 0 && (() => {
    const visibleIds      = filteredDocuments.map((d) => d.id);
    const includedVisible = visibleIds.filter((id) => !excludedDocIds.has(id)).length;
    const allVisibleIncluded =
      includedVisible === visibleIds.length && visibleIds.length > 0;
    const noneVisibleIncluded = includedVisible === 0;
    return (
      <div className="bic-doc-bulk">
        <label className="bic-doc-bulk-check">
          <input
            type="checkbox"
            checked={allVisibleIncluded}
            // Indeterminate when some but not all visible rows are
            // selected for ingestion — standard table-toolbar behaviour.
            ref={(el) => {
              if (el) el.indeterminate = !allVisibleIncluded && !noneVisibleIncluded;
            }}
            onChange={(e) =>
              setAllVisibleIncluded(filteredDocuments, e.target.checked)
            }
          />
          <span className="bic-sel-opt">
            {allVisibleIncluded
              ? `All ${visibleIds.length} selected for ingestion`
              : noneVisibleIncluded
                ? `None selected — click to select all ${visibleIds.length} for ingestion`
                : `${includedVisible} of ${visibleIds.length} selected for ingestion`}
          </span>
        </label>
        {!allVisibleIncluded ? (
          <button
            type="button"
            className="bic-doc-bulk-btn bic-doc-bulk-btn--primary"
            onClick={() => setAllVisibleIncluded(filteredDocuments, true)}
            title="Mark every visible document for inclusion in the next ingestion"
          >
            <span className="bic-sel-opt">Select all for ingestion</span>
          </button>
        ) : (
          <button
            type="button"
            className="bic-doc-bulk-btn"
            onClick={() => setAllVisibleIncluded(filteredDocuments, false)}
            title="Exclude every visible document from the next ingestion"
          >
            <span>Deselect all</span>
          </button>
        )}
      </div>
    );
  })()}

  <div className="bic-doc-list">
  {documents.length === 0 ? (
    <div className="bic-doc-empty">No documents ingested yet.</div>
  ) : filteredDocuments.length === 0 ? (
    <div className="bic-doc-empty">No documents match your search or filter.</div>
  ) : (
    filteredDocuments.map((d) => {
              const source = connectors.find((c) => c.id === d.sourceId);
              // Modified by Abhirup Nandi — 2026-05-20: normalise before lookup
              // so raw Veeva strings resolve to the correct CONTENT_TYPES entry.
              const ct = CONTENT_TYPES[normaliseContentType(d.contentType)] || {
                label: d.contentType,
                cls: "bic-doc-pill-reference",
              };
              return (
                <div
                  className={`bic-doc-row ${
                    excludedDocIds.has(d.id) ? "bic-doc-row--excluded" : ""
                  }`}
                  key={d.id}
                >
                  {/* Card-style row matching the design mockup:
                        LEFT  → include-in-ingestion checkbox (vertically centered)
                        RIGHT → top: source badge + content-type pill
                                middle: document title
                                bottom: "Last refresh: …" */}
                  <label
                    className="bic-doc-checkbox bic-doc-checkbox--left"
                    title="Include in next ingestion"
                  >
                    <input
                      type="checkbox"
                      checked={!excludedDocIds.has(d.id)}
                      onChange={() => toggleDocIncluded(d.id)}
                      aria-label={`Include ${d.name} in next ingestion`}
                    />
                  </label>
                  <div className="bic-doc-card-inner">
                    <div className="bic-doc-card-top">
                      {source && (
                        <span className="bic-doc-source-badge">
                          <ConnectorIcon type={source.type} />
                          <span>{source.name}</span>
                        </span>
                      )}
                      <span className={`bic-doc-pill ${ct.cls}`}>{ct.label}</span>
                    </div>

                    <div className="bic-doc-name">{d.name}</div>

                    <div className="bic-doc-card-bottom">
                      <span className="bic-doc-refresh">
                        Last refresh:{" "}
                        {d.lastRefresh ? formatTimestamp(d.lastRefresh) : "Never"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Added by Abhirup Nandi — 2026-05-25: Brand Intelligence Context
            content rendered as a continuation of this same card. The outer
            section label + card wrapper were stripped inside the component
            so it slots in cleanly with just a divider separating the two. */}
        <BrandIntelligenceContext />

        {/* Added by Abhirup Nandi — 2026-05-25: Brand Intelligence Profile —
            triggers initial ingestion, presents the AI-drafted 4-section
            profile for Accept/Edit/Flag review, gates activation on AC #4
            (flagged sections) and AC #5 (empty claims). Same embedded
            pattern — no own card frame. The `documents` array is the live
            ingested list (Veeva / Claims / SharePoint / Manual upload) —
            the profile component reads its length for the doc-count
            confirmation (AC #1) and uses it as the source for the LLM
            extraction call once that integration is wired. */}
        {/* Modified by Sanju Kumari — 2026-05-29: wired onProfileChange so
            the loaded draft's profile_id flows down to Activation. */}
        <BrandIntelligenceProfile
          documents={documents.filter((d) => !excludedDocIds.has(d.id))}
          onProfileChange={(p) => setActiveProfileId(p?.profile_id || null)}
        />

        {/* US 1.4 + US 1.5 panels only render once a draft profile exists.
            Before that, the empty hero tiles (v—, Sections reviewed —, etc.)
            look broken to a non-technical user. We render a single quiet
            placeholder hint instead so the page stays clean. */}
        {activeProfileId ? (
          <>
            <BrandIntelligenceActivation profileId={activeProfileId} />
            <BrandIncrementalProfile profileId={activeProfileId} />
          </>
        ) : (
          <div
            style={{
              padding: "14px 18px",
              margin: "12px 22px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              color: "#64748b",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Run ingestion above to enable activation, version control, and
            refresh &amp; change detection.
          </div>
        )}
      </div>
      {/* </div> */}
      {isAddOpen && (
        <div
          className="bic-modal-backdrop"
          onClick={closeAdd}
          role="presentation"
        >
          <div
            className="bic-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bic-add-title"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submitAdd}>
              <header className="bic-modal-head">
                <h4 id="bic-add-title">Add connector</h4>
                <button
                  type="button"
                  className="bic-modal-close"
                  onClick={closeAdd}
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              </header>

              <div className="bic-modal-body">
                <label className="bic-modal-field">
                  <span className="bic-modal-label">Connector name</span>
                  <input
                    autoFocus
                    className="bic-modal-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </label>

                <fieldset className="bic-modal-field">
                  <span className="bic-modal-label">Source type</span>
                  <div className="bic-modal-options">
                    {SOURCE_TYPES.map(({ value, label, Icon }) => (
                      <label
                        key={value}
                        className={`bic-modal-option ${newType === value ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="bic-source-type"
                          value={value}
                          checked={newType === value}
                          onChange={() => setNewType(value)}
                        />
                        <Icon className="bic-modal-option-icon" size={16} strokeWidth={2} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <footer className="bic-modal-foot">
                <button
                  type="button"
                  className="bic-modal-cancel"
                  onClick={closeAdd}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bic-modal-submit"
                  disabled={!newName.trim()}
                >
                  Add connector
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
    </ToastProvider>
  );
}