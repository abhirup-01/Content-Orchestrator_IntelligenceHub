// ============================================================================
// Single-segment translation prompt for Azure OpenAI. Ported from the n8n
// workflow `AI_Translate_Modified` (webhook path /csv_upload).
//
// Used by SmartTMTranslationHub for:
//   - handleTranslateClick (TIER 2 hybrid match + TIER 3 full AI)
//   - translateOneSegment helper
//
// Exports BOTH a system message and a user message so the caller can pass them
// to Azure as separate roles, matching how n8n's agent node splits them.
// ============================================================================

export const SINGLE_SEGMENT_TRANSLATION_SYSTEM_MESSAGE = `You are a professional medical translator.
Your goal is to translate text while maintaining strict medical accuracy.

### Instructions:
1. Maintain strict medical accuracy.
2. If "Mandatory Terminology (Glossary)" is provided in the user prompt, you MUST use those specific term translations exactly as listed.
3. If "Reference Context" is provided, use it to maintain consistency in style and tone, but prioritize accuracy.
4. Output ONLY the translated text. Do not add quotes, markdown, or explanations.`;

export function buildSingleSegmentTranslationUserPrompt(payload) {
  const source = payload?.source ?? "";
  const sourceLang = payload?.sourceLang || "English";
  const targetLang = payload?.targetLang || "";
  const fuzzyMatch = payload?.fuzzyMatch || "";
  const glossaryHints = Array.isArray(payload?.glossaryHints) ? payload.glossaryHints : [];

  const fuzzyBlock = fuzzyMatch
    ? `\n### Reference Context (Translation Memory):\nUse this previous translation for style consistency:\n${fuzzyMatch}\n`
    : "";

  const glossaryBlock = glossaryHints.length > 0
    ? `\n### Mandatory Terminology (Glossary):\nYou MUST use these exact translations:\n${glossaryHints
        .map((h) => `- ${h.term} -> ${h.translation}`)
        .join("\n")}\n`
    : "";

  return `Translate the following text from ${sourceLang} to ${targetLang}.

### Source Text:
${source}
${fuzzyBlock}${glossaryBlock}`;
}

/**
 * Convenience builder that returns both messages ready for Azure OpenAI:
 *   const { system, user } = buildSingleSegmentTranslationMessages(payload);
 *   await fetch(..., { messages: [{role:"system", content: system}, {role:"user", content: user}] })
 */
export function buildSingleSegmentTranslationMessages(payload) {
  return {
    system: SINGLE_SEGMENT_TRANSLATION_SYSTEM_MESSAGE,
    user: buildSingleSegmentTranslationUserPrompt(payload),
  };
}
