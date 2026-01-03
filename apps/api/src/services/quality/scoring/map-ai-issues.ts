/**
 * AI Issue Mapping
 *
 * Maps AI evaluation issues to QualityIssue format.
 */

import type { QualityIssue } from '@lingx/shared';

/**
 * AI issue from evaluator
 */
export interface AIIssue {
  type: string;
  severity: 'critical' | 'major' | 'minor';
  message: string;
}

/**
 * Map AI severity to QualityIssue severity.
 *
 * - critical → error
 * - major → warning
 * - minor → info
 */
function mapSeverity(severity: AIIssue['severity']): QualityIssue['severity'] {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'major':
      return 'warning';
    case 'minor':
      return 'info';
    default:
      return 'info';
  }
}

/**
 * Map AI evaluation issues to QualityIssue format.
 *
 * Transforms:
 * - Type gets 'ai_' prefix to distinguish from heuristic issues
 * - Severity mapped: critical→error, major→warning, minor→info
 * - Message preserved as-is
 *
 * @param aiIssues - Issues from AI evaluator
 * @returns QualityIssue array
 */
export function mapAIIssuesToQualityIssues(aiIssues: AIIssue[]): QualityIssue[] {
  return aiIssues.map((issue) => ({
    type: `ai_${issue.type}` as QualityIssue['type'],
    severity: mapSeverity(issue.severity),
    message: issue.message,
  }));
}
