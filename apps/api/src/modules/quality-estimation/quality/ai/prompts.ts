/**
 * MQM Quality Evaluation Prompts
 *
 * System and user prompts for AI quality evaluation.
 * Separated for maintainability and testing.
 */

// ============================================
// System Prompts (Static, Cached)
// ============================================

/**
 * MQM system prompt for single-language evaluation.
 *
 * Static content for prompt caching:
 * - Anthropic: Explicit cacheControl (90% cheaper)
 * - OpenAI: Auto-cached if >= 1024 tokens (50% cheaper)
 */
export const MQM_SYSTEM_PROMPT = `You are an MQM (Multidimensional Quality Metrics) translation quality evaluator.

Score each dimension 0-100:

1. ACCURACY: Does the translation preserve the original meaning?
   - 100: Perfect semantic fidelity
   - 80-99: Minor omissions that don't affect meaning
   - 50-79: Some meaning lost
   - 0-49: Significant errors (wrong meaning, AI hallucination, explanation instead of translation)

2. FLUENCY: Does it read naturally in the target language?
   - 100: Native-level, perfect grammar
   - 80-99: Minor issues, still natural
   - 50-79: Awkward phrasing
   - 0-49: Hard to understand

3. TERMINOLOGY: Are domain terms translated correctly?
   - 100: All terms correct
   - 80-99: Minor inconsistencies
   - 50-79: Some wrong terms
   - 0-49: Major term errors

IMPORTANT: If the target looks like an AI response/explanation rather than a translation (contains questions, clarification requests, or is much longer than expected), score ACCURACY as 0.

When <related_keys> are provided, use them to inform your evaluation:
- NEARBY keys: Adjacent UI elements in the same code location - match tone/formality
- KEY_PATTERN keys: Same feature area (e.g., form.*, button.*) - match terminology
- SAME_COMPONENT keys: Same React component - ensure UI consistency
- SAME_FILE keys: Same source file - maintain style
- SEMANTIC keys: Similar text content - check for translation consistency
- Prioritize high-confidence (>0.8) and approved="true" translations as authoritative

Return ONLY valid JSON in this exact format:
{"accuracy":N,"fluency":N,"terminology":N,"issues":[{"type":"accuracy|fluency|terminology","severity":"critical|major|minor","message":"..."}]}

If no issues found, return empty issues array: {"accuracy":N,"fluency":N,"terminology":N,"issues":[]}`;

/**
 * MQM system prompt for multi-language batch evaluation.
 *
 * Emphasizes consistent scoring across languages to prevent
 * bias where one language is scored harsher than others.
 */
export const MQM_MULTI_LANGUAGE_SYSTEM_PROMPT = `You are an MQM (Multidimensional Quality Metrics) translation quality evaluator.

CRITICAL: You are evaluating ALL translations for a single key. Apply CONSISTENT scoring across languages:
- Same issues MUST have the same severity in all languages
- Compare translations relative to each other for fair calibration
- Do not be harsh on one language and lenient on another

Score each dimension 0-100:

1. ACCURACY: Does the translation preserve the original meaning?
   - 100: Perfect semantic fidelity
   - 80-99: Minor omissions that don't affect meaning
   - 50-79: Some meaning lost
   - 0-49: Significant errors (wrong meaning, AI hallucination, explanation instead of translation)

2. FLUENCY: Does it read naturally in the target language?
   - 100: Native-level, perfect grammar
   - 80-99: Minor issues, still natural
   - 50-79: Awkward phrasing
   - 0-49: Hard to understand

3. TERMINOLOGY: Are domain terms translated correctly?
   - 100: All terms correct
   - 80-99: Minor inconsistencies
   - 50-79: Some wrong terms
   - 0-49: Major term errors

IMPORTANT: If any translation looks like an AI response/explanation rather than a translation (contains questions, clarification requests, or is much longer than expected), score its ACCURACY as 0.

When <related_keys> are provided, use them to inform your evaluation:
- NEARBY keys: Adjacent UI elements in the same code location - match tone/formality
- KEY_PATTERN keys: Same feature area (e.g., form.*, button.*) - match terminology
- SAME_COMPONENT keys: Same React component - ensure UI consistency
- SAME_FILE keys: Same source file - maintain style
- SEMANTIC keys: Similar text content - check for translation consistency
- Prioritize high-confidence (>0.8) and approved="true" translations as authoritative

Return ONLY valid JSON in this EXACT format:
{
  "evaluations": {
    "LANG_CODE": {
      "accuracy": N,
      "fluency": N,
      "terminology": N,
      "issues": [
        { "type": "accuracy", "severity": "major", "message": "Description of issue" }
      ]
    }
  }
}

ISSUE OBJECT FORMAT (MUST follow exactly):
- type: ONLY "accuracy", "fluency", or "terminology" (lowercase, no other values)
- severity: ONLY "critical", "major", or "minor" (lowercase, no other values)
- message: string describing the specific issue

If no issues for a language, use empty array: "issues": []
Each language code must match exactly what was provided in the request.`;

// ============================================
// XML Escaping
// ============================================

/**
 * Escape XML special characters and invalid control characters.
 *
 * Handles:
 * - Standard XML entities (&, <, >, ", ')
 * - Control characters (ASCII 0-31 except tab, newline, carriage return)
 * - CDATA end sequence (]]>)
 * - Invalid Unicode surrogate pairs
 *
 * @param text - Raw text to escape
 * @returns XML-safe escaped string
 *
 * @example
 * escapeXml('Hello & <World>') // 'Hello &amp; &lt;World&gt;'
 * escapeXml('Tab\tand\nnewline') // 'Tab\tand\nnewline' (preserved)
 */
export function escapeXml(text: string): string {
  // First, remove or replace invalid control characters (except tab, LF, CR)
  // Valid XML characters: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD]
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Remove unpaired surrogates (invalid in XML)
  sanitized = sanitized.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    ''
  );

  // Escape XML special characters
  return (
    sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      // Escape CDATA end sequence (]]>) by breaking it up
      .replace(/\]\]>/g, ']]&gt;')
  );
}

// ============================================
// User Prompt Builders (Dynamic Content)
// ============================================

/**
 * Related key with single language translation (for single-language evaluation)
 */
export interface RelatedKeySingle {
  key: string;
  source: string;
  target: string;
  relationshipType?: 'NEARBY' | 'KEY_PATTERN' | 'SAME_COMPONENT' | 'SAME_FILE' | 'SEMANTIC';
  confidence?: number;
  isApproved?: boolean;
}

/**
 * Build MQM user prompt for single-language evaluation.
 *
 * Contains dynamic content only:
 * - Key name
 * - Source text
 * - Target text
 * - Related keys for context (with optional relationship metadata)
 *
 * @param keyName - Translation key identifier
 * @param source - Source language text
 * @param target - Target language text (translation)
 * @param sourceLocale - Source language code (e.g., 'en')
 * @param targetLocale - Target language code (e.g., 'de')
 * @param relatedKeys - Optional nearby translations for context
 * @returns Formatted user prompt
 */
export function buildMQMUserPrompt(
  keyName: string,
  source: string,
  target: string,
  sourceLocale: string,
  targetLocale: string,
  relatedKeys: RelatedKeySingle[] = []
): string {
  let prompt = `Key: ${keyName}
Source (${sourceLocale}): "${source}"
Target (${targetLocale}): "${target}"`;

  // Add related keys context if available (XML format for structured context)
  if (relatedKeys.length > 0) {
    prompt += `

<related_keys>
${relatedKeys
  .map((r) => {
    const typeAttr = r.relationshipType ? ` type="${r.relationshipType}"` : '';
    const confAttr = r.confidence !== undefined ? ` confidence="${r.confidence.toFixed(2)}"` : '';
    const approvedAttr = r.isApproved ? ' approved="true"' : '';
    return `  <related_key name="${escapeXml(r.key)}"${typeAttr}${confAttr}${approvedAttr}>
    <source lang="${sourceLocale}">${escapeXml(r.source)}</source>
    <target lang="${targetLocale}">${escapeXml(r.target)}</target>
  </related_key>`;
  })
  .join('\n')}
</related_keys>`;
  }

  return prompt;
}

/**
 * Related key with translations for multiple languages
 */
export interface RelatedKeyMultiLang {
  keyName: string;
  source: string;
  translations: Record<string, string>;
  relationshipType?: 'NEARBY' | 'KEY_PATTERN' | 'SAME_COMPONENT' | 'SAME_FILE' | 'SEMANTIC';
  confidence?: number;
  isApproved?: boolean;
}

/**
 * Build multi-language XML prompt for batch evaluation.
 *
 * Uses XML structure for clear separation of:
 * - Key name
 * - Source text
 * - All target translations
 * - Related keys with all language translations
 *
 * @param keyName - Translation key identifier
 * @param sourceText - Source language text
 * @param sourceLocale - Source language code
 * @param translations - Array of target translations
 * @param relatedKeys - Optional related keys with multi-language context
 * @returns Formatted XML prompt
 *
 * @example
 * buildMultiLanguagePrompt('greeting', 'Hello', 'en', [
 *   { language: 'de', value: 'Hallo' },
 *   { language: 'fr', value: 'Bonjour' }
 * ], []);
 * // Returns XML structure with key, source, and translations
 */
export function buildMultiLanguagePrompt(
  keyName: string,
  sourceText: string,
  sourceLocale: string,
  translations: Array<{ language: string; value: string }>,
  relatedKeys: RelatedKeyMultiLang[]
): string {
  const langs = translations.map((t) => t.language);

  let xml = `<evaluation_request>
  <key>${escapeXml(keyName)}</key>
  <source lang="${sourceLocale}">${escapeXml(sourceText)}</source>

  <translations>
${translations.map((t) => `    <translation lang="${t.language}">${escapeXml(t.value)}</translation>`).join('\n')}
  </translations>`;

  if (relatedKeys.length > 0) {
    xml += `

  <related_keys>
${relatedKeys
  .map((rk) => {
    const typeAttr = rk.relationshipType ? ` type="${rk.relationshipType}"` : '';
    const confAttr = rk.confidence !== undefined ? ` confidence="${rk.confidence.toFixed(2)}"` : '';
    const approvedAttr = rk.isApproved ? ' approved="true"' : '';
    return `    <related_key name="${escapeXml(rk.keyName)}"${typeAttr}${confAttr}${approvedAttr}>
      <source lang="${sourceLocale}">${escapeXml(rk.source)}</source>
${langs
  .filter((l) => rk.translations[l])
  .map((l) => `      <translation lang="${l}">${escapeXml(rk.translations[l])}</translation>`)
  .join('\n')}
    </related_key>`;
  })
  .join('\n')}
  </related_keys>`;
  }

  xml += `
</evaluation_request>`;

  return xml;
}
