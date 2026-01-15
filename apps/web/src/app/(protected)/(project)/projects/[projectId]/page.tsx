'use client';

import { CreateBranchDialog, CreateSpaceDialog, MergeBranchDialog } from '@/components/dialogs';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectActivities } from '@/hooks';
import type { ProjectTreeSpace } from '@/lib/api';
import { projectApi, ProjectTreeBranch } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useQuery } from '@tanstack/react-query';
import { use, useMemo, useState } from 'react';
import {
  ActivityFeedCard,
  HeroSection,
  QuickActionsCard,
  SpacesBranchesCard,
  TranslationCoverageCard,
} from './_components';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * ProjectDetailPage - Premium redesigned project hub
 *
 * Features:
 * - Hero section with inline stats and prominent CTA
 * - Asymmetric grid layout (7-5 split)
 * - Quick actions section
 * - Activity feed
 * - Inline space/branch management
 */
export default function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();

  // Dialog state
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [mergeBranchOpen, setMergeBranchOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<ProjectTreeSpace | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<ProjectTreeBranch | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectApi.getStats(projectId),
  });

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['project-tree', projectId],
    queryFn: () => projectApi.getTree(projectId),
  });

  const { data: activityData, isLoading: activityLoading } = useProjectActivities(projectId, 5);
  const activities = activityData?.activities || [];

  // Find default branch for quick access
  const defaultBranch = tree?.spaces.flatMap((s) => s.branches).find((b) => b.isDefault);

  // All branches for merge dialog
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- Optional chaining in deps is intentional
  const allBranches = useMemo(() => {
    if (!tree?.spaces) return [];
    return tree.spaces.flatMap((space) => space.branches);
  }, [tree?.spaces]);

  // Calculate overall completion percentage
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- Optional chaining in deps is intentional
  const completionPercentage = useMemo(() => {
    if (!stats?.translationsByLanguage) return 0;
    const languages = Object.values(stats.translationsByLanguage);
    if (languages.length === 0) return 0;
    const totalPercentage = languages.reduce((sum, lang) => sum + (lang.percentage || 0), 0);
    return Math.round(totalPercentage / languages.length);
  }, [stats?.translationsByLanguage]);

  const handleCreateBranch = (space: ProjectTreeSpace) => {
    setSelectedSpace(space);
    setCreateBranchOpen(true);
  };

  const handleMergeBranch = (branch: ProjectTreeBranch) => {
    setSelectedBranch(branch);
    setMergeBranchOpen(true);
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="island animate-fade-in p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex items-center gap-8">
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
            </div>
          </div>
          <div className="border-border mt-6 border-t pt-6">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-destructive bg-destructive/10 border-destructive/20 rounded-xl border p-6">
        {t('projectDetail.notFound')}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HeroSection
        project={project}
        projectId={projectId}
        totalKeys={stats?.totalKeys}
        completionPercentage={completionPercentage}
        statsLoading={statsLoading}
        defaultBranchId={defaultBranch?.id}
        defaultBranchName={defaultBranch?.name}
      />

      {/* Asymmetric Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Content - 7 cols */}
        <div className="space-y-6 lg:col-span-7">
          <SpacesBranchesCard
            spaces={tree?.spaces}
            projectId={projectId}
            isLoading={treeLoading}
            onCreateSpace={() => setCreateSpaceOpen(true)}
            onCreateBranch={handleCreateBranch}
            onMergeBranch={handleMergeBranch}
          />

          <TranslationCoverageCard
            languages={project.languages}
            stats={stats}
            isLoading={statsLoading}
          />
        </div>

        {/* Sidebar - 5 cols */}
        <div className="space-y-6 lg:col-span-5">
          <QuickActionsCard projectId={projectId} defaultBranchId={defaultBranch?.id} />

          <ActivityFeedCard activities={activities} isLoading={activityLoading} />
        </div>
      </div>

      {/* Dialogs */}
      <CreateSpaceDialog
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
        projectId={projectId}
      />

      {selectedSpace && (
        <CreateBranchDialog
          open={createBranchOpen}
          onOpenChange={setCreateBranchOpen}
          projectId={projectId}
          spaceId={selectedSpace.id}
          spaceName={selectedSpace.name}
          branches={selectedSpace.branches}
        />
      )}

      <MergeBranchDialog
        open={mergeBranchOpen}
        onOpenChange={setMergeBranchOpen}
        projectId={projectId}
        sourceBranch={selectedBranch}
        allBranches={allBranches}
      />
    </div>
  );
}
