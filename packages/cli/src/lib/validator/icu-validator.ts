import { parse as parseIcu, TYPE } from '@formatjs/icu-messageformat-parser';

/**
 * Represents an error found during ICU message validation.
 */
export interface IcuValidationError {
  message: string;
  location?: {
    offset: number;
    line: number;
    column: number;
  };
}

/**
 * Result of validating an ICU MessageFormat message.
 */
export interface IcuValidationResult {
  isValid: boolean;
  errors: IcuValidationError[];
  variables: string[];
  patterns: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Validates an ICU MessageFormat message and extracts metadata.
 *
 * @param message - The ICU message string to validate
 * @returns Validation result with errors, variables, patterns, and complexity
 */
export function validateIcuMessage(message: string): IcuValidationResult {
  const variables: Set<string> = new Set();
  const patterns: Set<string> = new Set();
  const errors: IcuValidationError[] = [];

  try {
    const ast = parseIcu(message);

    function traverse(nodes: typeof ast): void {
      for (const node of nodes) {
        switch (node.type) {
          case TYPE.argument:
            variables.add(node.value);
            break;

          case TYPE.plural:
            variables.add(node.value);
            patterns.add('plural');
            for (const option of Object.values(node.options)) {
              traverse(option.value);
            }
            break;

          case TYPE.select:
            variables.add(node.value);
            patterns.add('select');
            for (const option of Object.values(node.options)) {
              traverse(option.value);
            }
            break;

          case TYPE.number:
            variables.add(node.value);
            patterns.add('number');
            break;

          case TYPE.date:
            variables.add(node.value);
            patterns.add('date');
            break;

          case TYPE.time:
            variables.add(node.value);
            patterns.add('time');
            break;

          case TYPE.tag:
            patterns.add('tag');
            if (node.children) {
              traverse(node.children);
            }
            break;

          case TYPE.pound:
            // # placeholder in plural/selectordinal - no variable to extract
            break;

          case TYPE.literal:
            // Plain text, no variables to extract
            break;
        }
      }
    }

    traverse(ast);

    // Determine complexity based on patterns and variables
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (patterns.size >= 2 || variables.size >= 3) {
      complexity = 'complex';
    } else if (patterns.size === 1 || variables.size >= 1) {
      complexity = 'moderate';
    }

    return {
      isValid: true,
      errors: [],
      variables: Array.from(variables),
      patterns: Array.from(patterns),
      complexity,
    };
  } catch (error) {
    // Parse error - extract useful information
    const errorMessage = error instanceof Error ? error.message : 'Unknown parse error';

    // Try to extract location from error message
    const locationMatch = errorMessage.match(/at position (\d+)/);
    const location = locationMatch
      ? {
          offset: parseInt(locationMatch[1], 10),
          line: 1,
          column: parseInt(locationMatch[1], 10),
        }
      : undefined;

    errors.push({
      message: errorMessage,
      location,
    });

    return {
      isValid: false,
      errors,
      variables: [],
      patterns: [],
      complexity: 'simple',
    };
  }
}

/**
 * Validates a batch of translations and returns results for each key.
 *
 * @param translations - Object mapping translation keys to their values
 * @returns Map of key to validation result
 */
export function validateTranslations(
  translations: Record<string, string>
): Map<string, IcuValidationResult> {
  const results = new Map<string, IcuValidationResult>();

  for (const [key, value] of Object.entries(translations)) {
    results.set(key, validateIcuMessage(value));
  }

  return results;
}

/**
 * Summarizes validation results for reporting.
 *
 * @param results - Map of key to validation result
 * @returns Summary with counts and error details
 */
export function summarizeValidation(
  results: Map<string, IcuValidationResult>
): {
  total: number;
  valid: number;
  invalid: number;
  errors: Array<{ key: string; errors: IcuValidationError[] }>;
} {
  let valid = 0;
  let invalid = 0;
  const errors: Array<{ key: string; errors: IcuValidationError[] }> = [];

  for (const [key, result] of results) {
    if (result.isValid) {
      valid++;
    } else {
      invalid++;
      errors.push({ key, errors: result.errors });
    }
  }

  return {
    total: results.size,
    valid,
    invalid,
    errors,
  };
}
