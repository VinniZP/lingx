import type {
  TranslationFunction,
  TranslationValues,
  TranslationBundle,
} from '../types';
import { getServerConfig } from './config';
import { getServerTranslations } from './cache';
import { ICUFormatter, hasICUSyntax } from '../client/icu-formatter';
import { nextFetch } from './next-types';

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
 * Get translations for use in Server Components.
 *
 * This is an async function that fetches translations server-side
 * and returns a translation function with full ICU MessageFormat support.
 *
 * @param namespace - Optional namespace to scope translations
 * @param language - Optional language override (defaults to config.defaultLanguage)
 * @returns Translation function and language
 *
 * @example
 * ```tsx
 * // app/[locale]/page.tsx
 * import { getTranslations } from '@localeflow/nextjs/server';
 *
 * export default async function HomePage({ params }: { params: { locale: string } }) {
 *   const { t } = await getTranslations(undefined, params.locale);
 *
 *   return (
 *     <div>
 *       <h1>{t('home.title')}</h1>
 *       <p>{t('home.description', { year: 2025 })}</p>
 *       <p>{t('cart_items', { count: 5 })}</p>
 *     </div>
 *   );
 * }
 *
 * // With namespace
 * export default async function AuthPage() {
 *   const { t } = await getTranslations('auth');
 *
 *   return <h1>{t('login.title')}</h1>; // Looks up 'auth:login.title'
 * }
 * ```
 */
export async function getTranslations(
  namespace?: string,
  language?: string
): Promise<GetTranslationsReturn> {
  const config = getServerConfig();
  const lang = language || config.defaultLanguage;

  // Check for static data first (SSG support)
  let translations: TranslationBundle;
  if (config.staticData && Object.keys(config.staticData).length > 0) {
    translations = config.staticData;
  } else {
    // Fetch translations (uses React cache for deduplication)
    translations = await getServerTranslations(lang, namespace);
  }

  // Create ICU formatter for this language
  const formatter = new ICUFormatter(lang);

  /**
   * Translation function with namespace support and ICU formatting
   */
  const t: TranslationFunction = (
    key: string,
    values?: TranslationValues
  ): string => {
    // Build full key with namespace prefix if provided
    const fullKey = namespace ? `${namespace}:${key}` : key;

    // Look up translation
    let translation = translations[fullKey];

    // If not found with namespace, try without (for common keys)
    if (!translation && namespace) {
      translation = translations[key];
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
 * Generate static params for all available languages.
 *
 * Use this in your generateStaticParams to create static pages for each language.
 *
 * @returns Array of locale params
 *
 * @example
 * ```tsx
 * // app/[locale]/page.tsx
 * import { getAvailableLanguages } from '@localeflow/nextjs/server';
 *
 * export async function generateStaticParams() {
 *   const languages = await getAvailableLanguages();
 *   return languages.map((locale) => ({ locale }));
 * }
 * ```
 */
export async function getAvailableLanguages(): Promise<string[]> {
  const config = getServerConfig();

  // Use apiUrl from config, fall back to empty string (relative URL)
  const baseUrl = config.apiUrl || '';
  const params = new URLSearchParams({
    project: config.project,
    space: config.space,
    environment: config.environment,
  });

  const response = await nextFetch(
    `${baseUrl}/api/sdk/languages?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 3600, // Cache for 1 hour
        tags: ['available-languages'],
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch available languages: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.availableLanguages || [config.defaultLanguage];
}
