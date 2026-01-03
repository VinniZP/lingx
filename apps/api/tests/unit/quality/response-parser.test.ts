/**
 * Response Parser Unit Tests
 *
 * Tests JSON extraction, MQM validation, Zod parsing, and error formatting.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  extractJsonFromText,
  parseMQMResponse,
  validateMQMResponse,
  parseWithZodSchema,
  formatParseError,
  isJsonSyntaxError,
  isZodError,
  languageEvaluationSchema,
  createMultiLanguageSchema,
  type MQMResult,
} from '../../../src/services/quality/ai/response-parser.js';

// ============================================
// extractJsonFromText
// ============================================

describe('extractJsonFromText', () => {
  it('should extract plain JSON object', () => {
    const text = '{"accuracy": 95}';
    expect(extractJsonFromText(text)).toBe('{"accuracy": 95}');
  });

  it('should extract JSON from markdown code block', () => {
    const text = '```json\n{"accuracy": 95}\n```';
    expect(extractJsonFromText(text)).toBe('{"accuracy": 95}');
  });

  it('should extract JSON from text with surrounding content', () => {
    const text = 'Here is the result: {"accuracy": 95} Hope this helps!';
    expect(extractJsonFromText(text)).toBe('{"accuracy": 95}');
  });

  it('should extract multiline JSON', () => {
    const text = `{
      "accuracy": 95,
      "fluency": 90
    }`;
    expect(extractJsonFromText(text)).toContain('"accuracy": 95');
    expect(extractJsonFromText(text)).toContain('"fluency": 90');
  });

  it('should extract nested JSON', () => {
    const text = '{"outer": {"inner": {"value": 1}}}';
    expect(extractJsonFromText(text)).toBe('{"outer": {"inner": {"value": 1}}}');
  });

  it('should extract JSON with arrays', () => {
    const text = '{"issues": [{"type": "accuracy"}]}';
    expect(extractJsonFromText(text)).toBe('{"issues": [{"type": "accuracy"}]}');
  });

  it('should throw error when no JSON found', () => {
    expect(() => extractJsonFromText('No JSON here')).toThrow('No JSON object found in response');
  });

  it('should throw error for empty string', () => {
    expect(() => extractJsonFromText('')).toThrow('No JSON object found in response');
  });

  it('should throw error for array-only response', () => {
    // Our regex specifically looks for objects, not arrays
    expect(() => extractJsonFromText('[1, 2, 3]')).toThrow('No JSON object found in response');
  });

  it('should handle JSON with escaped characters', () => {
    const text = '{"message": "Hello \\"world\\""}';
    expect(extractJsonFromText(text)).toBe('{"message": "Hello \\"world\\""}');
  });
});

// ============================================
// validateMQMResponse
// ============================================

describe('validateMQMResponse', () => {
  it('should validate correct MQM response', () => {
    const obj = {
      accuracy: 95,
      fluency: 90,
      terminology: 85,
      issues: [],
    };
    const result = validateMQMResponse(obj);
    expect(result).toEqual(obj);
  });

  it('should validate MQM response with issues', () => {
    const obj = {
      accuracy: 70,
      fluency: 80,
      terminology: 90,
      issues: [
        { type: 'accuracy', severity: 'major', message: 'Some text was lost' },
        { type: 'fluency', severity: 'minor', message: 'Awkward phrasing' },
      ],
    };
    const result = validateMQMResponse(obj);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].type).toBe('accuracy');
  });

  it('should filter malformed issues', () => {
    const obj = {
      accuracy: 90,
      fluency: 90,
      terminology: 90,
      issues: [
        { type: 'accuracy', severity: 'major', message: 'Valid issue' },
        { type: 123, severity: 'major', message: 'Invalid type' }, // Invalid - type not string
        { severity: 'major', message: 'Missing type' }, // Invalid - no type
        { type: 'fluency', message: 'Missing severity' }, // Invalid - no severity
        null, // Invalid - not an object
        'not an object', // Invalid - not an object
      ],
    };
    const result = validateMQMResponse(obj);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toBe('Valid issue');
  });

  it('should handle missing issues array', () => {
    const obj = {
      accuracy: 95,
      fluency: 90,
      terminology: 85,
    };
    const result = validateMQMResponse(obj);
    expect(result.issues).toEqual([]);
  });

  it('should throw for non-object input', () => {
    expect(() => validateMQMResponse(null)).toThrow('Invalid MQM response: not an object');
    expect(() => validateMQMResponse('string')).toThrow('Invalid MQM response: not an object');
    expect(() => validateMQMResponse(123)).toThrow('Invalid MQM response: not an object');
  });

  it('should throw for invalid accuracy', () => {
    expect(() => validateMQMResponse({ accuracy: 'not a number', fluency: 90, terminology: 85 })).toThrow(
      'Invalid accuracy score'
    );
    expect(() => validateMQMResponse({ accuracy: -1, fluency: 90, terminology: 85 })).toThrow(
      'Invalid accuracy score'
    );
    expect(() => validateMQMResponse({ accuracy: 101, fluency: 90, terminology: 85 })).toThrow(
      'Invalid accuracy score'
    );
  });

  it('should throw for invalid fluency', () => {
    expect(() => validateMQMResponse({ accuracy: 90, fluency: 'not a number', terminology: 85 })).toThrow(
      'Invalid fluency score'
    );
    expect(() => validateMQMResponse({ accuracy: 90, fluency: -5, terminology: 85 })).toThrow(
      'Invalid fluency score'
    );
  });

  it('should throw for invalid terminology', () => {
    expect(() => validateMQMResponse({ accuracy: 90, fluency: 90, terminology: 150 })).toThrow(
      'Invalid terminology score'
    );
  });

  it('should accept boundary values (0 and 100)', () => {
    const obj = { accuracy: 0, fluency: 100, terminology: 50, issues: [] };
    const result = validateMQMResponse(obj);
    expect(result.accuracy).toBe(0);
    expect(result.fluency).toBe(100);
  });
});

// ============================================
// parseMQMResponse
// ============================================

describe('parseMQMResponse', () => {
  it('should parse valid MQM JSON', () => {
    const text = '{"accuracy":95,"fluency":90,"terminology":85,"issues":[]}';
    const result = parseMQMResponse(text);
    expect(result.accuracy).toBe(95);
    expect(result.fluency).toBe(90);
    expect(result.terminology).toBe(85);
  });

  it('should parse MQM from markdown code block', () => {
    const text = '```json\n{"accuracy":95,"fluency":90,"terminology":85,"issues":[]}\n```';
    const result = parseMQMResponse(text);
    expect(result.accuracy).toBe(95);
  });

  it('should throw for invalid JSON syntax', () => {
    const text = '{"accuracy": invalid}';
    expect(() => parseMQMResponse(text)).toThrow();
  });

  it('should throw for valid JSON but invalid MQM', () => {
    const text = '{"accuracy": "ninety-five"}';
    expect(() => parseMQMResponse(text)).toThrow('Invalid accuracy score');
  });
});

// ============================================
// Zod Schemas
// ============================================

describe('languageEvaluationSchema', () => {
  it('should validate correct evaluation', () => {
    const data = {
      accuracy: 95,
      fluency: 90,
      terminology: 85,
      issues: [{ type: 'accuracy', severity: 'minor', message: 'test' }],
    };
    const result = languageEvaluationSchema.parse(data);
    expect(result.accuracy).toBe(95);
  });

  it('should default issues to empty array', () => {
    const data = { accuracy: 95, fluency: 90, terminology: 85 };
    const result = languageEvaluationSchema.parse(data);
    expect(result.issues).toEqual([]);
  });

  it('should reject score outside 0-100', () => {
    expect(() =>
      languageEvaluationSchema.parse({ accuracy: 101, fluency: 90, terminology: 85 })
    ).toThrow();
    expect(() =>
      languageEvaluationSchema.parse({ accuracy: -1, fluency: 90, terminology: 85 })
    ).toThrow();
  });

  it('should reject invalid issue type', () => {
    const data = {
      accuracy: 95,
      fluency: 90,
      terminology: 85,
      issues: [{ type: 'invalid', severity: 'minor', message: 'test' }],
    };
    expect(() => languageEvaluationSchema.parse(data)).toThrow();
  });

  it('should reject invalid issue severity', () => {
    const data = {
      accuracy: 95,
      fluency: 90,
      terminology: 85,
      issues: [{ type: 'accuracy', severity: 'invalid', message: 'test' }],
    };
    expect(() => languageEvaluationSchema.parse(data)).toThrow();
  });
});

describe('createMultiLanguageSchema', () => {
  it('should create schema for specified languages', () => {
    const schema = createMultiLanguageSchema(['en', 'de', 'fr']);
    const data = {
      evaluations: {
        en: { accuracy: 95, fluency: 90, terminology: 85, issues: [] },
        de: { accuracy: 90, fluency: 85, terminology: 80, issues: [] },
        fr: { accuracy: 88, fluency: 92, terminology: 78, issues: [] },
      },
    };
    const result = schema.parse(data);
    expect(result.evaluations.en.accuracy).toBe(95);
    expect(result.evaluations.de.accuracy).toBe(90);
    expect(result.evaluations.fr.accuracy).toBe(88);
  });

  it('should reject missing language', () => {
    const schema = createMultiLanguageSchema(['en', 'de']);
    const data = {
      evaluations: {
        en: { accuracy: 95, fluency: 90, terminology: 85, issues: [] },
        // missing 'de'
      },
    };
    expect(() => schema.parse(data)).toThrow();
  });

  it('should handle single language', () => {
    const schema = createMultiLanguageSchema(['es']);
    const data = {
      evaluations: {
        es: { accuracy: 95, fluency: 90, terminology: 85, issues: [] },
      },
    };
    const result = schema.parse(data);
    expect(result.evaluations.es.accuracy).toBe(95);
  });
});

// ============================================
// parseWithZodSchema
// ============================================

describe('parseWithZodSchema', () => {
  it('should parse and validate with custom schema', () => {
    const schema = z.object({ score: z.number(), label: z.string() });
    const text = '{"score": 95, "label": "excellent"}';
    const result = parseWithZodSchema(text, schema);
    expect(result.score).toBe(95);
    expect(result.label).toBe('excellent');
  });

  it('should handle markdown code blocks', () => {
    const schema = z.object({ value: z.number() });
    const text = '```json\n{"value": 42}\n```';
    const result = parseWithZodSchema(text, schema);
    expect(result.value).toBe(42);
  });

  it('should throw ZodError for invalid data', () => {
    const schema = z.object({ score: z.number() });
    const text = '{"score": "not a number"}';
    expect(() => parseWithZodSchema(text, schema)).toThrow(z.ZodError);
  });

  it('should throw SyntaxError for invalid JSON', () => {
    const schema = z.object({ score: z.number() });
    const text = '{"score": }';
    expect(() => parseWithZodSchema(text, schema)).toThrow(SyntaxError);
  });

  it('should work with multi-language schema', () => {
    const schema = createMultiLanguageSchema(['en', 'de']);
    const text = JSON.stringify({
      evaluations: {
        en: { accuracy: 95, fluency: 90, terminology: 85, issues: [] },
        de: { accuracy: 90, fluency: 85, terminology: 80, issues: [] },
      },
    });
    const result = parseWithZodSchema(text, schema);
    expect(result.evaluations.en.accuracy).toBe(95);
    expect(result.evaluations.de.accuracy).toBe(90);
  });
});

// ============================================
// Error Formatting
// ============================================

describe('formatParseError', () => {
  it('should format ZodError with path', () => {
    const schema = z.object({ accuracy: z.number() });
    try {
      schema.parse({ accuracy: 'not a number' });
    } catch (error) {
      const message = formatParseError(error);
      expect(message).toContain('accuracy');
      expect(message).toContain('expected number');
    }
  });

  it('should format ZodError with nested path', () => {
    const schema = z.object({ data: z.object({ value: z.number() }) });
    try {
      schema.parse({ data: { value: 'string' } });
    } catch (error) {
      const message = formatParseError(error);
      expect(message).toContain('data.value');
    }
  });

  it('should format multiple ZodError issues', () => {
    const schema = z.object({ a: z.number(), b: z.number() });
    try {
      schema.parse({ a: 'x', b: 'y' });
    } catch (error) {
      const message = formatParseError(error);
      expect(message).toContain('a');
      expect(message).toContain('b');
    }
  });

  it('should format SyntaxError', () => {
    try {
      JSON.parse('{invalid}');
    } catch (error) {
      const message = formatParseError(error);
      expect(message).toContain('JSON syntax error');
    }
  });

  it('should format generic Error', () => {
    const error = new Error('Something went wrong');
    expect(formatParseError(error)).toBe('Something went wrong');
  });

  it('should convert non-Error to string', () => {
    expect(formatParseError('string error')).toBe('string error');
    expect(formatParseError(123)).toBe('123');
    expect(formatParseError({ obj: true })).toBe('[object Object]');
  });
});

// ============================================
// Error Type Guards
// ============================================

describe('isJsonSyntaxError', () => {
  it('should return true for SyntaxError', () => {
    try {
      JSON.parse('{invalid}');
    } catch (error) {
      expect(isJsonSyntaxError(error)).toBe(true);
    }
  });

  it('should return false for other errors', () => {
    expect(isJsonSyntaxError(new Error('test'))).toBe(false);
    expect(isJsonSyntaxError(new z.ZodError([]))).toBe(false);
    expect(isJsonSyntaxError('string')).toBe(false);
  });
});

describe('isZodError', () => {
  it('should return true for ZodError', () => {
    const schema = z.number();
    try {
      schema.parse('not a number');
    } catch (error) {
      expect(isZodError(error)).toBe(true);
    }
  });

  it('should return false for other errors', () => {
    expect(isZodError(new Error('test'))).toBe(false);
    expect(isZodError(new SyntaxError('test'))).toBe(false);
    expect(isZodError('string')).toBe(false);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('integration: full parsing flow', () => {
  it('should handle realistic AI response', () => {
    const aiResponse = `Here is my evaluation:

\`\`\`json
{
  "accuracy": 92,
  "fluency": 88,
  "terminology": 95,
  "issues": [
    {
      "type": "fluency",
      "severity": "minor",
      "message": "The word order could be more natural"
    }
  ]
}
\`\`\`

I hope this helps!`;

    const result = parseMQMResponse(aiResponse);
    expect(result.accuracy).toBe(92);
    expect(result.fluency).toBe(88);
    expect(result.terminology).toBe(95);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('fluency');
  });

  it('should handle multi-language AI response', () => {
    const aiResponse = `{
      "evaluations": {
        "de": {"accuracy": 90, "fluency": 85, "terminology": 80, "issues": []},
        "fr": {"accuracy": 88, "fluency": 92, "terminology": 78, "issues": [
          {"type": "terminology", "severity": "minor", "message": "Tech term should use standard French translation"}
        ]}
      }
    }`;

    const schema = createMultiLanguageSchema(['de', 'fr']);
    const result = parseWithZodSchema(aiResponse, schema);

    expect(result.evaluations.de.accuracy).toBe(90);
    expect(result.evaluations.fr.accuracy).toBe(88);
    expect(result.evaluations.fr.issues).toHaveLength(1);
  });

  it('should provide helpful error for validation failures', () => {
    const schema = createMultiLanguageSchema(['en']);
    const badResponse = '{"evaluations": {"en": {"accuracy": "high"}}}';

    try {
      parseWithZodSchema(badResponse, schema);
      expect.fail('Should have thrown');
    } catch (error) {
      const message = formatParseError(error);
      expect(message).toContain('evaluations.en.accuracy');
      expect(message).toContain('expected number');
    }
  });
});
