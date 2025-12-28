import type { LocaleflowConfig } from '../types';

/**
 * Server-side configuration storage
 */
let serverConfig: LocaleflowConfig | null = null;

/**
 * Configure the SDK for server-side usage.
 * Call this in your Next.js instrumentation.ts or layout.tsx.
 *
 * @param config - Server configuration
 *
 * @example
 * ```ts
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
 * ```
 */
export function configureServer(config: LocaleflowConfig): void {
  serverConfig = config;
}

/**
 * Get the current server configuration.
 * Throws if not configured.
 */
export function getServerConfig(): LocaleflowConfig {
  if (!serverConfig) {
    throw new Error(
      'Localeflow server not configured. ' +
        'Call configureServer() in your layout.tsx or instrumentation.ts before using getTranslations().'
    );
  }
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
