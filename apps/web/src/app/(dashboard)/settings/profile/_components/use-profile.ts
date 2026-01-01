'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { profileApi, projectApi, type UserPreferences } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { handleApiFieldErrors } from '@/lib/form-errors';
import type { UseFormSetError } from 'react-hook-form';

export const PROFILE_QUERY_KEYS = {
  profile: ['profile'] as const,
  projects: ['projects'] as const,
} as const;

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.profile,
    queryFn: () => profileApi.get(),
    enabled: !!user,
  });
}

export function useProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.projects,
    queryFn: () => projectApi.list(),
    enabled: !!user,
  });
}

export function useUpdateProfile<T extends Record<string, unknown>>(
  setError?: UseFormSetError<T>
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: (data: { name?: string }) => profileApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      refreshUser?.();
      toast.success(t('profile.toasts.profileUpdated'));
    },
    onError: (error) => {
      if (setError) {
        handleApiFieldErrors(error, setError);
      }
    },
  });
}

export function useUploadAvatar() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      refreshUser?.();
      toast.success(t('profile.toasts.avatarUpdated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('profile.toasts.avatarRemoveFailed'));
    },
  });
}

export function useDeleteAvatar() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: () => profileApi.deleteAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      refreshUser?.();
      toast.success(t('profile.toasts.avatarRemoved'));
    },
    onError: () => {
      toast.error(t('profile.toasts.avatarRemoveFailed'));
    },
  });
}

export function useUpdatePreferences() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) => profileApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      toast.success(t('profile.toasts.preferencesSaved'));
    },
    onError: () => {
      toast.error(t('profile.toasts.preferencesSaveFailed'));
    },
  });
}

export function useInitiateEmailChange<T extends Record<string, unknown>>(
  setError?: UseFormSetError<T>,
  onSuccess?: () => void
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { newEmail: string; password: string }) =>
      profileApi.initiateEmailChange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      toast.success(t('profile.toasts.verificationEmailSent'));
      onSuccess?.();
    },
    onError: (error) => {
      if (setError) {
        handleApiFieldErrors(error, setError);
      }
    },
  });
}

export function useCancelEmailChange() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => profileApi.cancelEmailChange(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      toast.success(t('profile.toasts.emailChangeCancelled'));
    },
  });
}
