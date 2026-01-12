/**
 * Content Hash Generator
 *
 * Generates deterministic hashes for caching quality scores.
 * When source or target text changes, the hash changes,
 * invalidating cached scores.
 */

import { createHash } from 'crypto';

/**
 * Hash configuration
 */
export const HASH_CONFIG = {
  /** Hash algorithm */
  algorithm: 'sha256',
  /** Output encoding */
  encoding: 'hex' as const,
  /** Hash length (truncated for storage efficiency) */
  length: 16,
} as const;

/**
 * Generate a content hash from source and target text.
 *
 * The hash is deterministic: same inputs always produce same output.
 * Used for cache invalidation when translation content changes.
 *
 * @param source - Source text (original language)
 * @param target - Target text (translation)
 * @returns 16-character hex hash
 *
 * @example
 * generateContentHash('Hello', 'Bonjour')
 * // Returns: 'a1b2c3d4e5f6g7h8'
 *
 * // Same inputs produce same hash
 * generateContentHash('Hello', 'Bonjour') === generateContentHash('Hello', 'Bonjour')
 * // true
 */
export function generateContentHash(source: string, target: string): string {
  return createHash(HASH_CONFIG.algorithm)
    .update(`${source}|${target}`)
    .digest(HASH_CONFIG.encoding)
    .substring(0, HASH_CONFIG.length);
}

/**
 * Check if a cached score is still valid based on content hash.
 *
 * @param cachedHash - Hash stored with the cached score
 * @param source - Current source text
 * @param target - Current target text
 * @returns true if cache is valid (content unchanged)
 */
export function isContentHashValid(
  cachedHash: string | null,
  source: string,
  target: string
): boolean {
  if (!cachedHash) return false;
  return cachedHash === generateContentHash(source, target);
}
