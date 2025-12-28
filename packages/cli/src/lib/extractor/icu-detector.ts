import { parse as parseIcu, TYPE } from '@formatjs/icu-messageformat-parser';

export interface IcuDetectionResult {
  variables: string[];
  patterns: string[];
  isValid: boolean;
  error?: string;
}

/**
 * Detects ICU MessageFormat patterns and variables in a translation string.
 *
 * Supports detection of:
 * - Simple interpolation: {name}
 * - Plural forms: {count, plural, one {item} other {items}}
 * - Select forms: {gender, select, male {he} female {she} other {they}}
 * - Number formatting: {amount, number, currency}
 * - Date formatting: {date, date, medium}
 * - Time formatting: {time, time, short}
 */
export function detectIcuPatterns(message: string): IcuDetectionResult {
  const variables: Set<string> = new Set();
  const patterns: Set<string> = new Set();

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

    return {
      variables: Array.from(variables),
      patterns: Array.from(patterns),
      isValid: true,
    };
  } catch (error) {
    return {
      variables: [],
      patterns: [],
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown parse error',
    };
  }
}

/**
 * Quick check to see if a message contains any ICU patterns or variables.
 */
export function hasIcuPatterns(message: string): boolean {
  const result = detectIcuPatterns(message);
  return result.isValid && (result.patterns.length > 0 || result.variables.length > 0);
}
