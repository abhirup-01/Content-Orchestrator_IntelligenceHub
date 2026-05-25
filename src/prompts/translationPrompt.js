// ============================================================================
// Translation prompt for Azure OpenAI (used by SmartTMTranslationHub bulk
// translate flow). Ported from the n8n workflow `translate_all_update`
// (webhook path /csv_upload_bulk) so behavior matches the original pipeline.
//
// `payload` is the same object that was previously POSTed to the n8n webhook:
//   {
//     projectName, sourceLang, targetLang, therapyArea, tmLeverageOn,
//     segments: [{ segmentId, index, source, words }],
//     glossaryHints: [{ term, translation }],
//     fuzzyMatch?: string
//   }
// ============================================================================

export function buildTranslationPrompt(payload) {
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];
  const sourceLang = payload?.sourceLang || "English";
  const targetLang = payload?.targetLang || "";
  const fuzzyMatch = payload?.fuzzyMatch || "";
  const glossaryHints = Array.isArray(payload?.glossaryHints) ? payload.glossaryHints : [];

  const segmentNumber = (s) =>
    String(s.segmentId || "").match(/segment[_\s](\d+)/i)?.[1] || s.index;

  const segmentList = segments
    .map((s) => `• ${s.segmentId || s.index}: ${s.source}`)
    .join("\n");

  const requiredKeys = segments
    .map((s) => `"segment ${segmentNumber(s)}"`)
    .join(", ");

  const exampleFormat = segments
    .map((s) => `  "segment ${segmentNumber(s)}": "translated text"`)
    .join(",\n");

  const fuzzyBlock = fuzzyMatch
    ? `\n### Reference Context (Fuzzy Match):\nUse this for style consistency:\n${fuzzyMatch}\n`
    : "";

  const glossaryBlock = glossaryHints.length > 0
    ? `\n### Mandatory Terminology (Glossary):\nYou MUST use these exact translations:\n${glossaryHints
        .map((h) => `- ${h.term} -> ${h.translation}`)
        .join("\n")}\n`
    : "";

  return `You are now a translation agent.

You MUST translate ALL segment content without skipping, merging, dropping, modifying, or omitting anything.

If any segment's source text begins with a bracketed context hint such as "[Context: ...]" or "[Kontext: ...]", REMOVE that prefix entirely before translating that segment. The hint is metadata, not part of the source.

### Source Segments to Translate:

${segmentList}

Your task is:
- Identify the content type (Email or Blog)
- Apply the correct rule set
- Translate ONLY what is present
- ALWAYS translate ALL segments exactly as given
- WITHOUT ANY rewriting, restructuring, summarizing, adding, removing, or modifying content

###### For the translation, consider the tasks below and then according to the rules do the translation and other tasks:

TASK 1 — IDENTIFY CONTENT TYPE
----------------------------------------
Determine whether the content is an EMAIL or BLOG:

EMAIL indicators:
- Greetings ("Hi…", "Dear…")
- Subject lines
- Signatures
- Reply-chain markers (">")
- Sender info
- Timestamps
- Email-style paragraphs

BLOG indicators:
- Title
- Subtitle/Deck
- H2 sections
- Long-form narrative
- Pull quotes
- ISI/legal blocks

----------------------------------------
TASK 2 — EMAIL TRANSLATION RULES
----------------------------------------
Translate the following parts exactly as they appear — ONLY if they explicitly exist:

- salutation
- header
- preheader
- body
- summary (ONLY if explicitly written; DO NOT generate one)

STRICT EMAIL TRANSLATION RULES:
- NO rewriting or paraphrasing.
- NO inventing missing parts.
- NO modifying tone or structure.
- NO removing disclaimers.
- NO merging or splitting sentences.
- Translate EXACTLY AS WRITTEN.
- Leading/trailing whitespace MAY be normalized.
- Locked items (brand names, tokens, numbers, references) MUST remain unchanged.

If a part is missing: DO NOT create it.

----------------------------------------
TASK 3 — BLOG TRANSLATION RULES
(only if NOT email)
----------------------------------------
Translate ONLY the following elements IF explicitly present:

- title
- deck
- intro
- sections (H2 + body)
- pull_quotes
- isi_legal

STRICT BLOG TRANSLATION RULES:
- No invented headers.
- No rewriting or summarization.
- No merging or splitting sections.
- No conversion of text into different formats.
- Preserve structure.
- Translate EXACTLY what exists.
- ISI/legal blocks MUST preserve meaning + structure.

----------------------------------------
UNIVERSAL "DO NOT MODIFY" RULES
----------------------------------------
Across ALL content types:

DO NOT CHANGE:
- Numbers + units ("5 mg", "12 weeks")
- Reference markers
- Tokens / variables (e.g. %%URL%%, <Recipient First Name>)
- Parenthetical qualifiers
- Brand names with ™ / ®

DO NOT:
- Add clarifications
- Add explanations
- Add summaries
- Remove sentences
- Rephrase or "improve" text
- Change tone

----------------------------------------
UNIVERSAL TRANSLATION QUALITY RULES
----------------------------------------
- One idea remains one idea — no expansion.
- No vague pronoun fixes; translate them exactly.
- Maintain tone as-is.
- Preserve existing structure.
- Keep qualifiers and medical terminology intact.
- Maintain all controlled/locked content exactly.

----------------------------------------
GUIDING PRINCIPLES
----------------------------------------
- Translate ONLY the existing meaning.
- Never infer or add content.
- Never paraphrase.
- Never rewrite for clarity.
- Never alter immutable items ("5 mg", brand names, protocol numbers, etc.)
- Maintain content boundaries EXACTLY.
- ALWAYS translate ALL segments in full.

----------------------------------------
STRICT SEGMENT TRANSLATION REQUIREMENT
----------------------------------------
You MUST:
- Take ALL segments provided in the input
- Translate EACH segment separately
- Preserve order
- Preserve segment boundaries
- Do NOT merge segments
- Do NOT omit any segment
- Do NOT partially translate
- ALL segments must appear in the output

Failure to translate every segment = violation.

Translate ALL segments from ${sourceLang} to ${targetLang}.
${fuzzyBlock}${glossaryBlock}
### STRICT OUTPUT RULES:

- Output MUST contain exactly ${segments.length} keys
- Keys MUST follow this EXACT format: "segment N"
  → lowercase "segment"
  → exactly ONE space character
  → the index number
- CORRECT examples:  "segment 1"  "segment 2"  "segment 10"  "segment 23"
- WRONG examples:    "segment_1"  "Segment 1"  "segment  1"  "segment1"
- Required keys in order: ${requiredKeys}
- Output ONLY valid JSON — no explanation, no markdown fences, no extra text

### MANDATORY JSON OUTPUT FORMAT:

{
${exampleFormat}
}
`;
}
