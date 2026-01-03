'use client';

import { branchApi, projectApi, translationApi, type TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export type FilterType =
  | 'all'
  | 'missing'
  | 'complete'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'warnings';
export type QualityFilterType = 'all' | 'excellent' | 'good' | 'needsReview' | 'unscored';

interface UseTranslationsPageDataOptions {
  projectId: string;
  branchId: string;
  search: string;
  page: number;
  filter: FilterType;
  qualityFilter: QualityFilterType;
  namespace: string;
}

interface CurrentBranchInfo {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  keyCount: number;
}

export function useTranslationsPageData({
  projectId,
  branchId,
  search,
  page,
  filter,
  qualityFilter,
  namespace,
}: UseTranslationsPageDataOptions) {
  // Project query
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  // Branch query
  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => branchApi.get(branchId),
  });

  // Keys query with pagination and filtering
  const { data: keysData, isLoading } = useQuery({
    queryKey: ['keys', branchId, search, page, filter, qualityFilter, namespace],
    queryFn: () =>
      translationApi.listKeys(branchId, {
        search,
        page,
        limit: 50,
        filter,
        qualityFilter,
        namespace: namespace || undefined,
      }),
  });

  // Namespaces query for filter dropdown
  const { data: namespacesData } = useQuery({
    queryKey: ['namespaces', branchId],
    queryFn: () => translationApi.getNamespaces(branchId),
  });

  // Derived data - memoized to prevent new references on each render
  const languages: ProjectLanguage[] = useMemo(
    () => project?.languages || [],
    [project?.languages]
  );
  const keys: TranslationKey[] = useMemo(() => keysData?.keys || [], [keysData?.keys]);
  const total = keysData?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  const defaultLanguage = useMemo(() => languages.find((l) => l.isDefault), [languages]);

  const targetLanguages = useMemo(
    () => languages.filter((l) => !l.isDefault).map((l) => l.code),
    [languages]
  );

  const canApprove = project?.myRole === 'MANAGER' || project?.myRole === 'OWNER';

  // Current branch info for MergeBranchButton
  const currentBranchInfo: CurrentBranchInfo | null = useMemo(() => {
    if (!branch) return null;
    return {
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      isDefault: branch.isDefault,
      keyCount: total,
    };
  }, [branch, total]);

  // Completion stats
  const completionStats = useMemo(() => {
    if (!keys.length || !languages.length) {
      return { percent: 0, translated: 0, total: 0 };
    }
    const totalTranslations = keys.length * languages.length;
    let translated = 0;
    keys.forEach((key) => {
      languages.forEach((lang) => {
        const value = key.translations.find((t) => t.language === lang.code)?.value;
        if (value) translated++;
      });
    });
    return {
      percent: Math.round((translated / totalTranslations) * 100),
      translated,
      total: totalTranslations,
    };
  }, [keys, languages]);

  // Namespaces for filter dropdown - extract namespace strings, filter out nulls
  const namespaces = useMemo(
    () =>
      (namespacesData?.namespaces || [])
        .map((n) => n.namespace)
        .filter((ns): ns is string => ns !== null),
    [namespacesData?.namespaces]
  );

  return {
    // Raw data
    project,
    branch,
    // Derived data
    languages,
    keys,
    total,
    totalPages,
    defaultLanguage,
    targetLanguages,
    canApprove,
    currentBranchInfo,
    completionStats,
    namespaces,
    // Loading state
    isLoading,
  };
}
