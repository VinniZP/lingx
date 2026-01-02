/**
 * Activity Description Utility
 *
 * Generates i18n-ready translation keys for activity items.
 * Returns translation keys with parameters for caller to translate.
 */
import type { Activity } from '@lingx/shared';
import { tKey, type TKey, type TranslationValues, type DynamicTranslationFunction } from '@lingx/sdk-nextjs';

/**
 * Translation key with optional interpolation parameters.
 */
export type TranslationKeyObj = {
  key: TKey;
  params?: TranslationValues;
};

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
 * @returns Translation key with params for relative time
 */
export function formatRelativeTime(dateString: string): TranslationKeyObj {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return { key: tKey('time.justNow') };
  if (diffMins < 60) return { key: tKey('time.minutesAgo'), params: { count: diffMins } };
  if (diffHours < 24) return { key: tKey('time.hoursAgo'), params: { count: diffHours } };
  if (diffDays === 1) return { key: tKey('time.yesterday') };
  if (diffDays < 7) return { key: tKey('time.daysAgo'), params: { count: diffDays } };

  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return { key: tKey('time.date'), params: { date: formattedDate } };
}

/**
 * Get activity description based on type and metadata.
 *
 * @param activity - Activity item
 * @returns Translation key with params for activity description
 */
export function getActivityDescription(activity: Activity): TranslationKeyObj {
  const { type, count, metadata } = activity;
  const languages = formatLanguageList(metadata?.languages);

  switch (type) {
    case 'translation':
      return {
        key: count === 1 ? tKey('activity.description.translationSingle') : tKey('activity.description.translationPlural'),
        params: { count, languages: languages || 'undefined' },
      };

    case 'key_add':
      return {
        key: count === 1 ? tKey('activity.description.keyAddSingle') : tKey('activity.description.keyAddPlural'),
        params: { count },
      };

    case 'key_delete':
      return {
        key: count === 1 ? tKey('activity.description.keyDeleteSingle') : tKey('activity.description.keyDeletePlural'),
        params: { count },
      };

    case 'branch_create':
      return {
        key: metadata?.sourceBranchName
          ? tKey('activity.description.branchCreateWithSource')
          : tKey('activity.description.branchCreate'),
        params: {
          branchName: metadata?.branchName || 'new branch',
          sourceBranchName: metadata?.sourceBranchName || '',
        },
      };

    case 'branch_delete':
      return {
        key: tKey('activity.description.branchDelete'),
        params: { branchName: metadata?.branchName || '' },
      };

    case 'merge':
      return {
        key: tKey('activity.description.merge'),
        params: {
          sourceBranchName: metadata?.sourceBranchName || '',
          targetBranchName: metadata?.targetBranchName || '',
        },
      };

    case 'import':
      const keyCount = metadata?.keyCount || count;
      return {
        key: metadata?.fileName ? tKey('activity.description.importWithFile') : tKey('activity.description.import'),
        params: { count: keyCount, fileName: metadata?.fileName || '' },
      };

    case 'export':
      return {
        key: tKey('activity.description.export'),
        params: { format: metadata?.format || 'file' },
      };

    case 'project_settings':
      return {
        key: tKey('activity.description.projectSettings'),
        params: { fields: metadata?.changedFields?.join(', ') || 'settings' },
      };

    case 'environment_create':
      return {
        key: tKey('activity.description.environmentCreate'),
        params: { environmentName: metadata?.environmentName || '' },
      };

    case 'environment_delete':
      return {
        key: tKey('activity.description.environmentDelete'),
        params: { environmentName: metadata?.environmentName || '' },
      };

    case 'environment_switch_branch':
      return {
        key: tKey('activity.description.environmentSwitchBranch'),
        params: {
          environmentName: metadata?.environmentName || '',
          newBranchName: metadata?.newBranchName || '',
        },
      };

    case 'ai_translate':
      const aiKeyCount = metadata?.keyCount || count;
      const targetLangs = formatLanguageList(metadata?.languages);
      return {
        key: targetLangs ? tKey('activity.description.aiTranslateWithLanguages') : tKey('activity.description.aiTranslate'),
        params: { count: aiKeyCount, languages: targetLangs || 'undefined' },
      };

    default:
      return { key: tKey('activity.description.default') };
  }
}

/**
 * Helper to translate a TranslationKeyObj using the td function.
 *
 * @param td - Dynamic translation function from useTranslation hook
 * @param translationKey - TranslationKeyObj object with key and params
 * @returns Translated string
 */
export function translateKey(
  td: DynamicTranslationFunction,
  translationKey: TranslationKeyObj
): string {
  return td(translationKey.key, translationKey.params);
}
