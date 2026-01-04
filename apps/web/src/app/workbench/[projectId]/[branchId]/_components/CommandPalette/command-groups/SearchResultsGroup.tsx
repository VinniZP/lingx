'use client';

import { Badge } from '@/components/ui/badge';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import { useTranslation } from '@lingx/sdk-nextjs';
import { FileText, Key } from 'lucide-react';
import type { SearchResult } from '../types';

interface SearchResultsGroupProps {
  results: SearchResult[];
  onSelectKey: (keyId: string) => void;
}

export function SearchResultsGroup({ results, onSelectKey }: SearchResultsGroupProps) {
  const { t } = useTranslation();

  if (results.length === 0) return null;

  return (
    <CommandGroup heading={t('workbench.commandPalette.groups.searchResults')}>
      {results.map((result) => {
        const matchDescription =
          result.matchType === 'key-name'
            ? t('workbench.commandPalette.a11y.keyNameMatch')
            : t('workbench.commandPalette.a11y.translationMatch', {
                language: result.matchedLanguage ?? '',
              });

        return (
          <CommandItem
            key={result.keyId}
            onSelect={() => onSelectKey(result.keyId)}
            className="flex-col items-start gap-1"
            aria-label={`${result.keyName}${result.namespace ? ` (${result.namespace})` : ''}, ${matchDescription}`}
          >
            <div className="flex w-full items-center gap-2">
              {result.matchType === 'key-name' ? (
                <Key className="text-primary shrink-0" aria-hidden="true" />
              ) : (
                <FileText className="text-muted-foreground shrink-0" aria-hidden="true" />
              )}
              <span className="flex-1 truncate font-medium">{result.keyName}</span>
              {result.namespace && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {result.namespace}
                </Badge>
              )}
            </div>
            {result.matchType === 'translation-content' && result.matchedContent && (
              <div className="text-muted-foreground ml-6.5 flex w-full items-center gap-2 text-xs">
                <span className="shrink-0">{result.matchedLanguage}:</span>
                <span className="truncate">{result.matchedContent}</span>
              </div>
            )}
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
