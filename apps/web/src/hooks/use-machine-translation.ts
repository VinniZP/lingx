'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  machineTranslationApi,
  type MTProvider,
  type MTConfig,
  type MTTranslateResult,
  type MTUsageStats,
} from '@/lib/api';

/**
 * Query keys for MT caching
 */
export const mtQueryKeys = {
  all: ['machine-translation'] as const,
  configs: (projectId: string) =>
    [...mtQueryKeys.all, 'configs', projectId] as const,
  usage: (projectId: string) =>
    [...mtQueryKeys.all, 'usage', projectId] as const,
};

/**
 * Hook to get MT configurations for a project
 */
export function useMTConfigs(projectId: string) {
  return useQuery({
    queryKey: mtQueryKeys.configs(projectId),
    queryFn: () => machineTranslationApi.getConfigs(projectId),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!projectId,
  });
}

/**
 * Hook to save MT configuration
 */
export function useSaveMTConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      provider: MTProvider;
      apiKey: string;
      isActive?: boolean;
      priority?: number;
    }) => machineTranslationApi.saveConfig(projectId, data),
    onSuccess: () => {
      // Invalidate configs cache
      queryClient.invalidateQueries({
        queryKey: mtQueryKeys.configs(projectId),
      });
    },
  });
}

/**
 * Hook to delete MT configuration
 */
export function useDeleteMTConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: MTProvider) =>
      machineTranslationApi.deleteConfig(projectId, provider),
    onSuccess: () => {
      // Invalidate configs cache
      queryClient.invalidateQueries({
        queryKey: mtQueryKeys.configs(projectId),
      });
    },
  });
}

/**
 * Hook to test MT provider connection
 */
export function useTestMTConnection(projectId: string) {
  return useMutation({
    mutationFn: (provider: MTProvider) =>
      machineTranslationApi.testConnection(projectId, provider),
  });
}

/**
 * Hook to translate a single text
 */
export function useMTTranslate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
      provider?: MTProvider;
    }) => machineTranslationApi.translate(projectId, data),
    onSuccess: () => {
      // Optionally invalidate usage stats
      queryClient.invalidateQueries({
        queryKey: mtQueryKeys.usage(projectId),
      });
    },
  });
}

/**
 * Hook to translate with AI context from related translations and glossary.
 * Provides higher quality translations by leveraging surrounding context.
 */
export function useMTTranslateWithContext(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      branchId: string;
      keyId: string;
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
      provider?: MTProvider;
    }) => machineTranslationApi.translateWithContext(projectId, data),
    onSuccess: () => {
      // Optionally invalidate usage stats
      queryClient.invalidateQueries({
        queryKey: mtQueryKeys.usage(projectId),
      });
    },
  });
}

/**
 * Hook to batch translate keys
 */
export function useMTBatchTranslate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      keyIds: string[];
      targetLanguage: string;
      provider?: MTProvider;
      overwriteExisting?: boolean;
    }) => machineTranslationApi.translateBatch(projectId, data),
    onSuccess: () => {
      // Invalidate usage stats
      queryClient.invalidateQueries({
        queryKey: mtQueryKeys.usage(projectId),
      });
    },
  });
}

/**
 * Hook to pre-translate missing translations
 */
export function useMTPreTranslate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      branchId: string;
      targetLanguages: string[];
      provider?: MTProvider;
    }) => machineTranslationApi.preTranslate(projectId, data),
    onSuccess: () => {
      // Invalidate usage stats
      queryClient.invalidateQueries({
        queryKey: mtQueryKeys.usage(projectId),
      });
    },
  });
}

/**
 * Hook to get MT usage statistics
 */
export function useMTUsage(projectId: string) {
  return useQuery({
    queryKey: mtQueryKeys.usage(projectId),
    queryFn: () => machineTranslationApi.getUsage(projectId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!projectId,
  });
}

/**
 * Helper: Get provider display name
 */
export function getProviderDisplayName(provider: MTProvider): string {
  switch (provider) {
    case 'DEEPL':
      return 'DeepL';
    case 'GOOGLE_TRANSLATE':
      return 'Google Translate';
    default:
      return provider;
  }
}

/**
 * Helper: Format cost as USD
 */
export function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(cost);
}

/**
 * Helper: Format character count
 */
export function formatCharacterCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}
