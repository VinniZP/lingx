'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Keyboard } from 'lucide-react';

interface TranslationsHeaderProps {
  projectId: string;
  spaceName: string | undefined;
  branchName: string | undefined;
  onCreateKey: () => void;
  /** Slot for merge button - allows passing encapsulated MergeBranchButton */
  mergeButton?: ReactNode;
}

export function TranslationsHeader({
  projectId,
  spaceName,
  branchName,
  onCreateKey,
  mergeButton,
}: TranslationsHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between animate-fade-in-up">
      <div>
        <div className="text-sm font-medium mb-1 flex items-center gap-1">
          <Link
            href={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {spaceName}
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground">{branchName}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('translations.title')}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Keyboard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1.5 text-xs">
              <div>{t('translations.keyboard.navigate')}</div>
              <div>{t('translations.keyboard.switchFields')}</div>
              <div>{t('translations.keyboard.applySuggestion')}</div>
              <div>{t('translations.keyboard.machineTranslate')}</div>
              <div>{t('translations.keyboard.collapse')}</div>
            </div>
          </TooltipContent>
        </Tooltip>
        {mergeButton}
        <Button onClick={onCreateKey} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('translations.newKey')}
        </Button>
      </div>
    </div>
  );
}
