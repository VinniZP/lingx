'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FolderOpen } from 'lucide-react';
import { SpaceCard } from './space-card';
import type { ProjectTreeSpace, ProjectTreeBranch } from '@/lib/api';

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
          <p className="text-sm text-muted-foreground mt-1">
            {t('projectDetail.spacesAndBranches.description')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateSpace}
          className="gap-1.5"
        >
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
          <div className="text-center py-12 relative rounded-xl bg-muted/30">
            <div className="relative">
              <div className="size-14 rounded-2xl bg-linear-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 mx-auto flex items-center justify-center mb-4">
                <FolderOpen className="size-7 text-amber-600" />
              </div>
              <p className="text-muted-foreground mb-4">{t('projectDetail.spacesAndBranches.noSpacesYet')}</p>
              <Button
                onClick={onCreateSpace}
                className="gap-2"
              >
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
