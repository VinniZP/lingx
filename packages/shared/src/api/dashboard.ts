/**
 * Dashboard API contracts
 */

/**
 * Aggregate statistics for the user's dashboard.
 * Returned by GET /api/dashboard/stats
 */
export interface DashboardStats {
  /** Total number of projects the user has access to */
  totalProjects: number;

  /** Total number of translation keys across all projects */
  totalKeys: number;

  /** Total number of unique languages across all projects */
  totalLanguages: number;

  /**
   * Overall translation completion rate (0-1)
   * Calculated as: translatedKeys / (totalKeys * totalLanguages)
   */
  completionRate: number;

  /** Number of keys that have at least one translation */
  translatedKeys: number;

  /** Total number of non-empty translations */
  totalTranslations: number;
}
