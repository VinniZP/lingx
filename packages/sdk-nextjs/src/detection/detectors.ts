/**
 * Built-in Language Detectors
 *
 * Each detector implements the LanguageDetector interface.
 * Detectors are checked in order until a supported language is found.
 */

import type { LanguageDetector, DetectorOptions } from './types.js';

/**
 * Cookie detector
 *
 * Reads/writes language preference to browser cookies.
 * Supports cross-subdomain sharing via cookieDomain option.
 */
export const cookieDetector: LanguageDetector = {
  name: 'cookie',

  lookup(options: DetectorOptions): string | undefined {
    if (typeof document === 'undefined') return undefined;

    const { cookieName } = options;
    const match = document.cookie.match(new RegExp(`(^| )${cookieName}=([^;]+)`));
    return match?.[2];
  },

  cacheUserLanguage(language: string, options: DetectorOptions): void {
    if (typeof document === 'undefined') return;

    const { cookieName, cookieMaxAge, cookieDomain } = options;
    let cookie = `${cookieName}=${language}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
    if (cookieDomain) {
      cookie += `; domain=${cookieDomain}`;
    }
    document.cookie = cookie;
  },
};

/**
 * localStorage detector
 *
 * Reads/writes language preference to browser localStorage.
 * Persists across sessions but not across subdomains.
 */
export const localStorageDetector: LanguageDetector = {
  name: 'localStorage',

  lookup(options: DetectorOptions): string | undefined {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return undefined;
    }

    try {
      const { localStorageKey } = options;
      return localStorage.getItem(localStorageKey) ?? undefined;
    } catch {
      // localStorage may be blocked in some contexts
      return undefined;
    }
  },

  cacheUserLanguage(language: string, options: DetectorOptions): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const { localStorageKey } = options;
      localStorage.setItem(localStorageKey, language);
    } catch {
      // localStorage may be blocked in some contexts
    }
  },
};

/**
 * sessionStorage detector
 *
 * Reads/writes language preference to browser sessionStorage.
 * Only persists for the current session (tab).
 */
export const sessionStorageDetector: LanguageDetector = {
  name: 'sessionStorage',

  lookup(options: DetectorOptions): string | undefined {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return undefined;
    }

    try {
      const { localStorageKey } = options; // Reuse the same key name
      return sessionStorage.getItem(localStorageKey) ?? undefined;
    } catch {
      return undefined;
    }
  },

  cacheUserLanguage(language: string, options: DetectorOptions): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      const { localStorageKey } = options;
      sessionStorage.setItem(localStorageKey, language);
    } catch {
      // sessionStorage may be blocked
    }
  },
};

/**
 * Navigator detector
 *
 * Reads browser's preferred languages from navigator.languages.
 * Returns first supported language found, normalizing codes like 'en-US' to 'en'.
 */
export const navigatorDetector: LanguageDetector = {
  name: 'navigator',

  lookup(options: DetectorOptions): string | undefined {
    if (typeof navigator === 'undefined') return undefined;

    const { supportedLanguages } = options;
    const browserLangs = navigator.languages ?? [navigator.language];

    for (const browserLang of browserLangs) {
      if (!browserLang) continue;

      // Check exact match first (e.g., 'en-US')
      if (supportedLanguages.includes(browserLang)) {
        return browserLang;
      }

      // Check base language code (e.g., 'en-US' -> 'en')
      const baseCode = browserLang.split('-')[0];
      if (supportedLanguages.includes(baseCode)) {
        return baseCode;
      }
    }

    return undefined;
  },
};

/**
 * Query string detector
 *
 * Reads language from URL query parameters.
 * Supports both ?lang=de and ?lng=de formats.
 */
export const queryStringDetector: LanguageDetector = {
  name: 'querystring',

  lookup(options: DetectorOptions): string | undefined {
    if (typeof window === 'undefined') return undefined;

    const { supportedLanguages } = options;
    const params = new URLSearchParams(window.location.search);

    // Check common parameter names
    const lang = params.get('lang') ?? params.get('lng') ?? params.get('locale');

    if (lang && supportedLanguages.includes(lang)) {
      return lang;
    }

    return undefined;
  },
};

/**
 * Path detector
 *
 * Reads language from URL path segment.
 * Example: /de/about -> 'de'
 */
export const pathDetector: LanguageDetector = {
  name: 'path',

  lookup(options: DetectorOptions): string | undefined {
    if (typeof window === 'undefined') return undefined;

    const { supportedLanguages } = options;
    const segments = window.location.pathname.split('/').filter(Boolean);

    // Check first path segment
    const firstSegment = segments[0];
    if (firstSegment && supportedLanguages.includes(firstSegment)) {
      return firstSegment;
    }

    return undefined;
  },
};

/**
 * HTML tag detector
 *
 * Reads language from <html lang="..."> attribute.
 * Useful when server sets the language in HTML.
 */
export const htmlTagDetector: LanguageDetector = {
  name: 'htmlTag',

  lookup(): string | undefined {
    if (typeof document === 'undefined') return undefined;

    const htmlLang = document.documentElement.lang;
    return htmlLang || undefined;
  },
};

/**
 * Hash detector
 *
 * Reads language from URL hash.
 * Supports #lang=de or #/de formats.
 */
export const hashDetector: LanguageDetector = {
  name: 'hash',

  lookup(options: DetectorOptions): string | undefined {
    if (typeof window === 'undefined') return undefined;

    const { supportedLanguages } = options;
    const hash = window.location.hash.slice(1); // Remove #

    if (!hash) return undefined;

    // Check #lang=de or #lng=de format
    const params = new URLSearchParams(hash.replace(/^\//, ''));
    const lang = params.get('lang') ?? params.get('lng');
    if (lang && supportedLanguages.includes(lang)) {
      return lang;
    }

    // Check #/de format
    const hashPath = hash.split('/').filter(Boolean)[0];
    if (hashPath && supportedLanguages.includes(hashPath)) {
      return hashPath;
    }

    return undefined;
  },
};

/**
 * Subdomain detector
 *
 * Reads language from subdomain.
 * Example: de.example.com -> 'de'
 */
export const subdomainDetector: LanguageDetector = {
  name: 'subdomain',

  lookup(options: DetectorOptions): string | undefined {
    if (typeof window === 'undefined') return undefined;

    const { supportedLanguages } = options;
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];

    if (subdomain && supportedLanguages.includes(subdomain)) {
      return subdomain;
    }

    return undefined;
  },
};

/**
 * All built-in detectors
 */
export const builtInDetectors: LanguageDetector[] = [
  cookieDetector,
  localStorageDetector,
  sessionStorageDetector,
  navigatorDetector,
  queryStringDetector,
  pathDetector,
  htmlTagDetector,
  hashDetector,
  subdomainDetector,
];
