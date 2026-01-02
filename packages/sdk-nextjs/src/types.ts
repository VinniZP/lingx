import type { DetectionConfig } from './detection/types.js';

// Re-export detection types for convenience
export type { DetectionConfig } from './detection/types.js';

// ============================================
// Translation Key Types (for static extraction)
// ============================================

/**
 * Translation resources interface for type augmentation.
 *
 * When you run `lingx types`, the generated .d.ts file merges with
 * this interface to provide type-safe translation keys.
 *
 * @example Generated types:
 * ```typescript
 * // In lingx.d.ts (generated)
 * declare module '@lingx/sdk-nextjs' {
 *   interface TranslationResources {
 *     keys: 'auth.login.title' | 'common.greeting' | 'common.items';
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TranslationResources {
  // When empty, keys defaults to string (no type generation)
}

/**
 * Namespace-specific translation keys for type augmentation.
 *
 * When you run `lingx types`, the generated .d.ts file merges with
 * this interface to provide type-safe namespaced keys.
 *
 * @example Generated types:
 * ```typescript
 * // In lingx.d.ts (generated)
 * declare module '@lingx/sdk-nextjs' {
 *   interface NamespaceKeys {
 *     glossary: 'tags.title' | 'tags.addTag' | 'dialog.title';
 *     auth: 'login.title' | 'login.submit';
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NamespaceKeys {
  // When empty, namespace-specific typing is disabled
}

/**
 * All available translation keys.
 *
 * When TranslationResources.keys is defined (via type generation),
 * this becomes a strict union of valid keys with autocomplete.
 * Otherwise, defaults to `string` for untyped usage.
 */
export type TranslationKeys = TranslationResources extends { keys: infer K }
  ? K extends string
    ? K
    : string
  : string;

/**
 * Get keys for a specific namespace.
 * Returns the namespace's keys if defined, otherwise string.
 */
export type NamespaceTranslationKeys<NS extends string> =
  NS extends keyof NamespaceKeys
    ? NamespaceKeys[NS] extends string
      ? NamespaceKeys[NS]
      : string
    : string;

/**
 * Get keys for useTranslation - either root keys or namespace keys.
 */
export type TranslationKeysFor<NS extends string | undefined> =
  NS extends string
    ? NamespaceTranslationKeys<NS>
    : TranslationKeys;

/**
 * ICU parameter types for translation keys that require parameters.
 *
 * This interface is augmented by the generated types file.
 * Keys not listed here don't require parameters.
 *
 * @example Generated types:
 * ```typescript
 * // In lingx.d.ts (generated)
 * declare module '@lingx/sdk-nextjs' {
 *   interface TranslationParams {
 *     'common.greeting': { name: string | number };
 *     'common.items': { count: number };
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TranslationParams {}

/**
 * Branded type for translation keys.
 * Keys wrapped with tKey() get this type, allowing them to be used with t().
 * Plain strings widened to `string` type will fail TypeScript checks.
 */
declare const TranslationKeyBrand: unique symbol;
export type TranslationKey<T extends string = string> = T & {
  readonly [TranslationKeyBrand]: true;
};

/**
 * Convenience type alias for TranslationKey with generated keys.
 *
 * Use this instead of `TranslationKey<TranslationKeys>` for cleaner code.
 *
 * @example
 * ```typescript
 * interface NavItem {
 *   href: string;
 *   labelKey: TKey; // Same as TranslationKey<TranslationKeys>
 * }
 *
 * const items: NavItem[] = [
 *   { href: '/', labelKey: tKey('nav.home') },
 * ];
 * ```
 */
export type TKey = TranslationKey<TranslationKeys>;

/**
 * Convenience type alias for namespaced TranslationKey.
 *
 * Use this for typing translation keys that belong to a specific namespace.
 *
 * @example
 * ```typescript
 * interface GlossaryOption {
 *   value: string;
 *   labelKey: TNsKey<'glossary'>; // Only accepts glossary namespace keys
 * }
 *
 * const options: GlossaryOption[] = [
 *   { value: 'noun', labelKey: tKey('partOfSpeech.noun', 'glossary') },
 * ];
 * ```
 */
export type TNsKey<NS extends keyof NamespaceKeys> = TranslationKey<NamespaceKeys[NS] & string>;

/**
 * Marks a string as a type-safe translation key for static extraction.
 *
 * When type generation is enabled (`lingx types`), this function
 * only accepts valid translation keys and provides autocomplete.
 *
 * @example
 * ```typescript
 * // Root keys (no namespace)
 * tKey('nav.home');           // ✓ Validates against TranslationKeys
 * tKey('invalid.key');        // ✗ TypeScript error
 *
 * // Namespaced keys (second argument)
 * tKey('tags.title', 'glossary');  // ✓ Validates against NamespaceKeys['glossary']
 * tKey('invalid', 'glossary');     // ✗ TypeScript error
 *
 * // Use td() for dynamic usage
 * const items = [{ labelKey: tKey('tags.title', 'glossary') }];
 * items.map(item => td(item.labelKey));
 * ```
 */
export function tKey<K extends TranslationKeys>(key: K): TranslationKey<K>;
export function tKey<
  NS extends keyof NamespaceKeys & string,
  K extends NamespaceKeys[NS] & string = NamespaceKeys[NS] & string
>(key: K, namespace: NS): TranslationKey<K>;
export function tKey(key: string, _namespace?: string): TranslationKey<string> {
  return key as TranslationKey<string>;
}

/**
 * Escape hatch for dynamic translation keys.
 *
 * Use this when you need to use a key that isn't statically known,
 * such as keys constructed at runtime or from external sources.
 *
 * WARNING: Keys passed to tKeyUnsafe() are not validated at compile time.
 * Use tKey() whenever possible for type safety.
 *
 * @example
 * ```typescript
 * // Dynamic key construction (not type-safe)
 * const section = getSectionFromRoute();
 * const key = tKeyUnsafe(`${section}.title`);
 *
 * // Dynamic namespaced key
 * const nsKey = tKeyUnsafe('dynamic.key', 'glossary');
 *
 * // Keys from external sources
 * const apiKey = response.translationKey;
 * td(tKeyUnsafe(apiKey));
 * ```
 */
export const tKeyUnsafe = (key: string, _namespace?: string): TranslationKey<string> =>
  key as TranslationKey<string>;

/**
 * Configuration for LingxProvider
 */
export interface LingxConfig {
  /** Default language code (e.g., 'en') */
  defaultLanguage: string;

  /**
   * Static translations for default language (immediate load).
   * Can be a single language bundle or multi-language bundle.
   * For multi-language: { en: { ... }, de: { ... } }
   */
  staticData?: TranslationBundle | MultiLanguageBundle;

  /**
   * Path to local JSON translation files (e.g., '/locales').
   * Used for dynamic loading of non-default languages.
   * Files should be named {lang}.json (e.g., /locales/de.json)
   */
  localePath?: string;

  /** Available languages (auto-detected from staticData if multi-language) */
  availableLanguages?: string[];

  /** Fallback language when translation is missing */
  fallbackLanguage?: string;

  /** Namespaces to load initially */
  namespaces?: string[];

  // ---- API Configuration (optional) ----

  /** API base URL for fetching translations (optional - falls back to localePath) */
  apiUrl?: string;

  /** Project slug (required if using API) */
  project?: string;

  /** Space slug (required if using API) */
  space?: string;

  /** Environment slug (required if using API) */
  environment?: string;

  // ---- Retry Configuration ----

  /** Retry configuration for API/network failures */
  retry?: {
    /** Maximum retry attempts (default: 3) */
    maxAttempts?: number;
    /** Base delay in ms for exponential backoff (default: 1000) */
    baseDelay?: number;
    /** Maximum delay in ms (default: 10000) */
    maxDelay?: number;
  };

  // ---- Language Detection & Persistence ----

  /**
   * Language detection configuration.
   * Set to false to disable detection (always use defaultLanguage).
   * Default: enabled with cookie + localStorage detection and caching.
   */
  detection?: DetectionConfig | false;
}

/**
 * Props for LingxProvider component
 */
export interface LingxProviderProps extends LingxConfig {
  children: React.ReactNode;
  /** Loading fallback while translations load */
  fallback?: React.ReactNode;
}

/**
 * Translation values for interpolation and ICU formatting
 */
export type TranslationValues = Record<string, string | number | Date>;

/**
 * Helper type to get the parameter type for a translation key.
 * Returns the specific params if the key is in TranslationParams,
 * otherwise returns optional TranslationValues.
 */
export type TranslationParamsFor<K extends TranslationKeys> =
  K extends keyof TranslationParams
    ? TranslationParams[K]
    : TranslationValues | undefined;

/**
 * Type-safe translation function with ICU MessageFormat support.
 *
 * When type generation is enabled (`lingx types`), this function:
 * - Only accepts valid translation keys (autocomplete works)
 * - Requires correct parameter types for ICU formatted strings
 * - Shows translation text in JSDoc on hover
 *
 * @example
 * ```tsx
 * // With generated types
 * t('common.greeting', { name: 'World' }); // ✓ Typed params
 * t('common.items', { count: 5 });          // ✓ count must be number
 * t('invalid.key');                          // ✗ TypeScript error
 * ```
 */
export type TranslationFunction = <K extends TranslationKeys>(
  key: K,
  ...args: K extends keyof TranslationParams
    ? [params: TranslationParams[K]]
    : [params?: TranslationValues]
) => string;

/**
 * Dynamic translation function for TranslationKey branded strings.
 * Use this when translating keys stored in variables/arrays (wrapped with tKey).
 *
 * When type generation is enabled, this function respects the same
 * type constraints as the regular `t()` function.
 *
 * @example
 * ```typescript
 * const items = [
 *   { labelKey: tKey('nav.home') },
 *   { labelKey: tKey('nav.about') },
 * ];
 *
 * // Use td() for keys from variables
 * items.map(item => td(item.labelKey));
 *
 * // With ICU parameters
 * const greeting = tKey('common.greeting');
 * td(greeting, { name: 'World' });
 * ```
 */
export type DynamicTranslationFunction = <K extends TranslationKeys>(
  key: TranslationKey<K>,
  ...args: K extends keyof TranslationParams
    ? [params: TranslationParams[K]]
    : [params?: TranslationValues]
) => string;

/**
 * Namespace-aware translation function.
 * Only accepts keys valid for the specified namespace.
 */
export type NamespacedTranslationFunction<AllowedKeys extends string> = <K extends AllowedKeys>(
  key: K,
  ...args: K extends keyof TranslationParams
    ? [params: TranslationParams[K]]
    : [params?: TranslationValues]
) => string;

/**
 * Namespace-aware dynamic translation function.
 * Only accepts TranslationKey for keys valid in the specified namespace.
 */
export type NamespacedDynamicTranslationFunction<AllowedKeys extends string> = <K extends AllowedKeys>(
  key: TranslationKey<K>,
  ...args: K extends keyof TranslationParams
    ? [params: TranslationParams[K]]
    : [params?: TranslationValues]
) => string;

/**
 * Nested translation value - can be a string or nested object
 */
export type NestedTranslationValue = string | { [key: string]: NestedTranslationValue };

/**
 * Bundle of translations - supports both flat and nested structures
 * Flat: { "common.welcome": "Hello" }
 * Nested: { common: { welcome: "Hello" } }
 */
export type TranslationBundle = Record<string, NestedTranslationValue>;

/**
 * Multi-language translation bundle keyed by language code
 */
export type MultiLanguageBundle = Record<string, TranslationBundle>;

/**
 * SDK API response format
 */
export interface SdkTranslationsResponse {
  language: string;
  translations: TranslationBundle;
  availableLanguages?: string[];
}

/**
 * Lingx context value
 */
export interface LingxContextValue {
  /** Current language code */
  language: string;
  /** Set current language */
  setLanguage: (lang: string) => Promise<void>;
  /** Available language codes */
  availableLanguages: string[];
  /** Whether language change is in progress */
  isChanging: boolean;
  /** Whether translations are currently loading */
  isLoading: boolean;
  /** Translations for current language */
  translations: TranslationBundle;
  /** Loaded namespaces */
  loadedNamespaces: Set<string>;
  /** Load a namespace */
  loadNamespace: (namespace: string) => Promise<void>;
  /** Whether SDK is ready (always true - non-blocking) */
  ready: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Translation function */
  t: TranslationFunction;
  /** SDK configuration */
  config: LingxConfig;
}

/**
 * Cache entry for translations
 */
export interface CacheEntry {
  translations: TranslationBundle;
  timestamp: number;
  expiresAt: number;
  /** Last access time for LRU eviction */
  lastAccessed: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum cache entries */
  maxEntries?: number;
}
