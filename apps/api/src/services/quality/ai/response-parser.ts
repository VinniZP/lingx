/**
 * AI Response Parser
 *
 * Extracts and validates JSON responses from AI models.
 * Handles markdown code blocks, Zod validation, and error formatting.
 */

import { z } from 'zod';

// ============================================
// Types
// ============================================

/**
 * MQM issue from AI evaluation
 */
export interface MQMIssue {
  type: 'accuracy' | 'fluency' | 'terminology';
  severity: 'critical' | 'major' | 'minor';
  message: string;
}

/**
 * MQM evaluation result from AI
 */
export interface MQMResult {
  accuracy: number;
  fluency: number;
  terminology: number;
  issues: MQMIssue[];
}

// ============================================
// Zod Schemas
// ============================================

/**
 * Zod schema for a single language evaluation
 */
export const languageEvaluationSchema = z.object({
  accuracy: z.number().min(0).max(100),
  fluency: z.number().min(0).max(100),
  terminology: z.number().min(0).max(100),
  issues: z
    .array(
      z.object({
        type: z.enum(['accuracy', 'fluency', 'terminology']),
        severity: z.enum(['critical', 'major', 'minor']),
        message: z.string(),
      })
    )
    .default([]),
});

/**
 * Type inferred from language evaluation schema
 */
export type LanguageEvaluation = z.infer<typeof languageEvaluationSchema>;

/**
 * Create dynamic Zod schema for multi-language response
 *
 * @param languages - List of language codes to include (must be non-empty)
 * @returns Zod schema for validating multi-language AI response
 * @throws Error if languages array is empty
 */
export function createMultiLanguageSchema(languages: string[]) {
  if (!languages || languages.length === 0) {
    throw new Error('Languages array must not be empty');
  }

  return z.object({
    evaluations: z.object(
      Object.fromEntries(languages.map((lang) => [lang, languageEvaluationSchema]))
    ) as z.ZodObject<Record<string, typeof languageEvaluationSchema>>,
  });
}

/**
 * Type for multi-language evaluation result
 */
export type MultiLanguageEvaluationResult = z.infer<ReturnType<typeof createMultiLanguageSchema>>;

// ============================================
// JSON Extraction
// ============================================

/**
 * Extract JSON object from AI response text.
 *
 * Handles:
 * - Plain JSON responses
 * - Markdown code blocks (```json ... ```)
 * - Text before/after JSON
 *
 * @param text - Raw AI response text
 * @returns Extracted JSON string
 * @throws Error if no JSON object found
 *
 * @example
 * extractJsonFromText('{"accuracy": 95}') // '{"accuracy": 95}'
 * extractJsonFromText('```json\n{"accuracy": 95}\n```') // '{"accuracy": 95}'
 * extractJsonFromText('Here is the result: {"accuracy": 95}') // '{"accuracy": 95}'
 */
export function extractJsonFromText(text: string): string {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }
  return jsonMatch[0];
}

// ============================================
// MQM Parsing
// ============================================

/**
 * Parse and validate MQM response from AI.
 *
 * Performs manual validation for single-language MQM responses:
 * - Validates accuracy, fluency, terminology are numbers 0-100
 * - Validates issues array structure
 * - Filters malformed issues
 *
 * @param text - Raw AI response text
 * @returns Validated MQM result
 * @throws Error if JSON invalid or MQM structure invalid
 *
 * @example
 * const result = parseMQMResponse('{"accuracy":95,"fluency":90,"terminology":85,"issues":[]}');
 * // { accuracy: 95, fluency: 90, terminology: 85, issues: [] }
 */
export function parseMQMResponse(text: string): MQMResult {
  const jsonString = extractJsonFromText(text);
  const parsed = JSON.parse(jsonString);
  return validateMQMResponse(parsed);
}

/**
 * Validate MQM response structure.
 *
 * @param obj - Parsed JSON object
 * @returns Validated MQM result
 * @throws Error if validation fails
 */
export function validateMQMResponse(obj: unknown): MQMResult {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Invalid MQM response: not an object');
  }

  const { accuracy, fluency, terminology, issues } = obj as Record<string, unknown>;

  if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 100) {
    throw new Error(`Invalid accuracy score: ${accuracy}`);
  }
  if (typeof fluency !== 'number' || fluency < 0 || fluency > 100) {
    throw new Error(`Invalid fluency score: ${fluency}`);
  }
  if (typeof terminology !== 'number' || terminology < 0 || terminology > 100) {
    throw new Error(`Invalid terminology score: ${terminology}`);
  }

  // Validate issues array if present (filter malformed entries)
  const validatedIssues: MQMIssue[] = [];
  if (Array.isArray(issues)) {
    for (const issue of issues) {
      if (
        typeof issue === 'object' &&
        issue !== null &&
        typeof issue.type === 'string' &&
        typeof issue.severity === 'string' &&
        typeof issue.message === 'string'
      ) {
        validatedIssues.push({
          type: issue.type as MQMIssue['type'],
          severity: issue.severity as MQMIssue['severity'],
          message: issue.message,
        });
      }
    }
  }

  return { accuracy, fluency, terminology, issues: validatedIssues };
}

// ============================================
// Zod-Based Parsing
// ============================================

/**
 * Parse AI response text with Zod schema validation.
 *
 * @param text - Raw AI response text
 * @param schema - Zod schema to validate against
 * @returns Validated result matching schema type
 * @throws Error if JSON extraction fails
 * @throws ZodError if validation fails
 *
 * @example
 * const schema = z.object({ score: z.number() });
 * const result = parseWithZodSchema('{"score": 95}', schema);
 * // { score: 95 }
 */
export function parseWithZodSchema<T>(text: string, schema: z.ZodType<T>): T {
  const jsonString = extractJsonFromText(text);
  const parsed = JSON.parse(jsonString);
  return schema.parse(parsed);
}

// ============================================
// Error Formatting
// ============================================

/**
 * Format parse error for AI feedback.
 *
 * Creates human-readable error messages that can be sent back to the AI
 * to help it correct its response format.
 *
 * @param error - Error from parsing attempt
 * @returns Formatted error message
 *
 * @example
 * try {
 *   parseWithZodSchema(text, schema);
 * } catch (error) {
 *   const message = formatParseError(error);
 *   // "Path: accuracy, Error: Expected number, received string"
 * }
 */
export function formatParseError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((e) => `Path: ${e.path.join('.')}, Error: ${e.message}`).join('\n');
  }
  if (error instanceof SyntaxError) {
    return `JSON syntax error: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Check if an error is a JSON syntax error
 */
export function isJsonSyntaxError(error: unknown): error is SyntaxError {
  return error instanceof SyntaxError;
}

/**
 * Check if an error is a Zod validation error
 */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}
