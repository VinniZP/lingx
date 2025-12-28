export interface FormatterOptions {
  nested: boolean;
  indentation: number;
}

export interface Formatter {
  format(translations: Record<string, string>): string;
  parse(content: string): Record<string, string>;
  extension: string;
}

import { JsonFormatter } from './json.js';
import { YamlFormatter } from './yaml.js';

export function createFormatter(type: 'json' | 'yaml', options: FormatterOptions): Formatter {
  switch (type) {
    case 'json':
      return new JsonFormatter(options);
    case 'yaml':
      return new YamlFormatter(options);
    default:
      throw new Error(`Unknown formatter type: ${type}`);
  }
}

export { JsonFormatter } from './json.js';
export { YamlFormatter } from './yaml.js';
