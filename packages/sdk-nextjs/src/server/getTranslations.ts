import type {
  TranslationFunction,
  TranslationValues,
  TranslationBundle,
  NestedTranslationValue,
  MultiLanguageBundle,
} from '../types';
import { getServerConfig } from './config';
import { ICUFormatter, hasICUSyntax } from '../client/icu-formatter';

/**
 * Get a nested value from an object using dot notation
 * @param obj - The object to traverse
 * @param path - Dot-separated path (e.g., "common.welcome")
 * @returns The value at the path or undefined
 */
function getNestedValue(obj: TranslationBundle, path: string): string | undefined {
  // Fast path: direct key lookup (for flat bundles)
  if (path in obj && typeof obj[path] === 'string') {
    return obj[path] as string;
  }

  // Nested path traversal
  const parts = path.split('.');
  let current: NestedTranslationValue | undefined = obj;

  for (const part of parts) {
    if (current === undefined || current === null || typeof current === 'string') {
      return undefined;
    }
    current = (current as Record<string, NestedTranslationValue>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Return type for getTranslations
 */
export interface GetTranslationsReturn {
  /**
   * Translate a key with ICU MessageFormat support.
   *
   * @param key - Translation key (without namespace prefix if using namespace)
   * @param values - Values for ICU MessageFormat placeholders
   * @returns Formatted translation string
   */
  t: TranslationFunction;

  /**
   * Current language code
   */
  language: string;
}

/**
 * Options for getTranslations
 */
export interface GetTranslationsOptions {
  /**
   * Static translation data (required for server-side).
   * Can be single language bundle or multi-language bundle.
   */
  staticData?: TranslationBundle | MultiLanguageBundle;

  /**
   * Language code to use
   */
  language?: string;

  /**
   * Namespace to scope translations
   */
  namespace?: string;

  /**
   * Default language (used to detect multi-language bundles)
   */
  defaultLanguage?: string;
}

/**
 * Check if data is a multi-language bundle
 */
function isMultiLanguageBundle(
  data: TranslationBundle | MultiLanguageBundle | undefined,
  language: string
): data is MultiLanguageBundle {
  if (!data) return false;
  const langValue = data[language];
  return langValue !== undefined && typeof langValue === 'object' && langValue !== null;
}

/**
 * Get translations for use in Server Components.
 *
 * Server-side always uses static data - no API fetching.
 * Pass your translation data directly for serverless/edge safety.
 *
 * @example
 * ```tsx
 * // Recommended: pass translations directly
 * import en from '@/locales/en.json';
 * import de from '@/locales/de.json';
 *
 * const translations = { en, de };
 *
 * export default async function Page({ params }: { params: { locale: string } }) {
 *   const { t } = await getTranslations({
 *     staticData: translations[params.locale],
 *     language: params.locale,
 *   });
 *
 *   return <h1>{t('home.title')}</h1>;
 * }
 *
 * // With multi-language bundle
 * const { t } = await getTranslations({
 *   staticData: { en, de },
 *   language: 'de',
 *   defaultLanguage: 'en',
 * });
 *
 * // Legacy: using global config (deprecated)
 * const { t } = await getTranslations('namespace', 'en');
 * ```
 */
export async function getTranslations(
  optionsOrNamespace?: GetTranslationsOptions | string,
  language?: string
): Promise<GetTranslationsReturn> {
  let options: GetTranslationsOptions;

  // Handle both old and new signatures
  if (typeof optionsOrNamespace === 'string') {
    // Legacy: getTranslations(namespace?, language?)
    options = { namespace: optionsOrNamespace, language };
  } else {
    options = optionsOrNamespace || {};
  }

  // Get translations and language
  let translations: TranslationBundle;
  let lang: string;

  if (options.staticData) {
    // New API: use provided static data
    const defaultLang = options.defaultLanguage || options.language || 'en';
    lang = options.language || defaultLang;

    if (isMultiLanguageBundle(options.staticData, lang)) {
      translations = options.staticData[lang] || {};
    } else if (isMultiLanguageBundle(options.staticData, defaultLang)) {
      translations = options.staticData[lang] || options.staticData[defaultLang] || {};
    } else {
      translations = options.staticData as TranslationBundle;
    }
  } else {
    // Fallback to global config
    const config = getServerConfig();
    if (!config) {
      throw new Error(
        'No translations provided. Pass staticData to getTranslations() or call configureServer().'
      );
    }

    lang = options.language || config.defaultLanguage;

    if (config.staticData) {
      if (isMultiLanguageBundle(config.staticData, lang)) {
        translations = config.staticData[lang] || {};
      } else if (isMultiLanguageBundle(config.staticData, config.defaultLanguage)) {
        translations = config.staticData[lang] || config.staticData[config.defaultLanguage] || {};
      } else {
        translations = config.staticData as TranslationBundle;
      }
    } else {
      throw new Error(
        'No staticData in config. Server-side requires static translations - no API fetching.'
      );
    }
  }

  // Create ICU formatter for this language
  const formatter = new ICUFormatter(lang);
  const namespace = options.namespace;

  /**
   * Translation function with namespace support and ICU formatting.
   * Supports nested keys using dot notation (e.g., "common.welcome").
   */
  const t: TranslationFunction = (
    key: string,
    values?: TranslationValues
  ): string => {
    // Build full key with namespace prefix if provided
    const fullKey = namespace ? `${namespace}:${key}` : key;

    // Look up translation using nested key support
    let translation = getNestedValue(translations, fullKey);

    // If not found with namespace, try without (for common keys)
    if (!translation && namespace) {
      translation = getNestedValue(translations, key);
    }

    // Return key if not found
    if (!translation) {
      return fullKey;
    }

    // If no values, return as-is
    if (!values || Object.keys(values).length === 0) {
      return translation;
    }

    // Fast path: simple placeholders only (no ICU syntax)
    if (!hasICUSyntax(translation)) {
      let result = translation;
      Object.entries(values).forEach(([name, value]) => {
        const placeholder = new RegExp(`\\{${name}\\}`, 'g');
        result = result.replace(placeholder, String(value));
      });
      return result;
    }

    // Full ICU MessageFormat parsing
    return formatter.format(translation, values);
  };

  return {
    t,
    language: lang,
  };
}

/**
 * Get available languages from static data.
 *
 * @example
 * ```tsx
 * import en from '@/locales/en.json';
 * import de from '@/locales/de.json';
 *
 * const translations = { en, de };
 *
 * export async function generateStaticParams() {
 *   const languages = getAvailableLanguages(translations);
 *   return languages.map((locale) => ({ locale }));
 * }
 * ```
 */
export function getAvailableLanguages(
  staticData?: MultiLanguageBundle
): string[] {
  if (staticData) {
    return Object.keys(staticData);
  }

  const config = getServerConfig();
  if (config?.staticData && typeof config.staticData === 'object') {
    // Check if it's a multi-language bundle
    const firstKey = Object.keys(config.staticData)[0];
    if (firstKey && typeof config.staticData[firstKey] === 'object') {
      return Object.keys(config.staticData);
    }
  }

  if (config?.availableLanguages) {
    return config.availableLanguages;
  }

  return [config?.defaultLanguage || 'en'];
}
