/**
 * Quality Estimation API Client
 *
 * Type-safe API calls for translation quality scoring operations
 */

import type {
  BatchQualityJobResult,
  BranchQualitySummary,
  ICUValidationResult,
  QualityIssue,
  QualityScore,
  QualityScoringConfig,
} from '@lingx/shared';

// Re-export shared types for consumers
export type { BranchQualitySummary, ICUValidationResult, QualityIssue, QualityScore };

// Backward-compatible alias
export type BatchQualityResult = BatchQualityJobResult;

// Alias for backward compatibility
export type QualityConfig = QualityScoringConfig;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * API Error class for quality API errors
 */
export class QualityApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'QualityApiError';
  }
}

/**
 * Internal fetch wrapper with error handling
 */
async function fetchQualityApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    }));
    throw new QualityApiError(response.status, error.code, error.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get cached quality score for a translation (does not trigger evaluation)
 *
 * @param translationId - Translation ID
 * @returns Cached quality score or null if not evaluated yet
 */
async function getCachedQualityScore(translationId: string): Promise<QualityScore | null> {
  return fetchQualityApi<QualityScore | null>(`/api/translations/${translationId}/quality`, {
    method: 'GET',
  });
}

/**
 * Evaluate quality score for a single translation (triggers evaluation)
 *
 * @param translationId - Translation ID to evaluate
 * @param forceAI - Force AI evaluation even if heuristics pass
 * @returns Quality score with dimension breakdown
 */
async function evaluateTranslationQuality(
  translationId: string,
  forceAI?: boolean
): Promise<QualityScore> {
  return fetchQualityApi<QualityScore>(`/api/translations/${translationId}/quality`, {
    method: 'POST',
    body: JSON.stringify({ forceAI }),
  });
}

/**
 * Queue batch quality evaluation job for translations
 *
 * @param branchId - Branch ID
 * @param translationIds - Optional array of translation IDs (defaults to all in branch)
 * @param forceAI - Force AI evaluation for all translations (bypasses cache)
 * @returns Job ID and stats (total, cached, queued)
 */
export async function queueBatchQuality(
  branchId: string,
  translationIds?: string[],
  forceAI?: boolean
): Promise<BatchQualityResult> {
  return fetchQualityApi<BatchQualityResult>(`/api/branches/${branchId}/quality/batch`, {
    method: 'POST',
    body: JSON.stringify({ translationIds, forceAI }),
  });
}

/**
 * Get quality summary statistics for a branch
 *
 * @param branchId - Branch ID
 * @returns Summary with average score, distribution, and breakdown by language
 */
async function getBranchQualitySummary(branchId: string): Promise<BranchQualitySummary> {
  return fetchQualityApi<BranchQualitySummary>(`/api/branches/${branchId}/quality/summary`);
}

/**
 * Get quality scoring configuration for a project
 *
 * @param projectId - Project ID
 * @returns Quality scoring configuration
 */
export async function getQualityConfig(projectId: string): Promise<QualityConfig> {
  return fetchQualityApi<QualityConfig>(`/api/projects/${projectId}/quality/config`);
}

/**
 * Update quality scoring configuration for a project
 *
 * @param projectId - Project ID
 * @param config - Partial configuration to update
 * @returns Updated quality scoring configuration
 */
export async function updateQualityConfig(
  projectId: string,
  config: Partial<QualityConfig>
): Promise<QualityConfig> {
  return fetchQualityApi<QualityConfig>(`/api/projects/${projectId}/quality/config`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

/**
 * Validate ICU MessageFormat syntax
 *
 * @param text - Text to validate
 * @returns Validation result with error message if invalid
 */
export async function validateICUSyntax(text: string): Promise<ICUValidationResult> {
  return fetchQualityApi<ICUValidationResult>('/api/quality/validate-icu', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/**
 * Response for key quality issues endpoint
 */
export interface KeyQualityIssuesResponse {
  issues: Record<string, QualityIssue[]>;
}

/**
 * Get quality issues for all translations of a key, grouped by language
 *
 * @param keyId - Translation key ID
 * @returns Issues grouped by language code
 */
export async function getKeyQualityIssues(keyId: string): Promise<KeyQualityIssuesResponse> {
  return fetchQualityApi<KeyQualityIssuesResponse>(`/api/keys/${keyId}/quality/issues`);
}
