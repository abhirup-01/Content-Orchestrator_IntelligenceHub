// ============================================================================
// Cultural adaptation prompt for Azure OpenAI (used by CulturalAdaptationWorkspace
// "Analyze All With AI" batch flow). Ported from the n8n workflow
// `Cultural_translate_all` (webhook path /culturalTranslateAll) so behavior
// matches the original pipeline.
//
// `payloadList` is the array previously POSTed to the n8n webhook. Each item:
//   {
//     segmentId, index, projectName, source, sourceLang,
//     translated, targetLang, country, meta
//   }
// targetLang is taken from the first item (all items in a batch share it).
// ============================================================================

export function buildCulturalAdaptationPrompt(payloadList) {
  const items = Array.isArray(payloadList) ? payloadList : [];
  const targetLang = items[0]?.targetLang || "";

  const segmentNumber = (s) =>
    String(s.segmentId || "").match(/segment[_\s](\d+)/i)?.[1] || s.index;

  const segmentList = items
    .map((s) => `• segment ${segmentNumber(s)}: ${s.translated}`)
    .join("\n");

  const requiredKeys = items
    .map((s) => `"segment ${segmentNumber(s)}"`)
    .join(", ");

  const exampleFormat = items
    .map((s) => `  "segment ${segmentNumber(s)}": "culturally adapted translation"`)
    .join(",\n");

  return `You are a professional linguistic and cultural adaptation agent.

If any segment's source text begins with a bracketed context hint such as "[Context: ...]" or "[Kontext: ...]", REMOVE that prefix entirely before translating.

You MUST translate ALL segment content without skipping, merging, dropping, modifying, or omitting anything.

Translate the entire content into ${targetLang} language.

Your responsibilities:
1. Detect the language of the provided content.
2. Translate AND culturally adapt the content for the country associated with: ${targetLang}
3. Evaluate how culturally appropriate the original translation is.

================================================================
TRANSLATION & CULTURAL ADAPTATION RULES
================================================================
You MUST:
- Preserve the original meaning accurately.
- Use a formal and professional tone.
- Adapt phrasing, idioms, and context to suit the cultural norms of the target country.
- Ensure the final translation sounds natural and native to the target audience.
- Ensure cultural correctness in etiquette, politeness level, formality, and local expectations.

You MUST NOT:
- Add new meaning.
- Omit important details.
- Use slang unless culturally normal for professional communication.

### Source Segments to Translate:

${segmentList}

================================================================
STRICT OUTPUT RULES (DO NOT VIOLATE)
================================================================
- Output MUST contain exactly ${items.length} keys
- Each key MUST follow this EXACT format: "segment N"
  → lowercase word "segment"
  → exactly ONE space
  → the index number extracted from the segmentId
- CORRECT key examples:  "segment 4"  "segment 11"  "segment 23"
- WRONG key examples:    "segment_4"  "segment_4_[body]"  "Segment 4"  "segment  4"
- Required keys in order: ${requiredKeys}
- Output ONLY valid JSON — no explanation, no markdown fences, no extra text before or after
- Do NOT create extra segments
- Do NOT skip any segment
- Do NOT rename or renumber segments

### MANDATORY JSON OUTPUT FORMAT:

{
${exampleFormat}
}

CRITICAL REMINDER:
- Replace EVERY "culturally adapted translation" with the actual translation
- Do NOT output the literal words "culturally adapted translation"
- Keys use ONE space: "segment 4" NOT "segment_4" NOT "segment  4"
- JSON must be valid — no trailing commas, no comments, no markdown fences
`;
}
