import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../../lib/config.js';
import { validateIcuMessage } from '../../lib/validator/icu-validator.js';
import { parseNamespacedKey } from '@lingx/shared';
import { readAllTranslations } from '../utils.js';

/**
 * Helper to create a JSON result for MCP tools.
 */
function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Suggest a key name based on the translation value.
 */
function suggestKeyName(value: string, context?: string): string[] {
  const suggestions: string[] = [];

  // Clean the value
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  // Split into words
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return ['generic.text'];
  }

  // Take first 3-4 significant words
  const significantWords = words
    .filter((w) => !['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'for', 'of', 'in', 'on', 'at'].includes(w))
    .slice(0, 4);

  // CamelCase suggestion
  const camelCase = significantWords
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');

  // Dot notation suggestion
  const dotNotation = significantWords.join('.');

  // Snake case suggestion
  const snakeCase = significantWords.join('_');

  // Add context prefix if provided
  if (context) {
    const contextPrefix = context.toLowerCase().replace(/[^a-z0-9]/g, '');
    suggestions.push(`${contextPrefix}.${camelCase}`);
    suggestions.push(`${contextPrefix}.${dotNotation}`);
  }

  suggestions.push(camelCase);
  suggestions.push(dotNotation);
  suggestions.push(snakeCase);

  // Filter out duplicates and empty strings
  return [...new Set(suggestions)].filter((s) => s.length > 0);
}

/**
 * Analyze differences between two translation values.
 */
function analyzeValueDifferences(local: string, remote: string): string[] {
  const changes: string[] = [];

  // Check length difference
  const lengthDiff = Math.abs(local.length - remote.length);
  if (lengthDiff > 20) {
    changes.push(`Significant length difference (${lengthDiff} characters)`);
  }

  // Check for placeholder differences
  const localPlaceholders = (local.match(/\{[^}]+\}/g) ?? []).sort();
  const remotePlaceholders = (remote.match(/\{[^}]+\}/g) ?? []).sort();

  if (JSON.stringify(localPlaceholders) !== JSON.stringify(remotePlaceholders)) {
    changes.push('Placeholder differences detected');
  }

  // Check for punctuation differences
  const localEnding = local.slice(-1);
  const remoteEnding = remote.slice(-1);
  if (localEnding !== remoteEnding && /[.!?]/.test(localEnding + remoteEnding)) {
    changes.push('Punctuation ending differs');
  }

  // Check for case changes
  if (local.toLowerCase() === remote.toLowerCase() && local !== remote) {
    changes.push('Only capitalization differs');
  }

  // Check for whitespace changes
  if (local.trim() === remote.trim() && local !== remote) {
    changes.push('Only whitespace differs');
  }

  return changes;
}

/**
 * Register AI assistance tools: analyze conflicts, suggest keys, check quality, validate ICU.
 */
export function registerAiTools(server: McpServer): void {
  const cwd = process.cwd();

  // lingx_analyze_conflict - Get AI-friendly analysis of a translation conflict
  server.tool(
    'lingx_analyze_conflict',
    'Analyze a translation conflict and provide resolution guidance. Use when sync or push reports conflicts.',
    {
      key: z.string().describe('The translation key'),
      localValue: z.string().describe('Local translation value'),
      remoteValue: z.string().describe('Remote translation value'),
      language: z.string().describe('Language code'),
      context: z.string().optional().describe('Additional context about the change'),
    },
    async (args) => {
      const localChanges = analyzeValueDifferences(args.localValue, args.remoteValue);
      const remoteChanges = analyzeValueDifferences(args.remoteValue, args.localValue);

      // Determine recommendation
      let recommendation: 'use_local' | 'use_remote' | 'merge' | 'needs_review' = 'needs_review';
      let reasoning = '';

      // If only whitespace differs, prefer the one without leading/trailing whitespace
      if (localChanges.includes('Only whitespace differs')) {
        if (args.localValue.trim() === args.localValue) {
          recommendation = 'use_local';
          reasoning = 'Local value has proper whitespace formatting';
        } else {
          recommendation = 'use_remote';
          reasoning = 'Remote value has proper whitespace formatting';
        }
      }
      // If only capitalization differs, this needs human review
      else if (localChanges.includes('Only capitalization differs')) {
        recommendation = 'needs_review';
        reasoning = 'Values differ only in capitalization - verify intended casing';
      }
      // If placeholders differ, this is critical
      else if (localChanges.includes('Placeholder differences detected')) {
        recommendation = 'needs_review';
        reasoning = 'Placeholder mismatch detected - verify all variables are correct';
      }
      // If one is significantly longer, prefer the longer one (more complete)
      else if (localChanges.includes('Significant length difference')) {
        if (args.localValue.length > args.remoteValue.length) {
          recommendation = 'use_local';
          reasoning = 'Local value appears more complete (longer)';
        } else {
          recommendation = 'use_remote';
          reasoning = 'Remote value appears more complete (longer)';
        }
      }
      // If context is provided and mentions "fix" or "update", prefer local
      else if (args.context?.toLowerCase().includes('fix') || args.context?.toLowerCase().includes('update')) {
        recommendation = 'use_local';
        reasoning = 'Context suggests local is a fix or update';
      }

      // Try to suggest a merge if values can be combined
      let suggestedMerge: string | undefined;
      if (recommendation === 'needs_review') {
        // Simple merge suggestion: prefer local unless remote has more placeholders
        const localPlaceholders = (args.localValue.match(/\{[^}]+\}/g) ?? []);
        const remotePlaceholders = (args.remoteValue.match(/\{[^}]+\}/g) ?? []);

        if (remotePlaceholders.length > localPlaceholders.length) {
          suggestedMerge = args.remoteValue;
        } else {
          suggestedMerge = args.localValue;
        }
      }

      return jsonResult({
        analysis: {
          key: args.key,
          language: args.language,
          localValue: args.localValue,
          remoteValue: args.remoteValue,
          localChanges,
          remoteChanges,
          recommendation,
          reasoning: reasoning || 'Manual review recommended for this conflict',
          suggestedMerge,
        },
      });
    }
  );

  // lingx_suggest_key_name - Suggest a key name based on the translation value
  server.tool(
    'lingx_suggest_key_name',
    'Suggest a translation key name based on the English value. Follows project naming conventions.',
    {
      value: z.string().describe('The English translation value'),
      context: z.string().optional().describe('Where this translation is used (e.g., "login button")'),
      namespace: z.string().optional().describe('Target namespace'),
    },
    async (args) => {
      try {
        const config = await loadConfig(cwd);

        // Generate suggestions
        const suggestions = suggestKeyName(args.value, args.context);

        // Add namespace prefix if specified
        const namespacedSuggestions = args.namespace
          ? suggestions.map((s) => ({ key: `${args.namespace}:${s}`, rationale: `With namespace "${args.namespace}"` }))
          : suggestions.map((s) => ({ key: s, rationale: 'Standard naming convention' }));

        // Check for existing similar keys
        const translations = await readAllTranslations(cwd);
        const sourceLocale = config.types?.sourceLocale ?? 'en';
        const existingKeys = Object.keys(translations[sourceLocale] ?? {});

        // Find existing keys that might conflict
        const existingSimilar = existingKeys.filter((key) => {
          const { namespace, key: k } = parseNamespacedKey(key);
          const displayKey = namespace ? `${namespace}:${k}` : k;
          return suggestions.some((s) =>
            displayKey.toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes(displayKey.toLowerCase())
          );
        });

        return jsonResult({
          suggestions: namespacedSuggestions.slice(0, 5),
          existingSimilar: existingSimilar.slice(0, 5),
          recommendation: namespacedSuggestions[0]?.key ?? suggestions[0],
        });
      } catch (error) {
        return jsonResult({
          suggestions: suggestKeyName(args.value, args.context).map((s) => ({
            key: args.namespace ? `${args.namespace}:${s}` : s,
            rationale: 'Generated suggestion',
          })),
          existingSimilar: [],
          recommendation: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // lingx_check_quality_issues - Analyze quality issues and suggest fixes
  server.tool(
    'lingx_check_quality_issues',
    'Get detailed analysis of quality issues from check command and suggested fixes.',
    {
      key: z.string().describe('The translation key'),
      sourceValue: z.string().describe('Source (original) translation value'),
      targetValue: z.string().describe('Target (translated) translation value'),
      sourceLanguage: z.string().describe('Source language code'),
      targetLanguage: z.string().describe('Target language code'),
    },
    async (args) => {
      const issues: Array<{
        type: string;
        severity: 'error' | 'warning';
        description: string;
        suggestedFix: string;
      }> = [];

      // Check for placeholder mismatches
      const sourcePlaceholders: string[] = (args.sourceValue.match(/\{[^}]+\}/g) ?? []).sort();
      const targetPlaceholders: string[] = (args.targetValue.match(/\{[^}]+\}/g) ?? []).sort();

      const missingPlaceholders = sourcePlaceholders.filter((p) => !targetPlaceholders.includes(p));
      const extraPlaceholders = targetPlaceholders.filter((p) => !sourcePlaceholders.includes(p));

      if (missingPlaceholders.length > 0) {
        issues.push({
          type: 'missing_placeholder',
          severity: 'error',
          description: `Missing placeholders: ${missingPlaceholders.join(', ')}`,
          suggestedFix: `Add the missing placeholders to the translation: ${missingPlaceholders.join(', ')}`,
        });
      }

      if (extraPlaceholders.length > 0) {
        issues.push({
          type: 'extra_placeholder',
          severity: 'warning',
          description: `Extra placeholders not in source: ${extraPlaceholders.join(', ')}`,
          suggestedFix: `Verify these placeholders are intentional or remove them: ${extraPlaceholders.join(', ')}`,
        });
      }

      // Check for whitespace issues
      if (args.sourceValue.trim() === args.sourceValue && args.targetValue !== args.targetValue.trim()) {
        issues.push({
          type: 'whitespace',
          severity: 'warning',
          description: 'Translation has leading or trailing whitespace that source does not have',
          suggestedFix: `Remove whitespace: "${args.targetValue.trim()}"`,
        });
      }

      // Check for punctuation consistency
      const sourceEnding = args.sourceValue.match(/[.!?:;,]$/)?.[0];
      const targetEnding = args.targetValue.match(/[.!?:;,]$/)?.[0];

      if (sourceEnding && !targetEnding) {
        issues.push({
          type: 'punctuation',
          severity: 'warning',
          description: `Source ends with "${sourceEnding}" but translation does not`,
          suggestedFix: `Add "${sourceEnding}" to the end of the translation`,
        });
      } else if (!sourceEnding && targetEnding) {
        issues.push({
          type: 'punctuation',
          severity: 'warning',
          description: `Translation ends with "${targetEnding}" but source does not`,
          suggestedFix: `Consider removing "${targetEnding}" from the end of the translation`,
        });
      }

      // Check for length anomalies
      const lengthRatio = args.targetValue.length / args.sourceValue.length;
      if (lengthRatio < 0.5) {
        issues.push({
          type: 'length',
          severity: 'warning',
          description: 'Translation is less than 50% of source length',
          suggestedFix: 'Verify the translation is complete and not truncated',
        });
      } else if (lengthRatio > 3) {
        issues.push({
          type: 'length',
          severity: 'warning',
          description: 'Translation is more than 3x the source length',
          suggestedFix: 'Consider if the translation can be more concise',
        });
      }

      return jsonResult({
        key: args.key,
        sourceLanguage: args.sourceLanguage,
        targetLanguage: args.targetLanguage,
        issues,
        hasErrors: issues.some((i) => i.severity === 'error'),
        hasWarnings: issues.some((i) => i.severity === 'warning'),
      });
    }
  );

  // lingx_validate_icu - Validate ICU MessageFormat syntax with suggestions
  server.tool(
    'lingx_validate_icu',
    'Validate ICU MessageFormat syntax and suggest corrections.',
    {
      value: z.string().describe('The translation value to validate'),
      language: z.string().optional().describe('Language code (for plural rules)'),
    },
    async (args) => {
      const validation = validateIcuMessage(args.value);

      // Extract variables from the value
      const variableMatches = args.value.match(/\{([^,}]+)/g) ?? [];
      const variables = variableMatches.map((m) => m.slice(1).trim());
      const uniqueVariables = [...new Set(variables)];

      // Detect patterns
      const patterns: string[] = [];
      if (/\{[^}]+,\s*plural\s*,/.test(args.value)) patterns.push('plural');
      if (/\{[^}]+,\s*select\s*,/.test(args.value)) patterns.push('select');
      if (/\{[^}]+,\s*selectordinal\s*,/.test(args.value)) patterns.push('selectordinal');
      if (/\{[^}]+,\s*date\s*[,}]/.test(args.value)) patterns.push('date');
      if (/\{[^}]+,\s*time\s*[,}]/.test(args.value)) patterns.push('time');
      if (/\{[^}]+,\s*number\s*[,}]/.test(args.value)) patterns.push('number');

      const errors = validation.errors.map((e) => ({
        position: e.location?.offset ?? 0,
        message: e.message,
        suggestion: getSuggestionForIcuError(e.message, args.value),
      }));

      return jsonResult({
        valid: validation.isValid,
        errors,
        detectedPatterns: patterns,
        variables: uniqueVariables,
        tips: getIcuTips(patterns, uniqueVariables),
      });
    }
  );
}

/**
 * Get suggestion for an ICU error message.
 */
function getSuggestionForIcuError(errorMessage: string, _value: string): string {
  if (errorMessage.includes('Expected')) {
    return 'Check for missing closing braces or commas in the ICU syntax';
  }
  if (errorMessage.includes('plural') || errorMessage.includes('select')) {
    return 'Ensure plural/select has proper format: {var, plural, one {text} other {text}}';
  }
  if (errorMessage.includes('Unmatched')) {
    return 'Check for unbalanced braces {}';
  }
  return 'Review ICU MessageFormat syntax documentation';
}

/**
 * Get tips for working with ICU patterns.
 */
function getIcuTips(patterns: string[], variables: string[]): string[] {
  const tips: string[] = [];

  if (patterns.includes('plural')) {
    tips.push('For plural: use "one" for singular, "other" for plural. Some languages need "zero", "two", "few", "many"');
  }
  if (patterns.includes('select')) {
    tips.push('For select: list all possible values and include "other" as fallback');
  }
  if (patterns.includes('date') || patterns.includes('time')) {
    tips.push('Date/time formats: use "short", "medium", "long", "full" or custom skeleton');
  }
  if (patterns.includes('number')) {
    tips.push('Number formats: use "percent", "currency", or custom pattern like "#,##0.00"');
  }
  if (variables.length > 3) {
    tips.push('Consider splitting complex messages with many variables into simpler keys');
  }

  return tips;
}
