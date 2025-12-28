/**
 * Configuration options for extractors.
 */
export interface ExtractorOptions {
  /**
   * List of function names to search for (e.g., ['t', 'useTranslation'])
   */
  functions: string[];
}

/**
 * Represents an extracted translation key with optional metadata.
 */
export interface ExtractedKey {
  /**
   * The translation key string.
   */
  key: string;

  /**
   * Source file location where the key was found.
   */
  location?: {
    file: string;
    line: number;
    column: number;
  };

  /**
   * Namespace prefix if extracted from context (e.g., useTranslation('namespace'))
   */
  namespace?: string;

  /**
   * ICU variables detected in the translation (if analyzed with ICU detector)
   */
  icuVariables?: string[];

  /**
   * ICU patterns detected in the translation (e.g., 'plural', 'select')
   */
  icuPatterns?: string[];
}

/**
 * Interface for translation key extractors.
 */
export interface Extractor {
  /**
   * Extract translation keys from source code.
   * Returns an array of key strings.
   */
  extractFromCode(code: string, filePath?: string): string[];

  /**
   * Extract translation keys with detailed metadata.
   * Returns an array of ExtractedKey objects with location and namespace info.
   */
  extractFromCodeWithDetails(code: string, filePath?: string): ExtractedKey[];
}

import { NextjsExtractor } from './nextjs.js';
import { AngularExtractor } from './angular.js';

/**
 * Factory function to create an extractor for the specified framework.
 *
 * @param framework - The framework to create an extractor for ('nextjs' or 'angular')
 * @param options - Extractor configuration options
 * @returns An Extractor instance for the specified framework
 * @throws Error if the framework is not supported
 */
export function createExtractor(
  framework: 'nextjs' | 'angular',
  options: ExtractorOptions
): Extractor {
  switch (framework) {
    case 'nextjs':
      return new NextjsExtractor(options);
    case 'angular':
      return new AngularExtractor(options);
    default:
      throw new Error(`Unknown framework: ${framework}`);
  }
}

export { NextjsExtractor } from './nextjs.js';
export { AngularExtractor } from './angular.js';
