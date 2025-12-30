/**
 * Language Detection Module
 *
 * Exports types, detectors, and service for language detection.
 */

// Types
export type {
  LanguageDetector,
  DetectorOptions,
  DetectionConfig,
} from './types.js';
export { DEFAULT_DETECTION_CONFIG } from './types.js';

// Built-in detectors
export {
  cookieDetector,
  localStorageDetector,
  sessionStorageDetector,
  navigatorDetector,
  queryStringDetector,
  pathDetector,
  htmlTagDetector,
  hashDetector,
  subdomainDetector,
  builtInDetectors,
} from './detectors.js';

// Service
export {
  LanguageDetectorService,
  createLanguageDetector,
} from './LanguageDetectorService.js';
