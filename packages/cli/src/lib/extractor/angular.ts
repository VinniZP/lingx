import type { ExtractorOptions, Extractor, ExtractedKey } from './index.js';

/**
 * Angular extractor - basic implementation using regex patterns.
 *
 * This is a simplified extractor that uses regex patterns rather than full AST parsing.
 * A complete implementation would use Angular's template compiler for better accuracy.
 *
 * Supports:
 * - Template pipe syntax: {{ 'key' | translate }}
 * - TranslateService calls: this.translate.instant('key'), .get('key'), .translate('key')
 */
export class AngularExtractor implements Extractor {
  /**
   * Function names for future custom pattern matching.
   * Currently not used as we use hardcoded patterns for Angular.
   */
  readonly functions: Set<string>;

  constructor(options: ExtractorOptions) {
    this.functions = new Set(options.functions);
  }

  extractFromCode(code: string, filePath?: string): string[] {
    const details = this.extractFromCodeWithDetails(code, filePath);
    return details.map(d => d.key);
  }

  extractFromCodeWithDetails(code: string, filePath?: string): ExtractedKey[] {
    const keys: ExtractedKey[] = [];

    // Extract from template: {{ 'key' | translate }}
    // Matches both single and double quotes
    const pipeRegex = /{{\s*['"]([^'"]+)['"]\s*\|\s*translate/g;
    let match;
    while ((match = pipeRegex.exec(code)) !== null) {
      keys.push({
        key: match[1],
        location: filePath
          ? {
              file: filePath,
              line: this.getLineNumber(code, match.index),
              column: this.getColumnNumber(code, match.index),
            }
          : undefined,
      });
    }

    // Extract from TypeScript: this.translate.instant('key'), .get('key'), .translate('key')
    // Matches: .instant('key'), .get('key'), .translate('key')
    const serviceRegex = /\.(?:translate|instant|get)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = serviceRegex.exec(code)) !== null) {
      keys.push({
        key: match[1],
        location: filePath
          ? {
              file: filePath,
              line: this.getLineNumber(code, match.index),
              column: this.getColumnNumber(code, match.index),
            }
          : undefined,
      });
    }

    return keys;
  }

  /**
   * Get line number from character index.
   */
  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Get column number from character index.
   */
  private getColumnNumber(code: string, index: number): number {
    const lastNewLine = code.lastIndexOf('\n', index);
    return lastNewLine === -1 ? index : index - lastNewLine - 1;
  }
}
