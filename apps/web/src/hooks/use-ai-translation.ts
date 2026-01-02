'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  aiTranslationApi,
  type AIProvider,
  type AIConfig,
  type AIContextConfig,
  type AITranslateResult,
  type AIUsageStats,
} from '@/lib/api';

/**
 * Query keys for AI caching
 */
export const aiQueryKeys = {
  all: ['ai-translation'] as const,
  configs: (projectId: string) =>
    [...aiQueryKeys.all, 'configs', projectId] as const,
  contextConfig: (projectId: string) =>
    [...aiQueryKeys.all, 'context-config', projectId] as const,
  usage: (projectId: string) =>
    [...aiQueryKeys.all, 'usage', projectId] as const,
  models: (provider: AIProvider) =>
    [...aiQueryKeys.all, 'models', provider] as const,
};

/**
 * Hook to get AI configurations for a project
 */
export function useAIConfigs(projectId: string) {
  return useQuery({
    queryKey: aiQueryKeys.configs(projectId),
    queryFn: () => aiTranslationApi.getConfigs(projectId),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!projectId,
  });
}

/**
 * Hook to save AI configuration
 */
export function useSaveAIConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      provider: AIProvider;
      apiKey?: string; // Optional for updates (to change model/isActive without re-entering key)
      model: string;
      isActive?: boolean;
      priority?: number;
    }) => aiTranslationApi.saveConfig(projectId, data),
    onSuccess: () => {
      // Invalidate configs cache
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.configs(projectId),
      });
    },
  });
}

/**
 * Hook to delete AI configuration
 */
export function useDeleteAIConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: AIProvider) =>
      aiTranslationApi.deleteConfig(projectId, provider),
    onSuccess: () => {
      // Invalidate configs cache
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.configs(projectId),
      });
    },
  });
}

/**
 * Hook to get AI context configuration
 */
export function useAIContextConfig(projectId: string) {
  return useQuery({
    queryKey: aiQueryKeys.contextConfig(projectId),
    queryFn: () => aiTranslationApi.getContextConfig(projectId),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!projectId,
  });
}

/**
 * Hook to update AI context configuration
 */
export function useUpdateAIContextConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<AIContextConfig>) =>
      aiTranslationApi.updateContextConfig(projectId, data),
    onSuccess: () => {
      // Invalidate context config cache
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.contextConfig(projectId),
      });
    },
  });
}

/**
 * Hook to test AI provider connection
 */
export function useTestAIConnection(projectId: string) {
  return useMutation({
    mutationFn: (provider: AIProvider) =>
      aiTranslationApi.testConnection(projectId, provider),
  });
}

/**
 * Hook to get supported models for a provider
 */
export function useAISupportedModels(provider: AIProvider) {
  return useQuery({
    queryKey: aiQueryKeys.models(provider),
    queryFn: () => aiTranslationApi.getSupportedModels(provider),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - models don't change often
    enabled: !!provider,
  });
}

/**
 * Hook to translate text using AI
 */
export function useAITranslate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
      keyId?: string;
      branchId?: string;
      provider?: AIProvider;
    }) => aiTranslationApi.translate(projectId, data),
    onSuccess: () => {
      // Invalidate usage stats
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.usage(projectId),
      });
    },
  });
}

/**
 * Hook to get AI usage statistics
 */
export function useAIUsage(projectId: string) {
  return useQuery({
    queryKey: aiQueryKeys.usage(projectId),
    queryFn: () => aiTranslationApi.getUsage(projectId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!projectId,
  });
}

/**
 * Helper: Get provider display name
 */
export function getAIProviderDisplayName(provider: AIProvider): string {
  switch (provider) {
    case 'OPENAI':
      return 'OpenAI';
    case 'ANTHROPIC':
      return 'Anthropic';
    case 'GOOGLE_AI':
      return 'Google AI';
    case 'MISTRAL':
      return 'Mistral';
    default:
      return provider;
  }
}

/**
 * Helper: Get model display name (truncate long model names)
 */
export function getModelDisplayName(model: string): string {
  // Map common models to friendly names (December 2025)
  const modelNames: Record<string, string> = {
    // OpenAI GPT-5.x and GPT-4.1 series (2025)
    'gpt-5.2': 'GPT-5.2',
    'gpt-5.1': 'GPT-5.1',
    'gpt-4.1': 'GPT-4.1',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
    'o4-mini': 'o4-mini',
    // Anthropic Claude 4.5 series (2025) - alias format
    'claude-sonnet-4-5': 'Claude 4.5 Sonnet',
    'claude-haiku-4-5': 'Claude 4.5 Haiku',
    'claude-opus-4-5': 'Claude 4.5 Opus',
    // Google AI Gemini 3 (Nov 2025)
    'gemini-3-flash': 'Gemini 3 Flash',
    'gemini-3-pro': 'Gemini 3 Pro',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    // Mistral
    'mistral-large-latest': 'Mistral Large',
    'mistral-small-latest': 'Mistral Small',
  };

  return modelNames[model] || model;
}

/**
 * Helper: Format token count
 */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Helper: Format cost as USD
 */
export function formatAICost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(cost);
}

// Re-export types for convenience
export type { AIProvider, AIConfig, AIContextConfig, AITranslateResult, AIUsageStats };
