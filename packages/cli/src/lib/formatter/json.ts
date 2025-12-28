import type { Formatter, FormatterOptions } from './index.js';

export class JsonFormatter implements Formatter {
  readonly extension = '.json';

  constructor(private options: FormatterOptions) {}

  format(translations: Record<string, string>): string {
    if (this.options.nested) {
      const nested = this.flatToNested(translations);
      return JSON.stringify(nested, null, this.options.indentation);
    }
    return JSON.stringify(translations, null, this.options.indentation);
  }

  parse(content: string): Record<string, string> {
    const parsed = JSON.parse(content);
    if (this.options.nested) {
      return this.nestedToFlat(parsed);
    }
    return parsed as Record<string, string>;
  }

  private flatToNested(flat: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(flat)) {
      const parts = key.split('.');
      let current: Record<string, unknown> = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      current[parts[parts.length - 1]] = value;
    }

    return result;
  }

  private nestedToFlat(nested: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(nested)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.nestedToFlat(value as Record<string, unknown>, fullKey));
      } else {
        result[fullKey] = String(value);
      }
    }

    return result;
  }
}
