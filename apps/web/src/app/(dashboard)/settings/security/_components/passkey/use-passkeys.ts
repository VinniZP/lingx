'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lingx/sdk-nextjs';
import { webauthnApi } from '@/lib/api';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { toast } from 'sonner';

export const PASSKEY_QUERY_KEYS = {
  status: ['webauthn-status'],
  credentials: ['webauthn-credentials'],
} as const;

export function usePasskeySupport() {
  return typeof window !== 'undefined' && browserSupportsWebAuthn();
}

export function usePasskeyStatus() {
  const supportsPasskey = usePasskeySupport();

  return useQuery({
    queryKey: PASSKEY_QUERY_KEYS.status,
    queryFn: () => webauthnApi.getStatus(),
    enabled: supportsPasskey,
  });
}

export function usePasskeyCredentials() {
  const supportsPasskey = usePasskeySupport();

  const query = useQuery({
    queryKey: PASSKEY_QUERY_KEYS.credentials,
    queryFn: () => webauthnApi.listCredentials(),
    enabled: supportsPasskey,
  });

  return {
    ...query,
    credentials: query.data?.credentials || [],
  };
}

export function useRegisterPasskey(options?: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { options: regOptions, challengeToken } =
        await webauthnApi.getRegistrationOptions();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const regResponse = await startRegistration({ optionsJSON: regOptions as any });
      return webauthnApi.verifyRegistration({
        name,
        challengeToken,
        response: regResponse,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PASSKEY_QUERY_KEYS.credentials });
      queryClient.invalidateQueries({ queryKey: PASSKEY_QUERY_KEYS.status });
      toast.success(t('security.passkeys.toasts.passkeyAdded'));
      options?.onSuccess?.();
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : t('security.passkeys.toasts.passkeyAddFailed');
      toast.error(message);
    },
  });
}

export function useDeletePasskey(options?: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: webauthnApi.deleteCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PASSKEY_QUERY_KEYS.credentials });
      queryClient.invalidateQueries({ queryKey: PASSKEY_QUERY_KEYS.status });
      toast.success(t('security.passkeys.toasts.passkeyDeleted'));
      options?.onSuccess?.();
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : t('security.passkeys.toasts.passkeyDeleteFailed');
      toast.error(message);
    },
  });
}

export function useGoPasswordless(options?: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: webauthnApi.goPasswordless,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PASSKEY_QUERY_KEYS.status });
      toast.success(t('security.passkeys.toasts.passwordlessEnabled'), {
        description: t('security.passkeys.toasts.passwordlessEnabledDescription'),
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : t('security.passkeys.toasts.passwordlessFailed');
      toast.error(message);
    },
  });
}
