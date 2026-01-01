'use client';

import { useMemo } from 'react';
import { useTranslation } from '@localeflow/sdk-nextjs';
import {
  getRelativeTimeInfo,
  getFormatDateInfo,
  type RelativeTimeResult,
  type FormatDateResult,
} from '@/lib/date';

/**
 * Hook for formatting relative time with i18n support.
 *
 * @example
 * const { formatRelativeTime, formatDate } = useRelativeTime();
 * return <span>{formatRelativeTime(new Date())}</span>;
 */
export function useRelativeTime() {
  const { td } = useTranslation();

  const formatRelativeTime = useMemo(
    () => (date: Date): string => {
      const result: RelativeTimeResult = getRelativeTimeInfo(date);

      if (result.type === 'date') {
        return result.formatted;
      }

      if ('value' in result) {
        return td(result.key, { count: result.value });
      }

      return td(result.key);
    },
    [td]
  );

  const formatDate = useMemo(
    () => (dateString: string): string => {
      const result: FormatDateResult = getFormatDateInfo(dateString);

      if (result.type === 'date') {
        return result.formatted;
      }

      if ('value' in result) {
        return td(result.key, { count: result.value });
      }

      return td(result.key);
    },
    [td]
  );

  return { formatRelativeTime, formatDate };
}
