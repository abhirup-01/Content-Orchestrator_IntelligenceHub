import React, { useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import { analyzeComparison, getInventory } from "../api/competitiveIntelligenceApi";
import "./IntelligenceCss/ClaimsComparison.css";

/* ─────────────────────────────────────────────────────────
   US 2.3 — Comparative Claims Analysis
   The UI sends ONLY the competitor content to the backend
   (POST /api/comparison/analyze). The backend fetches ALL
   Veeva-approved claims server-side, runs the AI comparison
   agent, and returns the comparison table + gap assessment.
   Backend access lives in
   src/components/api/competitiveIntelligenceApi.js
───────────────────────────────────────────────────────── */

const CATEGORIES = ["All", "Safety", "Efficacy", "Performance"];

/* The backend returns `gap_severity` per row. This is only a fallback for older
   payloads: if there is NOTHING in common (one side has no matching claim) →
   High Gap; if both sides have a claim → Medium Gap. */
function deriveSeverity(row) {
  const hasVeeva = !!(row.veeva_claim && row.veeva_claim.trim());
  const hasComp = !!(row.competitor_claim && row.competitor_claim.trim());
  return hasVeeva && hasComp ? "Medium Gap" : "High Gap";
}

export default function ClaimsComparison() {
  const [competitorName, setCompetitorName] = useState("");
  const [competitorContent, setCompetitorContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [result, setResult] = useState(null); // full CompareResponse
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null); // "manual" | "inventory" — which button is running
  const [error, setError] = useState(null);

  const rows = result?.comparison_table || [];

  const filteredData = useMemo(
    () =>
      selectedCategory === "All"
        ? rows
        : rows.filter((r) => r.claim_category === selectedCategory),
    [rows, selectedCategory]
  );

  // Per-category counts for the summary cards, derived from the live table.
  const counts = useMemo(() => {
    const c = { Safety: 0, Efficacy: 0, Performance: 0 };
    rows.forEach((r) => {
      if (c[r.claim_category] !== undefined) c[r.claim_category] += 1;
    });
    return c;
  }, [rows]);

  async function runAnalysis() {
    if (!competitorContent.trim()) {
      setError("Paste competitor content (claims / website text) to analyse.");
      return;
    }
    setLoading(true);
    setMode("manual");
    setError(null);
    setResult(null);
    try {
      const res = await analyzeComparison(
        competitorContent.trim(),
        competitorName.trim()
      );
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setMode(null);
    }
  }

  // Pull ALL competitor claims from the Competitor Claims Inventory (above) and
  // run the comparison against Veeva-approved claims — no manual paste needed.
  async function runInventoryAnalysis() {
    setLoading(true);
    setMode("inventory");
    setError(null);
    setResult(null);
    try {
      const data = await getInventory({ data_category: "COMPETITOR_CLAIM", page_size: "100" });
      const items = data.items || [];
      const content = items
        .map((it) => it.claim_text || it.raw_source_text || "")
        .filter(Boolean)
        .join("\n");
      if (!content.trim()) {
        setError("No competitor claims found in the inventory. Run an ingestion cycle first.");
        return;
      }
      const name = items.find((it) => it.competitor_name)?.competitor_name || "";
      setCompetitorContent(content);
      setCompetitorName(name);
      const res = await analyzeComparison(content, name);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setMode(null);
    }
  }

  // Export the current live analysis as a PDF file (jsPDF). Renders the meta,
  // the full comparison table, and the qualitative gap assessment as wrapped
  // text with automatic page breaks.
  function exportReport() {
    if (!result) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const pageH = doc.internal.pageSize.getHeight();
    const maxW = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    // Add one logical line (wrapped + paginated).
    const line = (text, { size = 10, bold = false, gap = 4, color = [30, 41, 59] } = {}) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.splitTextToSize(String(text ?? ""), maxW).forEach((w) => {
        if (y > pageH - margin) { doc.addPage(); y = margin; }
        doc.text(w, margin, y);
        y += size + gap;
      });
    };

    line("Comparative Claims Analysis", { size: 16, bold: true, gap: 8 });
    line(`Competitor: ${result.competitor_name || "—"}`);
    line(`Veeva-approved claims compared: ${result.veeva_claims_count}`);
    line(`Generated by: ${result.generated_by === "ai" ? "AI" : "rule-based"}`, { gap: 12 });

    line("Comparison Table", { size: 13, bold: true, gap: 6 });
    (result.comparison_table || []).forEach((r, i) => {
      line(`${i + 1}. [${r.claim_category}]  ·  ${r.gap_severity || deriveSeverity(r)}`, { bold: true });
      line(`Veeva Claim: ${r.veeva_claim || "—"}`);
      line(`Competitor Claim: ${r.competitor_claim || "—"}`);
      line(`Comparison Summary: ${r.comparison_summary || "—"}`);
      line(`Gap Analysis: ${r.gap_analysis || "—"}`, { gap: 10 });
    });

    const ga = result.gap_assessment || {};
    line("Gap Assessment", { size: 13, bold: true, gap: 6 });
    [
      ["Similarities & Differences", ga.similarities_and_differences],
      ["Competitive Strengths & Weaknesses", ga.competitive_strengths_and_weaknesses],
      ["Missing / Underrepresented Claims", ga.missing_or_underrepresented_claims],
      ["Content Enhancement Opportunities", ga.content_enhancement_opportunities],
    ].forEach(([title, items]) => {
      line(title, { size: 11, bold: true });
      if (items && items.length) items.forEach((it) => line(`• ${it}`));
      else line("• None identified.");
      y += 4;
    });

    doc.save(
      `comparative-claims-${(result.competitor_name || "competitor")
        .replace(/\s+/g, "_")
        .toLowerCase()}.pdf`
    );
  }

  const assessment = result?.gap_assessment;

  return (
    <div className="cc-container">
      <div className="cc-header">
        <h1>Comparative Claims Analysis</h1>
        <button className="cc-export-btn" onClick={exportReport} disabled={!result}>
          Export Report
        </button>
      </div>

      {/* Competitor content input — the only thing the UI sends. Veeva claims
          are fetched server-side. */}
      <div className="cc-input-panel">
        <div className="cc-filter-group" style={{ minWidth: 260 }}>
          <label>Competitor (optional label)</label>
          <input
            className="cc-text-input"
            placeholder="e.g. CompetitorX"
            value={competitorName}
            onChange={(e) => setCompetitorName(e.target.value)}
          />
        </div>
        <div className="cc-filter-group" style={{ flex: 1, minWidth: 320 }}>
          <label>Competitor content (claims / website text)</label>
          <textarea
            className="cc-textarea"
            rows={4}
            placeholder="Paste competitor claims or website copy here…"
            value={competitorContent}
            onChange={(e) => setCompetitorContent(e.target.value)}
          />
        </div>
        <button
          className={`cc-analyze-btn${mode === "manual" ? " cc-running" : ""}`}
          onClick={runAnalysis}
          disabled={loading}
        >
          {mode === "manual" ? "Analysing…" : "Analyse Claims"}
        </button>
        <button
          className={`cc-analyze-btn${mode === "inventory" ? " cc-running" : ""}`}
          onClick={runInventoryAnalysis}
          disabled={loading}
        >
          {mode === "inventory" ? "Analysing…" : "Analyse Inventory Claims"}
        </button>
      </div>

      {error && (
        <div className="cc-error">
          ⚠ {error}
        </div>
      )}

      {/* Meta line — how many Veeva claims were compared + who generated it */}
      {result && (
        <div className="cc-meta">
          Compared against <b>{result.veeva_claims_count}</b> Veeva-approved claim(s)
          {" · "}
          <span className="cc-genby">
            {result.generated_by === "ai" ? "AI-generated" : "rule-based"}
          </span>
        </div>
      )}

      {/* Category filter */}
      <div className="cc-filters">
        <div className="cc-filter-group">
          <label>Claim Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards — live counts from the returned table */}
      <div className="cc-summary-cards">
        <div className="cc-card cc-safety">
          <h3>Safety Claims</h3>
          <p>{counts.Safety}</p>
        </div>
        <div className="cc-card cc-efficacy">
          <h3>Efficacy Claims</h3>
          <p>{counts.Efficacy}</p>
        </div>
        <div className="cc-card cc-performance">
          <h3>Performance Claims</h3>
          <p>{counts.Performance}</p>
        </div>
      </div>

      <div className="cc-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Veeva Claim</th>
              <th>Competitor Claim</th>
              <th>Comparison Summary</th>
              <th>Gap Analysis</th>
              <th>Gap Severity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 30 }}>
                  Analysing competitor claims against Veeva-approved content…
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  {result
                    ? "No comparable claims found for this category."
                    : "Paste competitor content and click “Analyse Claims” to compare against Veeva-approved claims."}
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => {
                const severity = row.gap_severity || deriveSeverity(row);
                return (
                  <tr key={index}>
                    <td>{row.claim_category}</td>
                    <td>{row.veeva_claim || "—"}</td>
                    <td>{row.competitor_claim || "—"}</td>
                    <td>{row.comparison_summary}</td>
                    <td>{row.gap_analysis}</td>
                    <td>
                      <span className={`cc-badge cc-${severity.toLowerCase().replace(" ", "-")}`}>
                        {severity}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Qualitative gap assessment */}
      {assessment && (
        <div className="cc-assessment">
          <h2>Gap Assessment</h2>
          <div className="cc-assessment-grid">
            <AssessmentBlock
              title="Similarities & Differences"
              items={assessment.similarities_and_differences}
            />
            <AssessmentBlock
              title="Competitive Strengths & Weaknesses"
              items={assessment.competitive_strengths_and_weaknesses}
            />
            <AssessmentBlock
              title="Missing / Underrepresented Claims"
              items={assessment.missing_or_underrepresented_claims}
            />
            <AssessmentBlock
              title="Content Enhancement Opportunities"
              items={assessment.content_enhancement_opportunities}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentBlock({ title, items }) {
  return (
    <div className="cc-assessment-block">
      <h3>{title}</h3>
      {items && items.length ? (
        <ul>
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      ) : (
        <p className="cc-assessment-empty">None identified.</p>
      )}
    </div>
  );
}
