/**
 * Project API contracts
 */

/**
 * Statistics for a single project.
 * Used in project cards and list views.
 */
export interface ProjectStats {
  /** Total number of translation keys in the project */
  totalKeys: number;

  /** Number of keys that have translations in all languages */
  translatedKeys: number;

  /**
   * Overall translation completion rate (0-1)
   * Calculated as: total translations / (totalKeys * languageCount)
   */
  completionRate: number;
}

/**
 * Language info embedded in project responses
 */
export interface ProjectLanguage {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

/**
 * Project with embedded statistics.
 * Returned by GET /api/projects (list endpoint)
 */
export interface ProjectWithStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultLanguage: string;
  createdAt: string;
  updatedAt: string;
  languages: ProjectLanguage[];
  stats: ProjectStats;
}
