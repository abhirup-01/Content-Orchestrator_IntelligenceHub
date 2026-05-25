import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import {
  ArrowLeft, Save, ArrowRight, Upload, FileText, CheckCircle2, Maximize2,
  Minimize2, Users, Stethoscope, Edit2, Plus, X, Pill, Unlock, Box,
  MessageSquare, Globe, Languages, Shield, CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { Button } from "@mui/material";
import { updateProjectMeta, markPhaseComplete, getProject, resetP2DraftState } from '../lib/progressStore';
import { usePhaseNavigation } from "./PhaseNav.jsx";
import "./css/GlobalAssetCapture.css";
import { computeProgress } from '../lib/progressStore';
import { buildSegmentationPrompt } from '../prompts/segmentationPrompt';


// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS — defined at MODULE SCOPE so they are available everywhere
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Shared parser: handles truncated, stringified, or object output ──────────
function parseN8NOutput(json) {
  const first = Array.isArray(json) ? json[0] : json;
  if (!first) return null;

  let raw = first.output;

  // Case 1: Already a plain object → use directly
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    const cleaned = raw.trim();

    // ── Attempt 1: Parse as-is (happy path) ────────────────────────────────
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn("parseN8NOutput: clean parse failed →", e.message);
    }

    // ── Attempt 2: Repair truncated JSON ───────────────────────────────────
    // Uses lastIndexOf('",') to find the exact boundary between the last
    // COMPLETE value and the truncated one — avoids merging segments
    try {
      if (!cleaned.endsWith("}")) {
        const lastCompleteCommaIdx = cleaned.lastIndexOf('",');

        if (lastCompleteCommaIdx !== -1) {
          // Everything up to and including the last complete value's closing quote
          const completeSection = cleaned.substring(0, lastCompleteCommaIdx + 1);

          // Everything after the last complete pair's comma — the truncated segment
          const afterComplete = cleaned.substring(lastCompleteCommaIdx + 2).trim();

          // Match: "segment_7_body": "partial text..."
          const truncatedKeyMatch = afterComplete.match(/^"(segment[^"]+)":\s*"(.*)/s);

          if (truncatedKeyMatch) {
            const truncatedKey = truncatedKeyMatch[1];
            const truncatedValue = truncatedKeyMatch[2]
              .replace(/\\/g, "\\\\")
              .replace(/"/g, '\\"')
              .replace(/\r?\n/g, "\\n");

            const repairable =
              `${completeSection},\n"${truncatedKey}": "${truncatedValue}"\n}`;

            const repaired = JSON.parse(repairable);
            if (repaired && typeof repaired === "object" && !Array.isArray(repaired)) {
              console.info("parseN8NOutput: repaired truncated JSON. Keys:", Object.keys(repaired));
              return repaired;
            }
          }
        }
      }
    } catch (repairErr) {
      console.warn("parseN8NOutput: repair failed →", repairErr.message);
    }

    // ── Attempt 3: Regex extraction of complete pairs only (last resort) ───
    try {
      const result = {};
      const kvRegex = /"(segment[^"]+)":\s*"((?:[^"\\]|\\.)*)"/g;
      let match;
      while ((match = kvRegex.exec(cleaned)) !== null) {
        result[match[1]] = match[2]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      }
      if (Object.keys(result).length > 0) {
        console.info("parseN8NOutput: regex fallback. Keys:", Object.keys(result));
        return result;
      }
    } catch (regexErr) {
      console.error("parseN8NOutput: regex extraction failed →", regexErr.message);
    }
  }

  console.warn("parseN8NOutput: all strategies exhausted");
  return null;
}

// ─── Regex that matches ALL observed key formats ──────────────────────────────
// Covers:
//   segment_1_subject_line     (all underscores)
//   segment_1_subject line     (underscore then space in suffix)
//   segment 1                  (legacy space-separated)
const SEGMENT_KEY_RE = /^segment[_\s]\d+([_\s].*)?$/i;

// ─── Extract and sort segment entries from a parsed output object ─────────────
function extractSegmentEntries(rawOutput) {
  if (!rawOutput || typeof rawOutput !== "object" || Array.isArray(rawOutput)) return [];

  return Object.keys(rawOutput)
    .filter((k) => SEGMENT_KEY_RE.test(k))
    .map((k) => {
      const num = parseInt(k.match(/\d+/)?.[0] ?? "0", 10);

      // Derive label from suffix: "segment_4_body" → "Body"
      // When multiple segments share the same suffix (e.g. two "body" segments),
      // the num badge in the UI keeps them visually distinct
      const suffixMatch = k.match(/^segment[_\s]\d+[_\s](.+)$/i);
      const label = suffixMatch
        ? suffixMatch[1].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : `Segment ${num}`;

      return {
        num,
        label,
        text: String(rawOutput[k] ?? "").trim(),
        key: k, // always unique: segment_4_body vs segment_6_body vs segment_7_body
      };
    })
    .filter((s) => s.text.length > 0)
    .sort((a, b) => a.num - b.num);
}

// ─── Converts apiRawJson → segment array for phase navigation ─────────────────
function GlobalAssetCapture(apiRawJson, localSegments, langFromPrev = "EN") {
  const rawOutput = parseN8NOutput(apiRawJson);
  const entries = extractSegmentEntries(rawOutput);

  if (entries.length > 0) {
    return entries.map((e) => ({
      id: e.key,
      index: e.num,
      source: e.text,
      words: e.text.split(/\s+/).filter(Boolean).length,
      status: "Pending",
      lang: langFromPrev,
    }));
  }

  // Fallback to local segments if API gave nothing usable
  return localSegments.map((seg, i) => ({
    id: seg.id || `seg-${i + 1}`,
    index: seg.index || i + 1,
    source: seg.text,
    words: seg.text.split(/\s+/).filter(Boolean).length,
    status: "Pending",
    lang: langFromPrev,
  }));
}

// ─── Local fallback segmenter (used when no API data available) ───────────────
function segmentContent(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim());
  const segments = [];
  let idx = 1;
  const subjectLine = lines.find((l) => /^subject\b/i.test(l)) || lines[0] || "";
  if (subjectLine) {
    const txt = subjectLine.replace(/^subject:\s*/i, "");
    segments.push({
      id: "subject",
      index: idx++,
      label: "Subject Line",
      kindClass: "kind-subject",
      text: txt,
      length: txt.length,
    });
  }
  return segments;
}

// ─── Renders the segmentation preview panel ───────────────────────────────────
const SEGMENTS_PAGE_SIZE = 10;

function N8NStringSegments({ json }) {
  const rawOutput = parseN8NOutput(json);
  const entries = extractSegmentEntries(rawOutput);

  console.log("N8NStringSegments → keys:", rawOutput ? Object.keys(rawOutput) : "null");
  console.log("N8NStringSegments → entries:", entries.length);

  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / SEGMENTS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = showAll
    ? entries
    : entries.slice((safePage - 1) * SEGMENTS_PAGE_SIZE, safePage * SEGMENTS_PAGE_SIZE);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const toggleShowAll = () => { setShowAll((v) => !v); setPage(1); };

  return (
    <div className="segments-wrap">
      {entries.length === 0 ? (
        <div className="empty-seg">No segments found in response.</div>
      ) : (
        <>
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap" style={{ gap: 8 }}>
            <div className="text-muted small">
              {showAll
                ? `Showing all ${total} segments`
                : `Showing ${(safePage - 1) * SEGMENTS_PAGE_SIZE + 1}–${Math.min(safePage * SEGMENTS_PAGE_SIZE, total)} of ${total} segments`}
            </div>
            <div className="d-flex align-items-center" style={{ gap: 8 }}>
              {!showAll && (
                <>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goPrev} disabled={safePage <= 1}>
                    ← Prev
                  </button>
                  <span className="small">Page {safePage} of {totalPages}</span>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goNext} disabled={safePage >= totalPages}>
                    Next →
                  </button>
                </>
              )}
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={toggleShowAll}>
                {showAll ? "Paginate" : "Show all"}
              </button>
            </div>
          </div>

          {visible.map((seg) => (
            <article key={seg.key} className="segment-card">
              <div className="segment-header">
                <div className="seg-title-row">
                  <span className="seg-number-badge">Segment {seg.num}</span>
                  <span className="seg-label kind-paragraph">{seg.label}</span>
                </div>
                <span className="seg-meta">{seg.text.length} characters</span>
              </div>
              <div className="segment-body">{seg.text}</div>
            </article>
          ))}

          {!showAll && totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center mt-3" style={{ gap: 8 }}>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goPrev} disabled={safePage <= 1}>
                ← Prev
              </button>
              <span className="small">Page {safePage} of {totalPages}</span>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goNext} disabled={safePage >= totalPages}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function GlobalContextCapture() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [isFocusMode, setIsFocusMode] = useState(false);

  const toggleFocusMode = () => setIsFocusMode(prev => !prev);
  const projectId = state?.projectId || 'proj-unknown';
  const [projectRec, setProjectRec] = useState(null);

  const refreshProgress = async () => {
    const record = await getProject(projectId);
    setProjectRec(record || {});
  };

  useEffect(() => {
    refreshProgress();
    window.addEventListener('glocal_progress_updated', refreshProgress);
    return () => window.removeEventListener('glocal_progress_updated', refreshProgress);
  }, [projectId]);

  const totalTarget = 4;

  const progressData = useMemo(() => {
    let recToUse = projectRec;
    const isRecEmpty = !recToUse || Object.keys(recToUse).length === 0;

    if (isRecEmpty && projectId) {
      try {
        const rawDb = localStorage.getItem('glocal_progress_v1');
        const db = JSON.parse(rawDb || '{}');
        if (db[projectId]) recToUse = db[projectId];
      } catch (e) {
        console.error("Error reading progress from localStorage:", e);
      }
    }

    if (!recToUse || Object.keys(recToUse).length === 0) {
      return {
        completedSet: new Set(),
        completedCount: 0,
        overallPercent: 0,
        isProgressLoading: isRecEmpty
      };
    }

    const { completedSet } = computeProgress(recToUse);
    const count = Math.min(completedSet.size, totalTarget);

    return {
      completedSet,
      completedCount: count,
      overallPercent: Math.round((count / totalTarget) * 100),
      isProgressLoading: !projectRec || Object.keys(projectRec).length === 0
    };
  }, [projectRec, projectId]);

  const { completedSet, completedCount, overallPercent, isProgressLoading } = progressData;

  const projectName = state?.projectName || "HCP Clinical Insights Email Campaign - DE Adaptation";
  const importedContent = state?.content || `No content to display`;
  const type = state?.type || "email";
  const inboundLang = state?.lang ?? state?.sourceLang ?? "EN";
  const country = state?.country ?? null;
  console.log(country);

  const [contentTab, setContentTab] = useState("editor");
  const [contentText, setContentText] = useState(importedContent);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const localSegments = useMemo(() => segmentContent(contentText), [contentText]);

  const [summary, setSummary] = useState({
    assetType: "Marketing Email",
    indication: "Not specified",
    therapyArea: "Respiratory",
    audience: "Pulmonologists"
  });
  const [extraAudiences, setExtraAudiences] = useState([]);
  const [apiRawJson, setApiRawJson] = useState(null);
  const [isSegLoading, setIsSegLoading] = useState(false);
  const [segError, setSegError] = useState("");
  const [assetType, setAssetType] = useState(type || "email");
  const [therapeuticContext, setTherapeuticContext] = useState("");
  const [indication, setIndication] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [additionalAudiences, setAdditionalAudiences] = useState([]);
  const [isEditingContext, setIsEditingContext] = useState(false);

  const isP1Completable = !!apiRawJson && !isSegLoading && !segError;

  const marketsCount = state?.marketsCount ?? 0;
  const marketCodes = Array.isArray(state?.marketCodes) ? state.marketCodes : [];
  const gotoPhase = usePhaseNavigation(projectId, projectName, country);

  React.useEffect(() => {
    localStorage.setItem('gac_focus_mode', String(isFocusMode));
  }, [isFocusMode]);

  // ── Load project data from DB on mount ──────────────────────────────────────
  React.useEffect(() => {
    async function loadProjectData() {
      if (!projectId) return;

      const rec = await getProject(projectId);
      const m = rec?.meta || {};

      const importedStrOriginal = (state?.content || "").trim();
      const dbStrOriginal = (m.contentText || "").trim();
      const importedStrLower = importedStrOriginal.toLowerCase();
      const dbStrLower = dbStrOriginal.toLowerCase();

      const isInvalidText = (str) =>
        str === "" ||
        str.includes("loading") ||
        str.includes("no content to display") ||
        str.includes("no content found");

      const hasValidDbText = !isInvalidText(dbStrLower);
      const hasFreshImport = !isInvalidText(importedStrLower);

      if (hasValidDbText) {
        setContentText(m.contentText);
      } else if (hasFreshImport) {
        setContentText(state.content);
        await updateProjectMeta(projectId, { contentText: state.content });
      } else if (Array.isArray(m.segmentsP1) && m.segmentsP1.length > 0) {
        const reconstructedText = m.segmentsP1.map(seg => seg.source).join("\n\n");
        setContentText(reconstructedText);
        await updateProjectMeta(projectId, { contentText: reconstructedText });
      } else {
        setContentText("No content found for this project.");
      }

      // Restore segmentation preview
      if (Array.isArray(m.segmentsP1) && m.segmentsP1.length > 0) {
        const reconstructedJson = {
          output: m.segmentsP1.reduce((acc, seg) => {
            acc[seg.id || `segment ${seg.index}`] = seg.source;
            return acc;
          }, {}),
        };
        setApiRawJson(reconstructedJson);
      }

      if (typeof m.assetType === "string") setAssetType(m.assetType);
      if (typeof m.therapeuticContext === "string") setTherapeuticContext(m.therapeuticContext);
      if (typeof m.indication === "string") setIndication(m.indication);
      if (typeof m.targetAudience === "string") setTargetAudience(m.targetAudience);
      if (Array.isArray(m.additionalAudiences)) setAdditionalAudiences(m.additionalAudiences);
    }
    loadProjectData();
  }, [projectId, state?.content]);

  // ── Auto-save content edits ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!projectId) return;
    const textToSave = (contentText || "").trim().toLowerCase();
    if (
      textToSave === "" ||
      textToSave.includes("loading") ||
      textToSave.includes("no content to display") ||
      textToSave.includes("no content found")
    ) return;

    const timeoutId = setTimeout(() => {
      updateProjectMeta(projectId, { contentText });
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [projectId, contentText]);

  const phases = [
    { id: 'P1', name: "Global Context Capture", sub: "Source content analysis", status: "active", icon: <Globe size={18} />, color: 'is-blue' },
    { id: 'P2', name: "Smart TM Translation", sub: "AI-powered translation", status: "todo", icon: <Languages size={18} />, color: 'is-purple' },
    { id: 'P3', name: "Cultural Intelligence", sub: "Cultural adaptation", status: "todo", icon: <MessageSquare size={18} />, color: 'is-green' },
    { id: 'P4', name: "Regulatory Compliance", sub: "Compliance validation", status: "todo", icon: <Shield size={18} />, color: 'is-orange' },
    { id: 'P5', name: "Quality Intelligence", sub: "Quality assurance", status: "todo", icon: <CheckCircleIcon size={18} />, color: 'is-cyan' },
    { id: 'P6', name: "DAM Integration", sub: "Asset packaging", status: "todo", icon: <Box size={18} />, color: 'is-pink' },
    { id: 'P7', name: "Integration Lineage", sub: "System integration", status: "todo", icon: <MessageSquare size={18} />, color: 'is-violet' },
  ];

  const availableAdditionalAudiences = [
    "Secondary care physicians", "Primary care physicians", "Nurses/Healthcare staff",
    "Patients/Caregivers", "Specialists", "Pharmacists",
    "Healthcare administrators", "Payers/Insurance providers",
  ];

  const toggleAdditionalAudience = (aud) => {
    setAdditionalAudiences((prev) =>
      prev.includes(aud) ? prev.filter((x) => x !== aud) : [...prev, aud]
    );
  };

  const handleSave = () => alert("Project changes saved successfully!");

  // ── openSegmentationPreview ──────────────────────────────────────────────────
  const openSegmentationPreview = async () => {
    setContentTab("preview");
    if (apiRawJson || isSegLoading) return;

    setIsSegLoading(true);
    setSegError("");

    // ── Helper: call n8n, parse, set state, save to DB ──────────────────────
    const triggerN8N = async () => {
      const azureEndpoint = (process.env.REACT_APP_AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
      const azureDeployment = process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT;
      const azureApiVersion = process.env.REACT_APP_AZURE_OPENAI_API_VERSION || "2024-10-21";
      const azureUrl = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;

      const response = await fetch(azureUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.REACT_APP_AZURE_OPENAI_API_KEY
        },
        body: JSON.stringify({
          max_completion_tokens: 16384,
          response_format: { type: "json_object" },
          stream: true,
          messages: [{
            role: "user",
            content: buildSegmentationPrompt(contentText)
          }]
        })
      });

      if (!response.ok) {
        // Try to read error body for diagnostics (streaming responses sometimes carry JSON error)
        let errBody = "";
        try { errBody = await response.text(); } catch (_) {}
        console.error("[Azure non-OK]", response.status, errBody);
        throw new Error(`API responded with HTTP ${response.status}${errBody ? ` — ${errBody.slice(0, 200)}` : ""}`);
      }

      // ── Stream the SSE response from Azure OpenAI ──────────────────────────
      // Each chunk is `data: {...}\n\n`. We accumulate the content deltas,
      // and as each complete `"segment_X_role": "value"` pair appears in the
      // accumulated text, we surface it to the UI progressively.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulatedContent = "";
      let finishReason = null;
      let contentFilterResults = null;
      let lastEmittedCount = 0;

      const extractCompleteSegments = (text) => {
        const result = {};
        const kvRegex = /"(segment[^"]+)":\s*"((?:[^"\\]|\\.)*)"/g;
        let m;
        while ((m = kvRegex.exec(text)) !== null) {
          result[m[1]] = m[2]
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
        }
        return result;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop(); // last (possibly incomplete) line stays in buffer

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const chunk = JSON.parse(data);
            const choice = chunk.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              accumulatedContent += delta;
              const partial = extractCompleteSegments(accumulatedContent);
              const partialCount = Object.keys(partial).length;
              if (partialCount > lastEmittedCount) {
                lastEmittedCount = partialCount;
                setApiRawJson({ output: partial });
              }
            }

            if (choice.finish_reason) finishReason = choice.finish_reason;
            if (choice.content_filter_results) contentFilterResults = choice.content_filter_results;
          } catch (parseErr) {
            // Skip malformed chunks rather than failing the whole stream
          }
        }
      }

      console.log("[Azure stream complete] finish_reason:", finishReason, "content length:", accumulatedContent.length, "segments parsed during stream:", lastEmittedCount);

      if (finishReason === "content_filter") {
        console.error("[Azure content filter triggered]", contentFilterResults);
        throw new Error("Azure content filter blocked the response. Check console for which category was flagged.");
      }

      if (!accumulatedContent || accumulatedContent.trim() === "") {
        throw new Error(`Azure returned empty content (finish_reason=${finishReason ?? "unknown"}). See console for the full response.`);
      }

      if (finishReason === "length") {
        console.warn("[Azure response truncated at max_completion_tokens] Raw text length:", accumulatedContent.length);
      }

      // Final parse — use the full accumulated text, falling back to regex extraction
      let parsedOutput;
      try {
        parsedOutput = JSON.parse(accumulatedContent.trim());
      } catch (e) {
        const match = accumulatedContent.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsedOutput = JSON.parse(match[0]);
          } catch (e2) {
            // Last resort — use whatever we extracted progressively during streaming
            parsedOutput = extractCompleteSegments(accumulatedContent);
          }
        } else {
          console.error("[No JSON object found in Azure response]", accumulatedContent);
          throw new Error(`Model returned non-JSON content (finish_reason=${finishReason ?? "unknown"}). See console for the raw text.`);
        }
      }

      const entries = extractSegmentEntries(parsedOutput);

      if (entries.length === 0) {
        throw new Error("API returned a response but no valid segments could be extracted.");
      }

      // Final state set (replaces any progressive updates)
      setApiRawJson({ output: parsedOutput });

      // Save to DB
      const api_key = process.env.REACT_APP_API_KEY;
      const saveAllSegments = async () => {
        for (const entry of entries) {
          const payload = {
            document_name: projectName,
            segmented_no: entry.label,
            description: entry.text,
          };
          try {
            const saveRes = await fetch(
              "https://9hrpycs3g5.execute-api.us-east-1.amazonaws.com/Prod/api/segmented-content",
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-API-Key": api_key },
                body: JSON.stringify(payload),
              }
            );
            if (!saveRes.ok) {
              console.error(`Failed to save "${entry.label}". Status: ${saveRes.status}`);
            }
          } catch (err) {
            console.error(`Network error saving "${entry.label}":`, err);
          }
        }
      };
      await saveAllSegments();
    };

    try {
      let dbCheckPassed = false;

      try {
        // Step 1: Try DB first
        const timestamp = new Date().getTime();
        const api_key = process.env.REACT_APP_API_KEY;
        const dbResponse = await fetch(
          `https://9hrpycs3g5.execute-api.us-east-1.amazonaws.com/Prod/api/segmented-content?t=${timestamp}`,
          {
            cache: "no-store",
            headers: { "X-API-Key": api_key },
          }
        );

        if (!dbResponse.ok) throw new Error(`DB check failed with HTTP ${dbResponse.status}`);

        const allDbContent = await dbResponse.json();
        const existingSegments = allDbContent.filter(
          (item) => item.document_name?.trim() === projectName.trim()
        );

        if (existingSegments.length > 0) {
          console.log("Found existing segments in DB:", existingSegments.length);

          const reconstructedOutput = existingSegments.reduce((acc, seg, idx) => {
            const safeLabel = seg.segmented_no.trim().toLowerCase().replace(/\s+/g, "_");
            const key = `segment_${idx + 1}_${safeLabel}`;
            acc[key] = seg.description;
            return acc;
          }, {});

          console.log("Reconstructed from DB:", Object.keys(reconstructedOutput));
          setApiRawJson({ output: reconstructedOutput });
          dbCheckPassed = true;
        }
      } catch (dbErr) {
        console.warn("DB check failed, falling back to n8n:", dbErr.message);
      }

      // Step 2: If DB didn't supply segments, trigger n8n
      if (!dbCheckPassed) {
        console.log("No segments from DB. Triggering n8n workflow…");
        await triggerN8N();
      }
    } catch (err) {
      setSegError(err?.message || "Error processing segmentation preview.");
    } finally {
      setIsSegLoading(false);
    }
  };

  // ── Phase 1 completion gate ──────────────────────────────────────────────────
  const previewSegmentsFromApi = useMemo(
    () => (apiRawJson ? GlobalAssetCapture(apiRawJson, [], inboundLang) : []),
    [apiRawJson, inboundLang]
  );

  const totalPreviewSegments = previewSegmentsFromApi.length;

  const emptyPreviewSegments = useMemo(
    () => previewSegmentsFromApi.filter((s) => !((s?.source || "").trim().length)).length,
    [previewSegmentsFromApi]
  );

  const allSegmentsCaptured = totalPreviewSegments > 0 && emptyPreviewSegments === 0;
  const canCompleteP1 = !!apiRawJson && allSegmentsCaptured && !isSegLoading && !segError;

  const p1Tooltip = !apiRawJson
    ? "Open 'Segmentation Preview' to generate segments"
    : !allSegmentsCaptured
    ? `${emptyPreviewSegments} segment(s) still empty`
    : segError
    ? `Fix error before proceeding: ${segError}`
    : "Proceed to Phase 2";

  // ═══════════════════════════════════════════════════════════════════════════
  // Modified by Abhirup Nandi - 2026-05-14
  // ── Handle Complete Phase 1 (PERFORMANCE + TICK-RELIABILITY FIX) ──────────
  // BEFORE: 3 sequential updateProjectMeta calls (each = GET+POST round-trip)
  //         + markPhaseComplete + setTimeout(50ms). resetP2DraftState was a
  //         4th updateProjectMeta writing fields already written by step 2.
  //         → up to 8 sequential network hops; tick sometimes did not appear
  //         because of swallowed markPhaseComplete failures.
  // AFTER:  Merge all P1 + P2-prep + draft-reset fields into ONE meta payload.
  //         Then markPhaseComplete SEQUENTIALLY (parallel via Promise.all is
  //         unsafe — updateProjectMeta posts {completed: existing.completed}
  //         and can overwrite a PATCH that landed between its GET and POST).
  //         Verify P1 actually landed in completed[]; retry once if not.
  // ═══════════════════════════════════════════════════════════════════════════
  const handleComplete = async () => {
    if (!canCompleteP1) return;

    const segmentsForNext = GlobalAssetCapture(apiRawJson, localSegments, inboundLang);

    console.log('GAC: Completing P1 for projectId:', projectId, {
      projectName, hasApiJson: !!apiRawJson, localSegmentsCount: localSegments.length
    });

    const isFirstCompletion = !completedSet.has("P1"); // Added by Abhirup Nandi - 2026-05-14

    // Modified by Abhirup Nandi - 2026-05-14: single merged payload covers P1 meta,
    // P2 prep, and the draft-reset fields that resetP2DraftState used to write.
    const mergedMetaUpdate = {
      assetType, therapeuticContext, indication, targetAudience,
      additionalAudiences, marketsCount, marketCodes, contentText,
      segmentsP1: segmentsForNext,
      ...(isFirstCompletion ? {
        segmentsP2: segmentsForNext,
        p2DraftGenerated: false,
        p2DraftGeneratedAt: null,
        p2BannerDismissed: false,
      } : {}),
    };

    try {
      await updateProjectMeta(projectId, mergedMetaUpdate);

      if (isFirstCompletion) {
        // Modified by Abhirup Nandi - 2026-05-14: SEQUENTIAL (not Promise.all)
        // to avoid the GET+POST-vs-PATCH race that can wipe the tick.
        await markPhaseComplete(projectId, "P1");

        // Added by Abhirup Nandi - 2026-05-14: verify the tick will actually show; retry once.
        const verifyAfterMark = async () => {
          const fresh = await getProject(projectId);
          const completedNorm = (fresh?.completed || []).map(c => String(c || '').trim().toUpperCase());
          return completedNorm.includes('P1');
        };
        let confirmed = await verifyAfterMark();
        if (!confirmed) {
          console.warn('P1 not in completed[] after first mark — retrying once');
          await new Promise(r => setTimeout(r, 200));
          await markPhaseComplete(projectId, "P1");
          confirmed = await verifyAfterMark();
        }
        if (!confirmed) {
          throw new Error('Global Context Capture could not be marked complete on the server. Please try again.');
        }
      }

      navigate("/smartTMTranslationHub", {
        state: { projectId, projectName, segments: segmentsForNext, lang: inboundLang, country, forceRefresh: true },
      });
    } catch (err) {
      // Added by Abhirup Nandi - 2026-05-14: surface the real failure instead of silently moving on
      console.error('Complete Phase 1 failed:', err);
      alert(`Could not complete Phase 1.\n\n${err?.message || err}`);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`gac-page ${isFocusMode ? 'is-focus' : ''}`} data-page="gac">

      {/* Sidebar */}
      {!isFocusMode && (
        <aside className="gac-sidebar">
          <div className="sidebar-header" style={{ opacity: isProgressLoading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
            <div className="progress-row">
              <span className="tm-progress-label">Overall Progress</span>
              <span className="tm-progress-value">{isProgressLoading ? "..." : `${overallPercent}%`}</span>
            </div>
            <div className="progress-sub" style={{ marginBottom: '8px' }}>
              {isProgressLoading ? 'Loading...' : `${completedCount} of 4 phases completed`}
            </div>
            <div className="tm-progress-bar">
              <div className="tm-progress-fill" style={{ width: `${overallPercent}%`, transition: 'width 0.4s ease-out' }} />
            </div>
          </div>

          <nav className="sidebar-phases">
            {phases.map((p) => {
              const isDone = completedSet.has(p.id.toUpperCase());
              return (
                <button
                  key={p.id}
                  className={`phase-item ${isDone ? "done" : p.status || ""} ${p.status === "active" ? "is-active" : ""}`}
                  onClick={() => gotoPhase(p.id)}
                  aria-label={`Open ${p.name}`}
                >
                  <span className={`phase-icon ${p.color || ''}`}>{p.icon}</span>
                  <span className="phase-text">
                    <span className="phase-title">{p.name}</span>
                    <span className="phase-sub">{p.sub}</span>
                  </span>
                  {isDone && !isProgressLoading && <span className="phase-check">✓</span>}
                  {p.status === "active" && !isDone && !isProgressLoading && <span className="phase-active-ind" />}
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      {/* Content Area */}
      <main className="gac-main">
        <div className="gac-content">

          {/* Header */}
          <header className="gac-header d-flex justify-content-between align-items-center px-4 mb-3">
            <div className="d-flex align-items-center gap-3">
              <button className="crumb d-flex align-items-center gap-1" onClick={() => navigate('/')}>
                <ArrowLeft size={14} className="h-1 w-1 mr-2" /> Main Hub
              </button>
              <span className="divider"></span>
              <button className="crumb" onClick={() => navigate('/glocalizationHub', { state: { projectId, projectName, country } })}>
                Glocalization Hub
              </button>
            </div>

            <div className="title-section text-center">
              <h1 className="page-title1 fw-bold mb-0">{projectName}</h1>
            </div>

            <div className="d-flex align-items-center gap-3">
              <span className="saved-ind1 d-flex align-items-center gap-1 text-success">
                <CheckCircle2 size={12} className="h-1 w-1 text-green-600" /> Saved
              </span>
              <button className="action-btn">
                <Save size={15} className="h-4 w-4 mr-2" onClick={handleSave} /> Save
              </button>
              <button
                className="action-btn"
                onClick={toggleFocusMode}
                aria-pressed={isFocusMode}
                title={isFocusMode ? 'Exit focus (Esc)' : 'Enter focus (F)'}
              >
                {isFocusMode ? <><Minimize2 size={15} className="h-4 w-4 mr-2" /> Exit</> : <><Maximize2 size={15} className="h-4 w-4 mr-2" /> Focus</>}
              </button>
            </div>
          </header>

          {/* Phase Label */}
          <div className="phase-label">
            <span className="badge">Phase 1</span>
            <div className="phase-title-group">
              <h2 className="section-title">Global Asset Context Capture</h2>
              <p className="section-desc">Configure source content and context for global adaptation</p>
            </div>
          </div>

          {/* Source Asset Summary */}
          <section className="card1 source-card">
            <div className="card-header1 d-flex justify-content-between align-items-start">
              <div className="d-flex align-items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="#1F7AEC" strokeWidth="2" />
                  <path d="M9.5 12.5l2 2 3.5-4" stroke="#1F7AEC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="card-title1 m-0">Source Asset Summary</h3>
              </div>
              <button type="button" className="link-btn1 d-inline-flex align-items-center" onClick={() => setIsEditingContext((prev) => !prev)}>
                <Edit2 size={12} className="h-3 w-3 mr-1" />
                {isEditingContext ? "Lock" : "Edit"}
              </button>
            </div>

            <p className="imported-from">Imported from "{projectName}"</p>

            <div className="info-grid two">
              {/* Asset Type */}
              <div className="info-item1">
                <div className="info-label-line">
                  <FileText size={15} className="h-4 w-4 text-muted-foreground" />
                  <div className="info-label1">Asset Type</div>
                </div>
                {!isEditingContext ? (
                  <span className="chip1 chip-green">
                    {assetType === "email" && "Marketing Email"}
                    {assetType === "webpage" && "Web Page"}
                    {assetType === "brochure" && "Brochure"}
                    {assetType === "presentation" && "Presentation"}
                    {assetType === "social" && "Social Media"}
                    {!["email", "webpage", "brochure", "presentation", "social"].includes(assetType) && assetType}
                  </span>
                ) : (
                  <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className="form-select form-select-sm mt-1">
                    <option value="email">Marketing Email</option>
                    <option value="webpage">Web Page</option>
                    <option value="brochure">Brochure</option>
                    <option value="presentation">Presentation</option>
                    <option value="social">Social Media</option>
                  </select>
                )}
              </div>

              {/* Therapy Area */}
              <div className="info-item1">
                <div className="info-label-line">
                  <Stethoscope size={15} className="h-4 w-4 text-muted-foreground" />
                  <div className="info-label1">Therapy Area</div>
                </div>
                {!isEditingContext ? (
                  <span className="chip2 chip-green">{"Not specified"}</span>
                ) : (
                  <input type="text" value={therapeuticContext} onChange={(e) => setTherapeuticContext(e.target.value)} placeholder="e.g., Cardiovascular" className="form-control form-control-sm mt-1" />
                )}
              </div>

              {/* Indication */}
              <div className="info-item1">
                <div className="info-label-line">
                  <Pill size={15} className="h-4 w-4 text-muted-foreground" />
                  <div className="info-label1">Indication</div>
                </div>
                {!isEditingContext ? (
                  <span className="chip1 chip-green">{indication || "Not specified"}</span>
                ) : (
                  <input type="text" value={indication} onChange={(e) => setIndication(e.target.value)} placeholder="e.g., Hypertension" className="form-control form-control-sm mt-1" />
                )}
              </div>

              {/* Primary Target Audience */}
              <div className="info-item1">
                <div className="info-label-line">
                  <Users size={15} className="h-4 w-4 text-muted-foreground" />
                  <div className="info-label1">Primary Target Audience</div>
                </div>
                {!isEditingContext ? (
                  <span className="chip2 chip-green">{targetAudience || "Not specified"}</span>
                ) : (
                  <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g., Healthcare professionals" className="form-control form-control-sm mt-1" />
                )}
              </div>
            </div>

            <div className="soft-divider" />
          </section>

          {/* Source Content Card */}
          <section className="card card-source">
            <div className="card-header">
              <div className="header-left">
                <h3 className="card-title">Source Content</h3>
                <p className="card-sub">Imported content can be edited or replaced</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs-bar content-tabs" role="tablist" aria-label="Source content tabs">
              <div className="tabs">
                <button
                  role="tab" id="tab-editor" aria-controls="panel-editor"
                  aria-selected={contentTab === "editor"} tabIndex={contentTab === "editor" ? 0 : -1}
                  className={`tab ${contentTab === "editor" ? "is-active" : ""}`}
                  onClick={() => setContentTab("editor")}
                >
                  Content Editor
                </button>
                <button
                  role="tab" id="tab-preview" aria-controls="panel-preview"
                  aria-selected={contentTab === "preview"} tabIndex={contentTab === "preview" ? 0 : -1}
                  className={`tab ${contentTab === "preview" ? "is-active" : ""}`}
                  onClick={openSegmentationPreview}
                >
                  Segment Review
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* Editor Panel */}
              <div role="tabpanel" id="panel-editor" aria-labelledby="tab-editor" hidden={contentTab !== "editor"} className="tabpanel">
                <div className="editor-wrap full-frame neutral">
                  <textarea
                    className="content-editor"
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Preview Panel */}
              <div role="tabpanel" id="panel-preview" aria-labelledby="tab-preview" hidden={contentTab !== "preview"} className="tabpanel">
                {isSegLoading && (
                  <div className="seg-loading">
                    <div className="spinner" />
                    <span>
                      Generating segments…
                      {apiRawJson?.output && ` ${Object.keys(apiRawJson.output).length} so far`}
                    </span>
                  </div>
                )}

                {!!segError && (
                  <div className="error-banner" role="alert">
                    <strong>Couldn't generate segments.</strong>
                    <div className="error-sub">{segError}</div>
                  </div>
                )}

                {!segError && apiRawJson && (
                  <N8NStringSegments json={apiRawJson} />
                )}

                {!isSegLoading && !segError && !apiRawJson && (
                  <div className="segments-wrap">
                    {localSegments.length > 0 ? (
                      localSegments.map((seg) => (
                        <article key={seg.id} className="segment-card">
                          <div className="segment-header">
                            <span className={`seg-label ${seg.kindClass}`}>{seg.label}</span>
                            <span className="seg-meta">Segment {seg.index} · {seg.length} characters</span>
                          </div>
                          <div className="segment-body">{seg.text}</div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-seg">No segment present to display.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Sticky Footer CTA */}
          <footer className="sticky-footer">
            <button className="primary-cta" onClick={handleComplete} aria-disabled={!isP1Completable}>
              Complete Phase 1 →
            </button>
          </footer>

        </div>
      </main>
    </div>
  );
}