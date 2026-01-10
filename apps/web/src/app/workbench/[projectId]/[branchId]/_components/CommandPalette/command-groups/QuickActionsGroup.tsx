'use client';

import { CommandGroup, CommandItem, CommandShortcut } from '@/components/ui/command';
import { tKey, useTranslation } from '@lingx/sdk-nextjs';
import type { ActionCommand } from '../types';

interface QuickActionsGroupProps {
  commands: Record<string, ActionCommand[]>;
  focusedLanguageName?: string;
  onExecute: (command: ActionCommand) => void;
}

const GROUP_LABELS = {
  translation: tKey('workbench.commandPalette.groups.translation'),
  approval: tKey('workbench.commandPalette.groups.approval'),
  navigation: tKey('workbench.commandPalette.groups.navigation'),
  utility: tKey('workbench.commandPalette.groups.utility'),
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
          <CommandGroup key={groupKey} heading={td(GROUP_LABELS[groupKey])}>
            {groupCommands.map((command) => {
              const Icon = command.icon;
              // Get the translated label, passing language name if needed
              const label = td(command.labelKey, { language: focusedLanguageName || '' });

              return (
                <CommandItem
                  key={command.id}
                  onSelect={() => onExecute(command)}
                  disabled={command.disabled}
                  aria-label={`${label}${command.shortcut ? `, ${t('workbench.commandPalette.a11y.shortcut')}: ${command.shortcut}` : ''}`}
                >
                  <Icon className="text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {command.shortcut && (
                    <CommandShortcut aria-hidden="true">{command.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        );
      })}
    </>
  );
}
