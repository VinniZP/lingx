import IntlMessageFormat from 'intl-messageformat';
import type { TranslationValues } from '../types';

/**
 * ICU MessageFormat formatter with AST caching for performance.
 *
 * Supports:
 * - Simple interpolation: {name}
 * - Plural: {count, plural, one {...} other {...}}
 * - Select: {gender, select, male {...} female {...} other {...}}
 * - SelectOrdinal: {place, selectordinal, one {...} other {...}}
 * - Number: {amount, number} or {amount, number, ::currency/USD}
 * - Date: {date, date, short|medium|long|full}
 * - Time: {time, time, short|medium|long|full}
 */
export class ICUFormatter {
  private locale: string;
  private cache: Map<string, IntlMessageFormat> = new Map();
  private maxCacheSize: number;

  /**
   * Create a new ICU formatter
   *
   * @param locale - BCP 47 language tag (e.g., 'en', 'uk', 'de-DE')
   * @param maxCacheSize - Maximum number of parsed messages to cache (default: 500)
   */
  constructor(locale: string, maxCacheSize: number = 500) {
    this.locale = locale;
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Format an ICU message with the given values.
   *
   * @param message - ICU MessageFormat string
   * @param values - Values to interpolate
   * @returns Formatted string
   *
   * @example
   * ```ts
   * const formatter = new ICUFormatter('en');
   *
   * // Plural
   * formatter.format('{count, plural, one {1 item} other {{count} items}}', { count: 5 });
   * // => "5 items"
   *
   * // Select
   * formatter.format('{gender, select, male {He} female {She} other {They}}', { gender: 'female' });
   * // => "She"
   *
   * // Number
   * formatter.format('Price: {amount, number, ::currency/USD}', { amount: 1234.56 });
   * // => "Price: $1,234.56"
   *
   * // Date
   * formatter.format('Updated {date, date, medium}', { date: new Date() });
   * // => "Updated Dec 28, 2025"
   * ```
   */
  format(message: string, values: TranslationValues = {}): string {
    try {
      // Get or create parsed message
      let formatter = this.cache.get(message);

      if (!formatter) {
        // Parse the message
        formatter = new IntlMessageFormat(message, this.locale);

        // Cache if under limit
        if (this.cache.size < this.maxCacheSize) {
          this.cache.set(message, formatter);
        } else {
          // LRU eviction: remove oldest entry
          const firstKey = this.cache.keys().next().value;
          if (firstKey) {
            this.cache.delete(firstKey);
          }
          this.cache.set(message, formatter);
        }
      }

      // Format with values
      const result = formatter.format(values);

      // IntlMessageFormat can return string or array of parts
      // We always want a string
      if (Array.isArray(result)) {
        return result.join('');
      }

      return result as string;
    } catch (error) {
      // On parse error, return original message
      // This prevents breaking the UI on malformed messages
      console.warn(`[Lingx] ICU parse error for message: "${message.substring(0, 50)}..."`, error);
      return message;
    }
  }

  /**
   * Change the formatter's locale.
   * This clears the cache since parsed messages are locale-specific.
   *
   * @param locale - New BCP 47 language tag
   */
  setLanguage(locale: string): void {
    if (locale !== this.locale) {
      this.locale = locale;
      this.cache.clear();
    }
  }

  /**
   * Get the current locale
   */
  getLanguage(): string {
    return this.locale;
  }

  /**
   * Clear the message cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get the current cache size (for testing/debugging)
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

/**
 * Check if a message contains ICU MessageFormat syntax.
 * Useful for optimization - skip ICU parsing for simple messages.
 *
 * @param message - Translation string
 * @returns true if message contains ICU syntax
 */
export function hasICUSyntax(message: string): boolean {
  // ICU syntax patterns:
  // - Plural: {name, plural, ...}
  // - Select: {name, select, ...}
  // - SelectOrdinal: {name, selectordinal, ...}
  // - Number: {name, number, ...}
  // - Date: {name, date, ...}
  // - Time: {name, time, ...}
  return /\{[^}]+,\s*(plural|select|selectordinal|number|date|time)/i.test(message);
}
