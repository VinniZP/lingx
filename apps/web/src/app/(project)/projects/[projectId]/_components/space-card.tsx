'use client';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ProjectTreeBranch, ProjectTreeSpace } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { ChevronDown, ChevronRight, FolderOpen, GitBranch, GitMerge, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface SpaceCardProps {
  space: ProjectTreeSpace;
  projectId: string;
  onCreateBranch: () => void;
  onMergeBranch: (branch: ProjectTreeBranch) => void;
}

/**
 * SpaceCard - Collapsible card showing a space and its branches
 */
export function SpaceCard({ space, projectId, onCreateBranch, onMergeBranch }: SpaceCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-border bg-card/50 card-hover overflow-hidden rounded-xl border">
        <CollapsibleTrigger className="hover:bg-accent/30 flex w-full items-center justify-between p-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-amber-500/20 bg-linear-to-br from-amber-500/10 to-orange-500/5">
              <FolderOpen className="size-5 text-amber-600" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <div className="font-semibold">{space.name}</div>
              <div className="text-muted-foreground text-sm">
                {t('projectDetail.spacesAndBranches.branchCount', { count: space.branches.length })}
              </div>
            </div>
          </div>
          <div
            className={cn(
              'rounded-md p-1.5 transition-all',
              isOpen ? 'bg-muted/50' : 'hover:bg-muted/50'
            )}
          >
            {isOpen ? (
              <ChevronDown className="text-muted-foreground size-4" />
            ) : (
              <ChevronRight className="text-muted-foreground size-4" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-border bg-background/50 space-y-1 border-t px-4 py-3">
            {space.branches.map((branch) => (
              <div
                key={branch.id}
                className="hover:bg-accent/50 group flex items-center justify-between rounded-lg p-3 transition-colors"
              >
                <Link
                  href={`/workbench/${projectId}/${branch.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <GitBranch className="text-muted-foreground size-4 shrink-0" />
                  <span className="group-hover:text-primary truncate font-medium transition-colors">
                    {branch.name}
                  </span>
                  {branch.isDefault && (
                    <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase">
                      {t('projectDetail.translationCoverage.default')}
                    </span>
                  )}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground hidden font-mono text-sm sm:inline">
                    {t('projectDetail.spacesAndBranches.keyCount', { count: branch.keyCount })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMergeBranch(branch);
                    }}
                    className="text-muted-foreground/40 hover:text-primary hover:bg-primary/10 size-8 rounded-lg transition-colors"
                    aria-label={t('projectDetail.spacesAndBranches.mergeBranchAriaLabel', {
                      branchName: branch.name,
                    })}
                  >
                    <GitMerge className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground mt-1 w-full justify-start gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onCreateBranch();
              }}
            >
              <Plus className="size-4" />
              {t('projectDetail.spacesAndBranches.newBranch')}
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
