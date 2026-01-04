'use client';

import { CommandGroup, CommandItem, CommandShortcut } from '@/components/ui/command';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ActionCommand } from '../types';

interface QuickActionsGroupProps {
  commands: Record<string, ActionCommand[]>;
  focusedLanguageName?: string;
  onExecute: (command: ActionCommand) => void;
}

const GROUP_LABELS = {
  translation: 'workbench.commandPalette.groups.translation',
  approval: 'workbench.commandPalette.groups.approval',
  navigation: 'workbench.commandPalette.groups.navigation',
  utility: 'workbench.commandPalette.groups.utility',
} as const;

export function QuickActionsGroup({
  commands,
  focusedLanguageName,
  onExecute,
}: QuickActionsGroupProps) {
  const { t, td } = useTranslation();

  const groupOrder: (keyof typeof GROUP_LABELS)[] = [
    'translation',
    'approval',
    'navigation',
    'utility',
  ];

  return (
    <>
      {groupOrder.map((groupKey) => {
        const groupCommands = commands[groupKey];
        if (!groupCommands || groupCommands.length === 0) return null;

        return (
          <CommandGroup key={groupKey} heading={t(GROUP_LABELS[groupKey])}>
            {groupCommands.map((command) => {
              const Icon = command.icon;
              // Get the translated label, passing language name if needed
              const label = td(command.labelKey, { language: focusedLanguageName || '' });

              return (
                <CommandItem
                  key={command.id}
                  onSelect={() => onExecute(command)}
                  disabled={command.disabled}
                >
                  <Icon className="text-muted-foreground" />
                  <span className="flex-1">{label}</span>
                  {command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
                </CommandItem>
              );
            })}
          </CommandGroup>
        );
      })}
    </>
  );
}
