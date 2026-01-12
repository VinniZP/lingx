/**
 * Quality Module Constants
 *
 * Default configuration values for quality scoring.
 */

import type { QualityScoringConfig } from '@lingx/shared';

/**
 * Default quality scoring configuration.
 *
 * Used when a project has no custom config set.
 */
export const DEFAULT_QUALITY_CONFIG: QualityScoringConfig = {
  scoreAfterAITranslation: true,
  scoreBeforeMerge: false,
  autoApproveThreshold: 80,
  flagThreshold: 60,
  aiEvaluationEnabled: true,
  aiEvaluationProvider: null,
  aiEvaluationModel: null,
};
