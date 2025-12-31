/**
 * Glossary Hooks
 *
 * Custom hooks for glossary search, CRUD, and management.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  glossaryApi,
  type GlossaryEntry,
  type GlossaryMatch,
  type GlossarySearchParams,
  type GlossaryListParams,
  type GlossaryStats,
  type GlossaryTag,
  type CreateGlossaryEntryInput,
  type UpdateGlossaryEntryInput,
  type MTProvider,
} from '@/lib/api';

// Query key factory for consistent key management
export const glossaryKeys = {
  all: ['glossary'] as const,
  search: (projectId: string, params: GlossarySearchParams | null) =>
    [...glossaryKeys.all, 'search', projectId, params] as const,
  // For list: omit undefined params so invalidation with just projectId works as prefix match
  list: (projectId: string, params?: GlossaryListParams) =>
    params
      ? ([...glossaryKeys.all, 'list', projectId, params] as const)
      : ([...glossaryKeys.all, 'list', projectId] as const),
  entry: (projectId: string, entryId: string) =>
    [...glossaryKeys.all, 'entry', projectId, entryId] as const,
  tags: (projectId: string) => [...glossaryKeys.all, 'tags', projectId] as const,
  stats: (projectId: string) => [...glossaryKeys.all, 'stats', projectId] as const,
  syncStatus: (projectId: string) =>
    [...glossaryKeys.all, 'sync-status', projectId] as const,
};

/**
 * Search for glossary terms within source text.
 * Used in the translation editor to highlight terminology.
 *
 * @param projectId - Project ID
 * @param params - Search parameters
 * @param options - Query options
 */
export function useGlossarySearch(
  projectId: string,
  params: GlossarySearchParams | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: glossaryKeys.search(projectId, params),
    queryFn: () => glossaryApi.search(projectId, params!),
    // Only search if we have valid params and text is >= 2 chars
    enabled:
      options?.enabled !== false &&
      !!params &&
      !!projectId &&
      params.sourceText.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * List glossary entries with filtering and pagination.
 * Used in the glossary management page.
 *
 * @param projectId - Project ID
 * @param params - Filter and pagination params
 */
export function useGlossaryList(projectId: string, params?: GlossaryListParams) {
  return useQuery({
    queryKey: glossaryKeys.list(projectId, params),
    queryFn: () => glossaryApi.list(projectId, params),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get a single glossary entry by ID.
 *
 * @param projectId - Project ID
 * @param entryId - Entry ID
 */
export function useGlossaryEntry(projectId: string, entryId: string | null) {
  return useQuery({
    queryKey: glossaryKeys.entry(projectId, entryId ?? ''),
    queryFn: () => glossaryApi.get(projectId, entryId!),
    enabled: !!projectId && !!entryId,
  });
}

/**
 * Create a new glossary entry.
 *
 * @param projectId - Project ID
 */
export function useCreateGlossaryEntry(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGlossaryEntryInput) =>
      glossaryApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glossaryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.stats(projectId) });
    },
  });
}

/**
 * Update a glossary entry.
 *
 * @param projectId - Project ID
 */
export function useUpdateGlossaryEntry(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      data,
    }: {
      entryId: string;
      data: UpdateGlossaryEntryInput;
    }) => glossaryApi.update(projectId, entryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.entry(projectId, variables.entryId),
      });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.list(projectId) });
    },
  });
}

/**
 * Delete a glossary entry.
 *
 * @param projectId - Project ID
 */
export function useDeleteGlossaryEntry(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => glossaryApi.delete(projectId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glossaryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.stats(projectId) });
    },
  });
}

/**
 * Add a translation to an entry.
 *
 * @param projectId - Project ID
 */
export function useAddGlossaryTranslation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      data,
    }: {
      entryId: string;
      data: { targetLanguage: string; targetTerm: string; notes?: string };
    }) => glossaryApi.addTranslation(projectId, entryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.entry(projectId, variables.entryId),
      });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.list(projectId) });
    },
  });
}

/**
 * Update a translation for an entry.
 *
 * @param projectId - Project ID
 */
export function useUpdateGlossaryTranslation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      lang,
      data,
    }: {
      entryId: string;
      lang: string;
      data: { targetTerm: string; notes?: string | null };
    }) => glossaryApi.updateTranslation(projectId, entryId, lang, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.entry(projectId, variables.entryId),
      });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.list(projectId) });
    },
  });
}

/**
 * Delete a translation from an entry.
 *
 * @param projectId - Project ID
 */
export function useDeleteGlossaryTranslation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, lang }: { entryId: string; lang: string }) =>
      glossaryApi.deleteTranslation(projectId, entryId, lang),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.entry(projectId, variables.entryId),
      });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.list(projectId) });
    },
  });
}

/**
 * Record usage when a glossary term is applied.
 *
 * @param projectId - Project ID
 */
export function useRecordGlossaryUsage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => glossaryApi.recordUsage(projectId, entryId),
    onSuccess: () => {
      // Invalidate search results to reflect updated usage counts
      queryClient.invalidateQueries({
        queryKey: [...glossaryKeys.all, 'search', projectId],
      });
    },
  });
}

/**
 * Get glossary tags for a project.
 *
 * @param projectId - Project ID
 */
export function useGlossaryTags(projectId: string) {
  return useQuery({
    queryKey: glossaryKeys.tags(projectId),
    queryFn: () => glossaryApi.getTags(projectId),
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Create a glossary tag.
 *
 * @param projectId - Project ID
 */
export function useCreateGlossaryTag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      glossaryApi.createTag(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glossaryKeys.tags(projectId) });
    },
  });
}

/**
 * Update a glossary tag.
 *
 * @param projectId - Project ID
 */
export function useUpdateGlossaryTag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tagId,
      data,
    }: {
      tagId: string;
      data: { name?: string; color?: string | null };
    }) => glossaryApi.updateTag(projectId, tagId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glossaryKeys.tags(projectId) });
    },
  });
}

/**
 * Delete a glossary tag.
 *
 * @param projectId - Project ID
 */
export function useDeleteGlossaryTag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => glossaryApi.deleteTag(projectId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glossaryKeys.tags(projectId) });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.list(projectId) });
    },
  });
}

/**
 * Get glossary statistics.
 *
 * @param projectId - Project ID
 */
export function useGlossaryStats(projectId: string) {
  return useQuery({
    queryKey: glossaryKeys.stats(projectId),
    queryFn: () => glossaryApi.getStats(projectId),
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Import glossary from file.
 *
 * @param projectId - Project ID
 */
export function useGlossaryImport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      format,
      overwrite,
    }: {
      file: File;
      format: 'csv' | 'tbx';
      overwrite?: boolean;
    }) => glossaryApi.import(projectId, file, format, overwrite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glossaryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.stats(projectId) });
      queryClient.invalidateQueries({ queryKey: glossaryKeys.tags(projectId) });
    },
  });
}

/**
 * Export glossary to file.
 *
 * @param projectId - Project ID
 */
export function useGlossaryExport(projectId: string) {
  return useMutation({
    mutationFn: ({
      format,
      options,
    }: {
      format: 'csv' | 'tbx';
      options?: {
        sourceLanguage?: string;
        targetLanguages?: string[];
        tagIds?: string[];
        domain?: string;
      };
    }) => glossaryApi.export(projectId, format, options),
  });
}

/**
 * Sync glossary to MT provider.
 *
 * @param projectId - Project ID
 */
export function useGlossarySync(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      provider: MTProvider;
      sourceLanguage: string;
      targetLanguage: string;
    }) => glossaryApi.syncToProvider(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.syncStatus(projectId),
      });
    },
  });
}

/**
 * Get sync status for all providers.
 *
 * @param projectId - Project ID
 */
export function useGlossarySyncStatus(projectId: string) {
  return useQuery({
    queryKey: glossaryKeys.syncStatus(projectId),
    queryFn: () => glossaryApi.getSyncStatus(projectId),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

/**
 * Delete synced glossary from provider.
 *
 * @param projectId - Project ID
 */
export function useDeleteGlossarySync(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      provider,
      sourceLanguage,
      targetLanguage,
    }: {
      provider: MTProvider;
      sourceLanguage: string;
      targetLanguage: string;
    }) =>
      glossaryApi.deleteSyncedGlossary(
        projectId,
        provider,
        sourceLanguage,
        targetLanguage
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.syncStatus(projectId),
      });
    },
  });
}

// Re-export types for convenience
export type {
  GlossaryEntry,
  GlossaryMatch,
  GlossarySearchParams,
  GlossaryListParams,
  GlossaryStats,
  GlossaryTag,
  CreateGlossaryEntryInput,
  UpdateGlossaryEntryInput,
};
