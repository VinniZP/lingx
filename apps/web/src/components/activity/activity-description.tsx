/**
 * Activity Description Utility
 *
 * Generates human-readable descriptions for activity items.
 * Uses structured metadata for i18n-ready formatting.
 */
import type { Activity, ActivityType } from '@localeflow/shared';

/**
 * Format language codes as uppercase comma-separated list.
 *
 * @param languages - Array of language codes
 * @returns Formatted language list (e.g., "EN, DE, FR")
 */
export function formatLanguageList(languages?: string[]): string {
  if (!languages || languages.length === 0) return '';
  return languages.map((l) => l.toUpperCase()).join(', ');
}

/**
 * Format relative time for activity display.
 *
 * @param dateString - ISO date string
 * @returns Human-readable relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get activity description based on type and metadata.
 *
 * @param activity - Activity item
 * @returns Human-readable description
 */
export function getActivityDescription(activity: Activity): string {
  const { type, count, metadata } = activity;
  const languages = formatLanguageList(metadata?.languages);

  switch (type) {
    case 'translation':
      return count === 1
        ? `Updated translation${languages ? ` in ${languages}` : ''}`
        : `Updated ${count} translations${languages ? ` in ${languages}` : ''}`;

    case 'key_add':
      return count === 1 ? 'Added translation key' : `Added ${count} translation keys`;

    case 'key_delete':
      return count === 1 ? 'Deleted translation key' : `Deleted ${count} translation keys`;

    case 'branch_create':
      const sourceName = metadata?.sourceBranchName
        ? ` from "${metadata.sourceBranchName}"`
        : '';
      return `Created branch "${metadata?.branchName || 'new branch'}"${sourceName}`;

    case 'branch_delete':
      return `Deleted branch "${metadata?.branchName || ''}"`;

    case 'merge':
      return `Merged "${metadata?.sourceBranchName}" into "${metadata?.targetBranchName}"`;

    case 'import':
      const keyCount = metadata?.keyCount || count;
      const fileName = metadata?.fileName ? ` from ${metadata.fileName}` : '';
      return `Imported ${keyCount} key${keyCount !== 1 ? 's' : ''}${fileName}`;

    case 'export':
      const format = metadata?.format || 'file';
      return `Exported translations to ${format}`;

    case 'project_settings':
      const fields = metadata?.changedFields?.join(', ') || 'settings';
      return `Updated project ${fields}`;

    case 'environment_create':
      return `Created environment "${metadata?.environmentName}"`;

    case 'environment_delete':
      return `Deleted environment "${metadata?.environmentName}"`;

    case 'environment_switch_branch':
      return `Switched "${metadata?.environmentName}" to "${metadata?.newBranchName}"`;

    case 'ai_translate':
      const aiKeyCount = metadata?.keyCount || count;
      const targetLangs = formatLanguageList(metadata?.languages);
      return `AI translated ${aiKeyCount} key${aiKeyCount !== 1 ? 's' : ''}${targetLangs ? ` to ${targetLangs}` : ''}`;

    default:
      return 'Activity recorded';
  }
}

/**
 * Get a short action verb for the activity type.
 *
 * @param type - Activity type
 * @returns Short action verb
 */
export function getActivityVerb(type: ActivityType): string {
  switch (type) {
    case 'translation':
      return 'Updated';
    case 'key_add':
      return 'Added';
    case 'key_delete':
      return 'Deleted';
    case 'branch_create':
      return 'Created';
    case 'branch_delete':
      return 'Deleted';
    case 'merge':
      return 'Merged';
    case 'import':
      return 'Imported';
    case 'export':
      return 'Exported';
    case 'project_settings':
      return 'Updated';
    case 'environment_create':
      return 'Created';
    case 'environment_delete':
      return 'Deleted';
    case 'environment_switch_branch':
      return 'Switched';
    case 'ai_translate':
      return 'Translated';
    default:
      return 'Modified';
  }
}
