'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectTreeBranch, ProjectTreeSpace } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import { FolderOpen, Plus } from 'lucide-react';
import { SpaceCard } from './space-card';

interface SpacesBranchesCardProps {
  spaces: ProjectTreeSpace[] | undefined;
  projectId: string;
  isLoading: boolean;
  onCreateSpace: () => void;
  onCreateBranch: (space: ProjectTreeSpace) => void;
  onMergeBranch: (branch: ProjectTreeBranch) => void;
}

/**
 * SpacesBranchesCard - Shows project spaces and their branches
 */
export function SpacesBranchesCard({
  spaces,
  projectId,
  isLoading,
  onCreateSpace,
  onCreateBranch,
  onMergeBranch,
}: SpacesBranchesCardProps) {
  const { t } = useTranslation();

  return (
    <div className="island animate-fade-in-up stagger-2">
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h2 className="text-lg font-semibold">{t('projectDetail.spacesAndBranches.title')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('projectDetail.spacesAndBranches.description')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateSpace} className="gap-1.5">
          <Plus className="size-4" />
          {t('projectDetail.spacesAndBranches.newSpace')}
        </Button>
      </div>

      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : !spaces || spaces.length === 0 ? (
          <div className="bg-muted/30 relative rounded-xl py-12 text-center">
            <div className="relative">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-linear-to-br from-amber-500/20 to-orange-500/10">
                <FolderOpen className="size-7 text-amber-600" />
              </div>
              <p className="text-muted-foreground mb-4">
                {t('projectDetail.spacesAndBranches.noSpacesYet')}
              </p>
              <Button onClick={onCreateSpace} className="gap-2">
                <Plus className="size-4" />
                {t('projectDetail.spacesAndBranches.createFirstSpace')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                projectId={projectId}
                onCreateBranch={() => onCreateBranch(space)}
                onMergeBranch={onMergeBranch}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
