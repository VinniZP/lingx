import { tKey, type TKey } from '@localeflow/sdk-nextjs';

// Translation keys for relative time - wrapped with tKey for static extraction
// Uses existing keys from time.* namespace in locales
export const dateKeys = {
  justNow: tKey('time.justNow'),
  minutesAgo: tKey('time.minutesAgo'),
  hoursAgo: tKey('time.hoursAgo'),
  daysAgo: tKey('time.daysAgo'),
  today: tKey('time.today'),
  yesterday: tKey('time.yesterday'),
} as const;

export type RelativeTimeResult =
  | { type: 'justNow'; key: TKey }
  | { type: 'minutesAgo'; key: TKey; value: number }
  | { type: 'hoursAgo'; key: TKey; value: number }
  | { type: 'daysAgo'; key: TKey; value: number }
  | { type: 'date'; formatted: string };

export type FormatDateResult =
  | { type: 'today'; key: TKey }
  | { type: 'yesterday'; key: TKey }
  | { type: 'daysAgo'; key: TKey; value: number }
  | { type: 'date'; formatted: string };

/**
 * Get relative time info for a date.
 * Returns translation key and value for i18n formatting.
 *
 * @example
 * const result = getRelativeTimeInfo(date);
 * if (result.type === 'date') {
 *   return result.formatted;
 * }
 * return result.value ? td(result.key, { value: result.value }) : td(result.key);
 */
export function getRelativeTimeInfo(date: Date): RelativeTimeResult {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return { type: 'justNow', key: dateKeys.justNow };
  }
  if (diffMins < 60) {
    return { type: 'minutesAgo', key: dateKeys.minutesAgo, value: diffMins };
  }
  if (diffHours < 24) {
    return { type: 'hoursAgo', key: dateKeys.hoursAgo, value: diffHours };
  }
  if (diffDays < 7) {
    return { type: 'daysAgo', key: dateKeys.daysAgo, value: diffDays };
  }

  return {
    type: 'date',
    formatted: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  };
}

/**
 * Get formatted date info for a date string.
 * Returns translation key and value for i18n formatting.
 *
 * @example
 * const result = getFormatDateInfo(dateString);
 * if (result.type === 'date') {
 *   return result.formatted;
 * }
 * return result.value ? td(result.key, { value: result.value }) : td(result.key);
 */
export function getFormatDateInfo(dateString: string): FormatDateResult {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return { type: 'today', key: dateKeys.today };
  }
  if (diffDays === 1) {
    return { type: 'yesterday', key: dateKeys.yesterday };
  }
  if (diffDays < 7) {
    return { type: 'daysAgo', key: dateKeys.daysAgo, value: diffDays };
  }

  return {
    type: 'date',
    formatted: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }),
  };
}
