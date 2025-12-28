/**
 * Server-side exports for Next.js SDK
 *
 * This module provides server-side translation support for Next.js 16 Server Components
 * and Static Site Generation (SSG).
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { configureServer } from '@localeflow/nextjs/server';
 *
 * configureServer({
 *   apiKey: process.env.LOCALEFLOW_API_KEY!,
 *   environment: 'production',
 *   project: 'my-project',
 *   space: 'frontend',
 *   defaultLanguage: 'en',
 * });
 *
 * // app/[locale]/page.tsx
 * import { getTranslations, getAvailableLanguages } from '@localeflow/nextjs/server';
 *
 * export default async function Page({ params }: { params: { locale: string } }) {
 *   const { t } = await getTranslations(undefined, params.locale);
 *   return <h1>{t('home.title')}</h1>;
 * }
 *
 * export async function generateStaticParams() {
 *   const languages = await getAvailableLanguages();
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

export { fetchTranslationsServer, getServerTranslations } from './cache';

// Re-export types
export type { GetTranslationsReturn } from './getTranslations';
