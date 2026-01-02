// Components
export { LingxProvider } from './provider';
export { LanguageSwitcher } from './components/LanguageSwitcher';
export type { LanguageSwitcherProps } from './components/LanguageSwitcher';

// Hooks
export { useLingx } from './hooks/useLingx';
export { useTranslation } from './hooks/useTranslation';
export { useLanguage } from './hooks/useLanguage';
export { useNamespace } from './hooks/useNamespace';

// Hook types
export type { UseTranslationReturn, UseNamespacedTranslationReturn } from './hooks/useTranslation';
export type { UseLanguageReturn } from './hooks/useLanguage';
export type { UseNamespaceReturn, UseNamespaceOptions } from './hooks/useNamespace';

// Types
export type {
  LingxConfig,
  LingxProviderProps,
  LingxContextValue,
  TranslationFunction,
  DynamicTranslationFunction,
  NamespacedTranslationFunction,
  NamespacedDynamicTranslationFunction,
  TranslationValues,
  TranslationBundle,
  NestedTranslationValue,
  MultiLanguageBundle,
  SdkTranslationsResponse,
  CacheEntry,
  CacheOptions,
  DetectionConfig,
  TranslationKey,
  TKey,
  TNsKey,
  // Type-safe translation types (augmented by generated types)
  TranslationResources,
  TranslationKeys,
  NamespaceKeys,
  NamespaceTranslationKeys,
  TranslationKeysFor,
  TranslationParams,
  TranslationParamsFor,
} from './types';

// Translation Key Functions
export { tKey, tKeyUnsafe } from './types';

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
export { LingxClient } from './client/LingxClient';
export { TranslationCache } from './client/cache';

// Context (for advanced usage)
export { LingxContext, useLingxContext } from './context/LingxContext';
