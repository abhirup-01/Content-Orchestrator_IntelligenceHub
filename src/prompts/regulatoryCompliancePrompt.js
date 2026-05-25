// ============================================================================
// Regulatory compliance prompt for Azure OpenAI. Ported from the n8n
// workflow `Regulatory_compliance` (webhook path /regulatory).
//
// Used by RegulatoryComplianceHub for per-segment compliance checks.
//
// Input payload: { adaptedText, country, projectName, therapyArea, ... }
// Returns a JSON object: { critical_issue, recommendation1, recommendation2 }
// ============================================================================

export function buildRegulatoryCompliancePrompt(payload) {
  const adaptedText = payload?.adaptedText ?? "";

  return `You are a compliance agent. Task: (1) detect the language of the input text below, (2) translate it to English, (3) evaluate against exactly three US pharma rules, and (4) output a SINGLE-LINE JSON (no newline characters) with only the keys: "critical_issue", "recommendation1", "recommendation2".

INPUT TEXT TO EVALUATE:
${adaptedText}

Rules to check (use these short identifiers when referring internally):
1) FDA 21 CFR Part 210
2) FDA 21 CFR Part 211
3) FD&C Act Section 501

Evaluation (English, after translation):
- Perform semantic alignment.
- Mark each rule as matched or unmatched with a short reason (do this internally to derive the final fields).
- Determine the most severe gap across unmatched rules as "critical_issue".

Output (STRICT):
- Return exactly this JSON object on a single line (no extra text, no line breaks):
{"critical_issue":"", "recommendation1":"", "recommendation2":""}
- Populate:
  - critical_issue: one-sentence summary of the biggest compliance gap found.
  - recommendation1 and recommendation2: concrete, action-oriented improvements to the translated text that address missing compliance points (e.g., add SOPs, in-process controls, batch/stability testing, contamination/adulteration controls, documentation, labeling).
- Keep output text in **English**.
- Escape quotes; remove any newline characters.

If input is empty or missing:
- critical_issue = "No content provided"
- recommendation1 = "Provide English content covering CGMP manufacturing controls, sanitation, equipment qualification, documentation, and facilities (21 CFR Part 210)."
- recommendation2 = "Add in-process controls, batch release testing, stability program, labeling/packaging controls, investigations/CAPA, and adulteration prevention (21 CFR Part 211, FD&C Act §501)."

Now: detect language → translate to English → evaluate vs the three rules → output the single-line JSON.`;
}
