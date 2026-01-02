/**
 * Configuration options for extractors.
 */
export interface ExtractorOptions {
  /**
   * List of function names to search for (e.g., ['t', 'useTranslation'])
   */
  functions: string[];

  /**
   * List of marker function names to extract keys from (e.g., ['tKey'])
   * These functions are used to mark strings for extraction without translating.
   */
  markerFunctions?: string[];
}

/**
 * Source of the extracted key.
 */
export type KeySource = 'function' | 'marker' | 'comment';

/**
 * Component context type for near-key detection.
 */
export type ComponentType = 'function' | 'class' | 'arrow' | 'hook';

/**
 * Component context for near-key context detection.
 */
export interface ComponentContext {
  /**
   * Name of the enclosing component/function (e.g., "HeaderNav", "useAuth")
   */
  name: string;

  /**
   * Type of the component/function.
   */
  type: ComponentType;
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
   * How this key was extracted.
   * - 'function': from t('key') calls
   * - 'marker': from tKey('key') marker function
   * - 'comment': from @lf-key comment
   */
  source?: KeySource;

  /**
   * ICU variables detected in the translation (if analyzed with ICU detector)
   */
  icuVariables?: string[];

  /**
   * ICU patterns detected in the translation (e.g., 'plural', 'select')
   */
  icuPatterns?: string[];

  /**
   * Component context for near-key detection.
   * Tracks which component/function contains this key.
   */
  componentContext?: ComponentContext;
}

/**
 * Represents an extraction error (e.g., dynamic key usage).
 */
export interface ExtractionError {
  /**
   * Error message describing the issue.
   */
  message: string;

  /**
   * Location in the source code where the error occurred.
   */
  location: {
    file: string;
    line: number;
    column: number;
  };

  /**
   * The code snippet that caused the error.
   */
  code?: string;
}

/**
 * Result of extracting keys from source code.
 */
export interface ExtractionResult {
  /**
   * Extracted translation keys.
   * Empty if errors were found (extraction aborted).
   */
  keys: ExtractedKey[];

  /**
   * Extraction errors (e.g., dynamic key usage).
   * If non-empty, keys will be empty.
   */
  errors: ExtractionError[];
}

/**
 * Interface for translation key extractors.
 */
export interface Extractor {
  /**
   * Extract translation keys from source code.
   * Returns an array of key strings.
   * @deprecated Use extract() for full error reporting.
   */
  extractFromCode(code: string, filePath?: string): string[];

  /**
   * Extract translation keys with detailed metadata.
   * Returns an array of ExtractedKey objects with location and namespace info.
   * @deprecated Use extract() for full error reporting.
   */
  extractFromCodeWithDetails(code: string, filePath?: string): ExtractedKey[];

  /**
   * Extract translation keys with full error reporting.
   * Returns ExtractionResult with keys and any errors found.
   * If errors are found (e.g., dynamic keys), keys will be empty.
   */
  extract(code: string, filePath?: string): ExtractionResult;
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
