'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronRight,
  ChevronDown,
  GitBranch,
  GitMerge,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectTreeSpace, ProjectTreeBranch } from '@/lib/api';

interface SpaceCardProps {
  space: ProjectTreeSpace;
  projectId: string;
  onCreateBranch: () => void;
  onMergeBranch: (branch: ProjectTreeBranch) => void;
}

/**
 * SpaceCard - Collapsible card showing a space and its branches
 */
export function SpaceCard({
  space,
  projectId,
  onCreateBranch,
  onMergeBranch,
}: SpaceCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-xl overflow-hidden bg-card/50 card-hover">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 flex items-center justify-center">
              <FolderOpen className="size-5 text-amber-600" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <div className="font-semibold">{space.name}</div>
              <div className="text-sm text-muted-foreground">
                {t('projectDetail.spacesAndBranches.branchCount', { count: space.branches.length })}
              </div>
            </div>
          </div>
          <div className={cn(
            "p-1.5 rounded-md transition-all",
            isOpen ? "bg-muted/50" : "hover:bg-muted/50"
          )}>
            {isOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border px-4 py-3 space-y-1 bg-background/50">
            {space.branches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <Link
                  href={`/projects/${projectId}/translations/${branch.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <GitBranch className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium group-hover:text-primary transition-colors truncate">
                    {branch.name}
                  </span>
                  {branch.isDefault && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                      {t('projectDetail.translationCoverage.default')}
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground font-mono hidden sm:inline">
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
                    className="size-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label={t('projectDetail.spacesAndBranches.mergeBranchAriaLabel', { branchName: branch.name })}
                  >
                    <GitMerge className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground mt-1 gap-2"
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
