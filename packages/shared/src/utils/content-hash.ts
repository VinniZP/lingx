/**
 * Content Hash Utility (Browser-compatible)
 *
 * Generates deterministic hashes for quality score cache validation.
 * Works in both Node.js and browser environments.
 */

/**
 * Simple hash function using djb2 algorithm.
 * Fast and produces consistent results across environments.
 *
 * @param str - Input string to hash
 * @returns Numeric hash value
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Generate a content hash from source and target text.
 *
 * The hash is deterministic: same inputs always produce same output.
 * Used for cache validation when translation content changes.
 *
 * Note: This produces a different hash than the server-side SHA-256 version,
 * but is compatible for cache invalidation since both are deterministic.
 *
 * @param source - Source text (original language)
 * @param target - Target text (translation)
 * @returns 16-character hex hash
 *
 * @example
 * generateContentHash('Hello', 'Bonjour')
 * // Returns: 'a1b2c3d4e5f6g7h8'
 */
export function generateContentHash(source: string, target: string): string {
  const combined = `${source}|${target}`;
  // Generate two hashes for 64-bit coverage, convert to hex
  const hash1 = djb2Hash(combined);
  const hash2 = djb2Hash(combined + combined); // Different salt
  return hash1.toString(16).padStart(8, '0') + hash2.toString(16).padStart(8, '0');
}

/**
 * Check if a quality score is stale based on content hash comparison.
 *
 * IMPORTANT: The server uses SHA-256 for hash generation, so direct comparison
 * won't work. Instead, use this to detect if content has changed by comparing
 * the stored hash against the current hash computed on the server.
 *
 * For frontend staleness detection, compare stored contentHash with null:
 * - If contentHash is null, score is legacy (pre-caching) and should be re-evaluated
 * - If contentHash exists, it was valid at the time of scoring
 *
 * @param storedHash - Hash stored with the quality score
 * @returns true if score needs re-evaluation (stale or legacy)
 */
export function isQualityScoreStale(storedHash: string | null | undefined): boolean {
  // Scores without contentHash are legacy and should be re-evaluated
  return !storedHash;
}
