// Components
export { LocaleflowProvider } from './provider';
export { LanguageSwitcher } from './components/LanguageSwitcher';
export type { LanguageSwitcherProps } from './components/LanguageSwitcher';

// Hooks
export { useLocaleflow } from './hooks/useLocaleflow';
export { useTranslation } from './hooks/useTranslation';
export { useLanguage } from './hooks/useLanguage';
export { useNamespace } from './hooks/useNamespace';

// Hook types
export type { UseTranslationReturn } from './hooks/useTranslation';
export type { UseLanguageReturn } from './hooks/useLanguage';
export type { UseNamespaceReturn, UseNamespaceOptions } from './hooks/useNamespace';

// Types
export type {
  LocaleflowConfig,
  LocaleflowProviderProps,
  LocaleflowContextValue,
  TranslationFunction,
  TranslationValues,
  TranslationBundle,
  NestedTranslationValue,
  MultiLanguageBundle,
  SdkTranslationsResponse,
  CacheEntry,
  CacheOptions,
  DetectionConfig,
} from './types';

// Language Detection
export {
  LanguageDetectorService,
  createLanguageDetector,
} from './detection/LanguageDetectorService';
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
} from './detection/detectors';
export type { LanguageDetector, DetectorOptions } from './detection/types';
export { DEFAULT_DETECTION_CONFIG } from './detection/types';

// Client (for advanced usage)
export { LocaleflowClient } from './client/LocaleflowClient';
export { TranslationCache } from './client/cache';

// Context (for advanced usage)
export { LocaleflowContext, useLocaleflowContext } from './context/LocaleflowContext';
