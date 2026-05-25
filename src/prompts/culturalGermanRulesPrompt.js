// ============================================================================
// German-specific cultural adaptation prompt with rule-table lookup.
// Ported from the n8n workflow `Cultural_German_db` (webhook /cultural_aws).
//
// Rules are loaded from src/data/culturalTranslationRules.json (German bucket)
// by default. You can override at the call site by passing a custom rules
// array as the second argument — useful if you later hydrate rules from your
// AWS API Gateway instead of the bundled JSON.
// ============================================================================

import culturalRulesData from "../data/culturalTranslationRules.json";

const DEFAULT_GERMAN_RULES = Array.isArray(culturalRulesData?.German)
  ? culturalRulesData.German
  : [];

export function buildCulturalGermanRulesPrompt(payload, culturalRules = DEFAULT_GERMAN_RULES) {
  const translated = payload?.translated ?? "";

  const rulesBlock = culturalRules.length > 0
    ? culturalRules
        .map((r) => {
          const cat = r.category ?? "";
          const rule = r.rule ?? "";
          const desc = r.description ?? "";
          return `- [${cat}] Rule: ${rule}\n  Description: ${desc}`;
        })
        .join("\n")
    : "(No rules provided — apply general German B2B/B2C marketing conventions.)";

  return `You are a German marketing localization specialist. You will receive a literal German translation of an English marketing document. Your task is to adapt it for a German B2B/B2C audience while preserving the core message and legal accuracy.

=============================================
INPUT
=============================================
Source content to evaluate and adapt:
${translated}
Target Language: German

=============================================
CULTURAL TRANSLATION RULES (reference table)
=============================================
${rulesBlock}

=============================================
RULE MATCHING INSTRUCTIONS
=============================================
Validate the translated content against every rule listed above, grouped by category. This must be completed for every rule across every category before any output is generated.

Perform the following three-step match for every rule without skipping any:

Step 1 — Category: Identify which category the current rule belongs to (e.g. Tone, CTA, Date Format, Units, Idioms, Brand Voice)
Step 2 — Rule: Check the translated content against the exact rule value and determine whether the content violates or complies with it
Step 3 — Description: Cross-validate the result from Step 2 against the description of the same rule to confirm whether the translated content meets the cultural standard described

=============================================
WHAT TO ADAPT
=============================================
1. Tone: Remove unsubstantiated superlatives. German B2B/B2C marketing is direct, fact-led, and restrained
2. Idioms: Replace English idioms or metaphors with natural German equivalents or plain rephrasing
3. Date/Number formats: Use DD.MM.YYYY, thousands separator as . and decimal separator as ,
4. Units: Convert Imperial to Metric where present
5. CTAs: Use German direct-response norms e.g. "Jetzt anfragen" not "Get started today"
6. Brand voice: Formal register aligned with German market expectations for the sector

=============================================
WHAT NOT TO CHANGE
=============================================
- Product names, brand names, registered trademarks
- Legal disclaimers or regulatory statements — flag these for Stage 3 review
- Specific claims with cited data

=============================================
EVALUATION REQUIREMENTS
=============================================
For the provided source translation:
1. Identify whether it is culturally correct for the target country.
2. Explain (in English) why the translation may be culturally inappropriate.
3. Provide:
   • one corrected culturally adapted translation ("suggestion")
   • two alternative culturally adapted translations ("suggestionA" and "suggestionB")
4. Include category and rule it failed in problem section:
   Category: <category value from rules>
   Rule: <rule value from rules>

5. Provide cultural match scores:
   • scoreA for suggestionA
   • scoreB for suggestionB
   • score = average of scoreA and scoreB

Scores MUST be numerical percentages (0–100).

=============================================
OUTPUT FORMAT RULES
=============================================
You MUST return EXACTLY one JSON object with NO newline characters.

JSON structure:
{
  "translation":"<original translation>",
  "problem":"<why original is culturally incorrect along with Category and Rule from rules>",
  "suggestion":"<corrected culturally adapted translation>",
  "suggestionA":"<alternative culturally adapted translation A>",
  "suggestionB":"<alternative culturally adapted translation B>",
  "score":"<overall average %>",
  "scoreA":"<cultural match score A>",
  "scoreB":"<cultural match score B>"
}

- Replace all placeholders with real values.
- No line breaks.
- No explanations outside the JSON.
- No additional keys.
- No markdown formatting.

END OF INSTRUCTIONS`;
}
