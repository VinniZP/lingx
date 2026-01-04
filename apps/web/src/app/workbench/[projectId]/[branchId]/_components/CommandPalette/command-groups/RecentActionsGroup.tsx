'use client';

import { CommandGroup, CommandItem } from '@/components/ui/command';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Clock, Key } from 'lucide-react';
import type { RecentAction } from '../types';

interface RecentActionsGroupProps {
  recentActions: RecentAction[];
  onSelectKey: (keyId: string) => void;
}

export function RecentActionsGroup({ recentActions, onSelectKey }: RecentActionsGroupProps) {
  const { t } = useTranslation();

  if (recentActions.length === 0) return null;

  return (
    <CommandGroup heading={t('workbench.commandPalette.groups.recentActions')}>
      {recentActions.map((action) => (
        <CommandItem key={action.id} onSelect={() => onSelectKey(action.keyId)}>
          <Key className="text-muted-foreground" />
          <span className="flex-1 truncate">{action.keyName}</span>
          <Clock className="text-muted-foreground/50 size-3.5" />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
