/**
 * Field-level error structure returned by API
 */
export interface FieldError {
  field: string;
  message: string;
  code: string;
}

/**
 * Unique violation error codes for each entity
 */
export const UNIQUE_VIOLATION_CODES = {
  USER_EMAIL: 'USER_EMAIL_EXISTS',
  PROJECT_SLUG: 'PROJECT_SLUG_EXISTS',
  SPACE_SLUG: 'SPACE_SLUG_EXISTS',
  BRANCH_SLUG: 'BRANCH_SLUG_EXISTS',
  ENVIRONMENT_SLUG: 'ENVIRONMENT_SLUG_EXISTS',
  TRANSLATION_KEY: 'TRANSLATION_KEY_EXISTS',
  API_KEY_NAME: 'API_KEY_NAME_EXISTS',
} as const;

export type UniqueViolationCode =
  (typeof UNIQUE_VIOLATION_CODES)[keyof typeof UNIQUE_VIOLATION_CODES];
