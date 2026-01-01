import { parse as parseIcu, TYPE, MessageFormatElement } from '@formatjs/icu-messageformat-parser';

/**
 * Represents an inferred parameter type from ICU message
 */
export interface IcuParamType {
  /** Parameter name */
  name: string;
  /** TypeScript type string */
  type: 'string' | 'number' | 'Date' | 'string | number';
}

/**
 * Infers TypeScript types from ICU message parameters.
 *
 * Type inference rules:
 * - Simple interpolation {name} → string | number (could be either)
 * - Plural/selectordinal {count, plural, ...} → number
 * - Select {gender, select, ...} → string
 * - Number formatting {amount, number, ...} → number
 * - Date formatting {date, date, ...} → Date
 * - Time formatting {time, time, ...} → Date
 *
 * @param message - ICU MessageFormat string
 * @returns Array of parameter types, empty array if no params or parse error
 */
export function inferIcuParamTypes(message: string): IcuParamType[] {
  try {
    const ast = parseIcu(message);
    const params = new Map<string, IcuParamType>();

    traverseAst(ast, params);

    return Array.from(params.values());
  } catch {
    // If parsing fails, return empty array
    // This allows graceful handling of malformed ICU messages
    return [];
  }
}

/**
 * Recursively traverses ICU AST to extract parameter types
 */
function traverseAst(
  nodes: MessageFormatElement[],
  params: Map<string, IcuParamType>
): void {
  for (const node of nodes) {
    switch (node.type) {
      case TYPE.argument:
        // Simple {name} interpolation - could be string or number
        if (!params.has(node.value)) {
          params.set(node.value, { name: node.value, type: 'string | number' });
        }
        break;

      case TYPE.plural:
        // {count, plural, ...} - must be a number
        params.set(node.value, { name: node.value, type: 'number' });
        // Traverse nested content in plural options
        for (const option of Object.values(node.options)) {
          traverseAst(option.value, params);
        }
        break;

      case TYPE.select:
        // {gender, select, ...} - must be a string
        params.set(node.value, { name: node.value, type: 'string' });
        // Traverse nested content in select options
        for (const option of Object.values(node.options)) {
          traverseAst(option.value, params);
        }
        break;

      case TYPE.number:
        // {amount, number, ...} - must be a number
        params.set(node.value, { name: node.value, type: 'number' });
        break;

      case TYPE.date:
        // {date, date, ...} - must be a Date
        params.set(node.value, { name: node.value, type: 'Date' });
        break;

      case TYPE.time:
        // {time, time, ...} - must be a Date
        params.set(node.value, { name: node.value, type: 'Date' });
        break;

      case TYPE.tag:
        // HTML-like tags <b>content</b> - traverse children
        if (node.children) {
          traverseAst(node.children, params);
        }
        break;

      case TYPE.pound:
        // # placeholder in plural - no variable to extract
        break;

      case TYPE.literal:
        // Plain text - no variables
        break;
    }
  }
}

/**
 * Quick check to see if a message has any ICU parameters
 */
export function hasIcuParams(message: string): boolean {
  return inferIcuParamTypes(message).length > 0;
}

/**
 * Generates a TypeScript object type string from parameter types
 *
 * @example
 * // Input: [{ name: 'count', type: 'number' }, { name: 'name', type: 'string | number' }]
 * // Output: '{ count: number; name: string | number }'
 */
export function generateParamsTypeString(params: IcuParamType[]): string | null {
  if (params.length === 0) {
    return null;
  }

  const properties = params
    .map((p) => `${p.name}: ${p.type}`)
    .join('; ');

  return `{ ${properties} }`;
}
