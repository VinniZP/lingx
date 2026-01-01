/**
 * Namespace Constants
 *
 * Delimiter and utilities for namespace handling across CLI/SDK/API.
 */

/**
 * Namespace delimiter - Unit Separator (U+001F)
 * Used to separate namespace from key in API responses and CLI operations.
 * This ASCII control character never appears in user text or keys.
 */
export const NS_DELIMITER = '\u001F';

/**
 * User-facing delimiter for display purposes
 */
export const NS_USER_DELIMITER = ':';

/**
 * Combine namespace and key with delimiter
 * @param namespace - The namespace (null for root keys)
 * @param key - The key name
 * @returns Combined key in format `namespace␟key` or just `key` for root
 */
export function combineKey(namespace: string | null, key: string): string {
  return namespace ? `${namespace}${NS_DELIMITER}${key}` : key;
}

/**
 * Parse namespace and key from delimiter format
 * @param combinedKey - Key in format `namespace␟key` or just `key`
 * @returns Object with namespace (null for root) and key
 */
export function parseNamespacedKey(combinedKey: string): { namespace: string | null; key: string } {
  const delimIndex = combinedKey.indexOf(NS_DELIMITER);
  if (delimIndex === -1) {
    return { namespace: null, key: combinedKey };
  }
  return {
    namespace: combinedKey.slice(0, delimIndex),
    key: combinedKey.slice(delimIndex + 1),
  };
}

/**
 * Convert to user-facing format (namespace:key)
 * @param namespace - The namespace (null for root keys)
 * @param key - The key name
 * @returns User-friendly format like `namespace:key` or just `key`
 */
export function toUserKey(namespace: string | null, key: string): string {
  return namespace ? `${namespace}${NS_USER_DELIMITER}${key}` : key;
}
