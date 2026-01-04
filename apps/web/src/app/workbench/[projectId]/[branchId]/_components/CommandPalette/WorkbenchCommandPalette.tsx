'use client';

import { CommandDialog, CommandEmpty, CommandInput, CommandList } from '@/components/ui/command';
import type { TranslationKey } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectLanguage } from '@lingx/shared';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { QuickActionsGroup } from './command-groups/QuickActionsGroup';
import { RecentActionsGroup } from './command-groups/RecentActionsGroup';
import { SearchResultsGroup } from './command-groups/SearchResultsGroup';
import { getGroupedQuickActions, type CommandHandlers } from './command-registry';
import { useDebouncedSearch } from './hooks/use-debounced-search';
import { useRecentActions } from './hooks/use-recent-actions';
import type { ActionCommand, CommandContext } from './types';

export interface WorkbenchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Data
  keys: TranslationKey[];
  languages: ProjectLanguage[];
  projectId: string;

  // Current state
  selectedKeyId: string | null;
  focusedLanguage: string | null;
  expandedLanguages: Set<string>;

  // Capabilities
  hasMT: boolean;
  hasAI: boolean;

  // Handlers
  handlers: CommandHandlers;
}

export function WorkbenchCommandPalette({
  open,
  onOpenChange,
  keys,
  languages,
  projectId,
  selectedKeyId,
  focusedLanguage,
  expandedLanguages,
  hasMT,
  hasAI,
  handlers,
}: WorkbenchCommandPaletteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const { recentActions, addRecentAction } = useRecentActions(projectId);

  // Debounced search results for better performance
  const searchResults = useDebouncedSearch({
    keys,
    languages,
    query,
  });

  // Get current key's translations
  const selectedKey = selectedKeyId ? keys.find((k) => k.id === selectedKeyId) : undefined;
  const hasTranslations = selectedKey ? selectedKey.translations.length > 0 : false;

  // Get default language
  const defaultLanguage = languages.find((l) => l.isDefault);

  // Get focused language name for display
  const focusedLanguageName = focusedLanguage
    ? languages.find((l) => l.code === focusedLanguage)?.name
    : undefined;

  // Build command context
  const commandContext: CommandContext = {
    selectedKeyId,
    focusedLanguage,
    expandedLanguages,
    hasTranslations,
    hasMT,
    hasAI,
    defaultLanguageCode: defaultLanguage?.code ?? null,
  };

  // Get grouped quick actions
  const groupedActions = getGroupedQuickActions(commandContext, handlers);

  // Handle command execution with error handling
  const handleExecuteCommand = useCallback(
    (command: ActionCommand) => {
      try {
        // Execute the command
        command.action();

        // Close the palette
        onOpenChange(false);
        setQuery('');
      } catch (error) {
        // Show error toast and keep palette open for retry
        toast.error(t('workbench.commandPalette.errors.executionFailed'), {
          description:
            error instanceof Error
              ? error.message
              : t('workbench.commandPalette.errors.unknownError'),
        });
      }
    },
    [onOpenChange, t]
  );

  // Handle key selection from search or recent
  const handleSelectKey = useCallback(
    (keyId: string) => {
      const key = keys.find((k) => k.id === keyId);
      if (key) {
        // Add to recent actions
        addRecentAction({
          commandId: 'navigate-to-key',
          keyId,
          keyName: key.name,
        });
      }

      // Navigate to key
      handlers.onSelectKey?.(keyId);

      // Close the palette
      onOpenChange(false);
      setQuery('');
    },
    [keys, addRecentAction, handlers, onOpenChange]
  );

  // Handle dialog close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
      if (!newOpen) {
        setQuery('');
      }
    },
    [onOpenChange]
  );

  const hasQuickActions = Object.keys(groupedActions).length > 0;
  const showRecentActions = !query && recentActions.length > 0;
  const showQuickActions = !query && hasQuickActions;
  const showSearchResults = query && searchResults.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('workbench.commandPalette.title')}
      description={t('workbench.commandPalette.description')}
    >
      <CommandInput
        placeholder={t('workbench.commandPalette.placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <p className="text-muted-foreground">{t('workbench.commandPalette.noResults')}</p>
        </CommandEmpty>

        {showRecentActions && (
          <RecentActionsGroup recentActions={recentActions} onSelectKey={handleSelectKey} />
        )}

        {showQuickActions && (
          <QuickActionsGroup
            commands={groupedActions}
            focusedLanguageName={focusedLanguageName}
            onExecute={handleExecuteCommand}
          />
        )}

        {showSearchResults && (
          <SearchResultsGroup results={searchResults} onSelectKey={handleSelectKey} />
        )}
      </CommandList>
    </CommandDialog>
  );
}
