'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@lingx/sdk-nextjs';
import { branchApi, type ProjectTreeBranch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { MergeBranchDialog } from '@/components/dialogs';
import { GitMerge } from 'lucide-react';

interface MergeBranchButtonProps {
  projectId: string;
  spaceId: string | undefined;
  currentBranch: {
    id: string;
    name: string;
    slug: string;
    isDefault: boolean;
    keyCount: number;
  } | null;
}

export function MergeBranchButton({
  projectId,
  spaceId,
  currentBranch,
}: MergeBranchButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Lazy fetch branches - only when dialog is open
  const { data: branchesData } = useQuery({
    queryKey: ['branches', spaceId],
    queryFn: () => branchApi.list(spaceId!),
    enabled: open && !!spaceId,
  });

  const allBranches: ProjectTreeBranch[] = useMemo(() => {
    if (!branchesData?.branches) return [];
    return branchesData.branches.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      isDefault: b.isDefault,
      keyCount: 0,
    }));
  }, [branchesData?.branches]);

  // Need at least 2 branches to merge
  const canMerge = allBranches.length >= 2;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <GitMerge className="h-4 w-4" />
        {t('translations.merge')}
      </Button>

      <MergeBranchDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        sourceBranch={currentBranch}
        allBranches={allBranches}
      />
    </>
  );
}
