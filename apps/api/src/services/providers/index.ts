/**
 * Machine Translation Provider Factory
 *
 * Creates and manages MT provider instances.
 */
import type { MTProvider } from './mt-provider.interface.js';
import { DeepLProvider } from './deepl.provider.js';
import { GoogleTranslateProvider } from './google-translate.provider.js';

export type MTProviderType = 'DEEPL' | 'GOOGLE_TRANSLATE';

/**
 * Create a new MT provider instance by type
 *
 * @param type - Provider type from MTProvider enum
 * @returns Uninitialized provider instance (must call initialize() with API key)
 */
export function createMTProvider(type: MTProviderType): MTProvider {
  switch (type) {
    case 'DEEPL':
      return new DeepLProvider();
    case 'GOOGLE_TRANSLATE':
      return new GoogleTranslateProvider();
    default:
      throw new Error(`Unknown MT provider type: ${type}`);
  }
}

/**
 * Get display name for provider type
 */
export function getProviderDisplayName(type: MTProviderType): string {
  switch (type) {
    case 'DEEPL':
      return 'DeepL';
    case 'GOOGLE_TRANSLATE':
      return 'Google Translate';
    default:
      return type;
  }
}

/**
 * Get all available provider types
 */
export function getAvailableProviders(): MTProviderType[] {
  return ['DEEPL', 'GOOGLE_TRANSLATE'];
}

export type { MTProvider };
export { DeepLProvider, GoogleTranslateProvider };
export * from './mt-provider.interface.js';
