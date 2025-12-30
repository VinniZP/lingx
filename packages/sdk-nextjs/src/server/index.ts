/**
 * Server-side exports for Next.js SDK
 *
 * This module provides server-side translation support for Next.js 16 Server Components
 * and Static Site Generation (SSG).
 *
 * Server-side always uses static data - no API fetching.
 * This ensures serverless/edge safety and predictable performance.
 *
 * @example
 * ```tsx
 * // app/[locale]/page.tsx
 * import { getTranslations, getAvailableLanguages } from '@localeflow/nextjs/server';
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
 * export async function generateStaticParams() {
 *   const languages = getAvailableLanguages(translations);
 *   return languages.map((locale) => ({ locale }));
 * }
 * ```
 */

export {
  configureServer,
  getServerConfig,
  isServerConfigured,
  resetServerConfig,
} from './config';

export { getTranslations, getAvailableLanguages } from './getTranslations';

// Re-export types
export type { GetTranslationsReturn, GetTranslationsOptions } from './getTranslations';
