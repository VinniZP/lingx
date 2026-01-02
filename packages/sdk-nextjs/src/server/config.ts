import type { LingxConfig } from '../types';

/**
 * Server-side configuration storage
 */
let serverConfig: LingxConfig | null = null;

/**
 * Configure the SDK for server-side usage.
 *
 * @deprecated For serverless/edge safety, prefer passing config directly to getTranslations().
 * This global configuration is not thread-safe in concurrent render environments.
 *
 * @param config - Server configuration
 *
 * @example
 * ```ts
 * // Preferred: pass config to getTranslations()
 * import en from '@/locales/en.json';
 *
 * const { t } = await getTranslations({
 *   staticData: en,
 *   language: 'en',
 * });
 *
 * // Legacy: global config (not thread-safe)
 * configureServer({
 *   defaultLanguage: 'en',
 *   staticData: en,
 * });
 * ```
 */
export function configureServer(config: LingxConfig): void {
  serverConfig = config;
}

/**
 * Get the current server configuration.
 * Returns null if not configured.
 */
export function getServerConfig(): LingxConfig | null {
  return serverConfig;
}

/**
 * Check if server is configured
 */
export function isServerConfigured(): boolean {
  return serverConfig !== null;
}

/**
 * Reset server configuration (for testing)
 */
export function resetServerConfig(): void {
  serverConfig = null;
}
