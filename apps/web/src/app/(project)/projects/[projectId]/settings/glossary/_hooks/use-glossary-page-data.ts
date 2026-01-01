'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import {
  useGlossaryList,
  useGlossaryStats,
  useGlossaryTags,
  useGlossarySyncStatus,
} from '@/hooks';

interface UseGlossaryPageDataOptions {
  projectId: string;
  search: string;
  sourceLanguageFilter: string;
  domainFilter: string;
  tagFilter: string;
  page: number;
}

export function useGlossaryPageData({
  projectId,
  search,
  sourceLanguageFilter,
  domainFilter,
  tagFilter,
  page,
}: UseGlossaryPageDataOptions) {
  // Project query
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  // List params
  const listParams = useMemo(() => ({
    search: search || undefined,
    sourceLanguage: sourceLanguageFilter !== 'all' ? sourceLanguageFilter : undefined,
    domain: domainFilter !== 'all' ? domainFilter : undefined,
    tagId: tagFilter !== 'all' ? tagFilter : undefined,
    page,
    limit: 20,
  }), [search, sourceLanguageFilter, domainFilter, tagFilter, page]);

  // Glossary queries
  const { data: entriesData, isLoading: isLoadingEntries } = useGlossaryList(projectId, listParams);
  const { data: statsData } = useGlossaryStats(projectId);
  const { data: tagsData } = useGlossaryTags(projectId);
  const { data: syncStatusData } = useGlossarySyncStatus(projectId);

  // Derived data
  const languages = project?.languages || [];
  const entries = entriesData?.entries || [];
  const total = entriesData?.total || 0;
  const stats = statsData;
  const tags = tagsData?.tags || [];
  const syncStatuses = syncStatusData?.syncs || [];
  const totalPages = Math.ceil(total / 20);

  // Get unique domains from stats
  const domains = useMemo(() =>
    stats?.topDomains?.map(d => d.domain) || [],
    [stats]
  );

  return {
    project,
    languages,
    entries,
    total,
    totalPages,
    stats,
    tags,
    syncStatuses,
    domains,
    isLoadingEntries,
  };
}
