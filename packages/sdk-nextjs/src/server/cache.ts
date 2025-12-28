import { cache } from 'react';
import type { TranslationBundle, SdkTranslationsResponse } from '../types';
import { getServerConfig } from './config';
import { nextFetch } from './next-types';

/**
 * Server-side translation cache using React's cache() function.
 * This deduplicates requests within a single render pass.
 */

/**
 * Build the API URL for fetching translations
 */
function buildApiUrl(language: string, namespace?: string): string {
  const config = getServerConfig();
  // Use apiUrl from config, fall back to empty string (relative URL)
  const baseUrl = config.apiUrl || '';

  const params = new URLSearchParams({
    project: config.project,
    space: config.space,
    environment: config.environment,
    lang: language,
  });

  if (namespace) {
    params.set('namespace', namespace);
  }

  return `${baseUrl}/api/sdk/translations?${params.toString()}`;
}

/**
 * Fetch translations from the API.
 * Uses React cache() for request deduplication.
 */
export const fetchTranslationsServer = cache(
  async (
    language: string,
    namespace?: string
  ): Promise<SdkTranslationsResponse> => {
    const config = getServerConfig();
    const url = buildApiUrl(language, namespace);

    const response = await nextFetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      // Cache for SSG/ISR with Next.js fetch extension
      next: {
        revalidate: 60, // Revalidate every 60 seconds
        tags: ['translations', `translations-${language}`],
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch translations: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }
);

/**
 * Get cached translations or fetch if not cached.
 * The cache is scoped to the current React render.
 */
export async function getServerTranslations(
  language: string,
  namespace?: string
): Promise<TranslationBundle> {
  const response = await fetchTranslationsServer(language, namespace);
  return response.translations;
}
