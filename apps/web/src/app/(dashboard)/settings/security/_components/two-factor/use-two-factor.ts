'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { totpApi } from '@/lib/api';
import { toast } from 'sonner';

export const TOTP_QUERY_KEYS = {
  status: ['totp-status'] as const,
} as const;

export function useTotpStatus() {
  return useQuery({
    queryKey: TOTP_QUERY_KEYS.status,
    queryFn: () => totpApi.getStatus(),
  });
}

interface UseDisableTotpOptions {
  onSuccess?: () => void;
}

export function useDisableTotp(options: UseDisableTotpOptions = {}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: totpApi.disable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOTP_QUERY_KEYS.status });
      toast.success(t('security.twoFactor.disabled'));
      options.onSuccess?.();
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('security.twoFactor.disableFailed'));
      }
    },
  });
}

interface UseRegenerateBackupCodesOptions {
  onSuccess?: (codes: string[]) => void;
}

export function useRegenerateBackupCodes(
  options: UseRegenerateBackupCodesOptions = {}
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: totpApi.regenerateBackupCodes,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TOTP_QUERY_KEYS.status });
      options.onSuccess?.(data.backupCodes);
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('security.twoFactor.regenerateFailed'));
      }
    },
  });
}

