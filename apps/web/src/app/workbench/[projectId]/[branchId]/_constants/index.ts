/**
 * Workbench constants - centralized configuration for magic numbers
 */

// Pagination
export const KEYS_PER_PAGE = 50;

/**
 * Batch operation size for bulk approval/rejection.
 *
 * Rationale: 100 items per chunk balances:
 * - API response time (larger batches = slower individual requests)
 * - Database transaction size (prevent lock contention)
 * - Memory usage on client and server
 * - User experience (parallel chunks provide faster completion)
 *
 * This matches the backend MAX_BATCH_SIZE validation limit.
 */
export const BATCH_SIZE = 100;

// Auto-save debounce delay in milliseconds
export const AUTO_SAVE_DEBOUNCE_MS = 1500;

// Focus delay for textarea after expansion (allows DOM to update)
export const FOCUS_DELAY_MS = 50;

// Saved indicator display duration
export const SAVED_INDICATOR_DURATION_MS = 2000;

// Bottom dock resize limits
export const BOTTOM_DOCK_MIN_HEIGHT = 120;
export const BOTTOM_DOCK_MAX_HEIGHT = 500;
export const BOTTOM_DOCK_DEFAULT_HEIGHT = 180;

// Suggestions cache
export const SUGGESTIONS_CACHE_MAX_SIZE = 50;

// TM search
export const TM_MIN_SIMILARITY = 0.6;
export const TM_RESULT_LIMIT = 5;
export const TM_MIN_SOURCE_LENGTH = 3;
