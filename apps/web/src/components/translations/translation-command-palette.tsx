'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Zap,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Languages,
  Key,
  CheckCheck,
  XCircle,
  Sparkles,
} from 'lucide-react';

import type { TranslationKey } from '@/lib/api';
import { Kbd } from '@/components/ui/kbd';
import { useTranslation } from '@lingx/sdk-nextjs';

interface TranslationCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keys: TranslationKey[];
  expandedKeyId: string | null;
  focusedLanguage: string | null;
  sourceLanguage: string | null;
  onSelectKey: (keyId: string) => void;
  onFetchMT: (lang: string) => void;
  onFetchMTAll: () => void;
  onFetchAI?: (lang: string) => void;
  onFetchAIAll?: () => void;
  onCopyFromSource: (lang: string) => void;
  onApprove: (translationId: string) => void;
  onReject: (translationId: string) => void;
  onApproveKey: (translationIds: string[]) => void;
  onRejectKey: (translationIds: string[]) => void;
  hasMT: boolean;
  hasAI?: boolean;
}

export function TranslationCommandPalette({
  open,
  onOpenChange,
  keys,
  expandedKeyId,
  focusedLanguage,
  sourceLanguage,
  onSelectKey,
  onFetchMT,
  onFetchMTAll,
  onFetchAI,
  onFetchAIAll,
  onCopyFromSource,
  onApprove,
  onReject,
  onApproveKey,
  onRejectKey,
  hasMT,
  hasAI = false,
}: TranslationCommandPaletteProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  // Get current key and translation
  const currentKey = expandedKeyId ? keys.find(k => k.id === expandedKeyId) : null;
  const currentTranslation = currentKey && focusedLanguage
    ? currentKey.translations.find(t => t.language === focusedLanguage)
    : null;

  // Get all translations with values for the current key (for approve/reject all)
  const keyTranslationsWithValues = useMemo(() => {
    if (!currentKey) return [];
    return currentKey.translations.filter(t => t.value && t.value.trim() !== '');
  }, [currentKey]);

  // Filter keys based on search
  const filteredKeys = useMemo(() => {
    if (!search) return keys.slice(0, 10); // Show first 10 by default
    const lowerSearch = search.toLowerCase();
    return keys
      .filter(k =>
        k.name.toLowerCase().includes(lowerSearch) ||
        k.translations.some(t => t.value?.toLowerCase().includes(lowerSearch))
      )
      .slice(0, 20);
  }, [keys, search]);

  // Handle key selection
  const handleSelectKey = useCallback((keyId: string) => {
    onSelectKey(keyId);
    onOpenChange(false);
    setSearch('');
  }, [onSelectKey, onOpenChange]);

  // Handle actions
  const handleAction = useCallback((action: () => void) => {
    action();
    onOpenChange(false);
    setSearch('');
  }, [onOpenChange]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: cleanup on close
      setSearch('');
    }
  }, [open]);

  const canDoLanguageActions = expandedKeyId && focusedLanguage && focusedLanguage !== sourceLanguage;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t('translations.commandPalette.searchPlaceholder')}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty />

        {/* Quick Actions - only show when a key is expanded */}
        {expandedKeyId && (
          <>
            <CommandGroup heading={t('translations.commandPalette.quickActions')}>
              {hasMT && canDoLanguageActions && (
                <CommandItem
                  onSelect={() => handleAction(() => onFetchMT(focusedLanguage!))}
                >
                  <Zap className="text-primary" />
                  <span>{t('translations.commandPalette.translateCurrentField')}</span>
                  <CommandShortcut><Kbd>M</Kbd></CommandShortcut>
                </CommandItem>
              )}

              {hasMT && expandedKeyId && (
                <CommandItem
                  onSelect={() => handleAction(onFetchMTAll)}
                >
                  <Languages className="text-primary" />
                  <span>{t('translations.commandPalette.translateAllLanguages')}</span>
                </CommandItem>
              )}

              {hasAI && canDoLanguageActions && onFetchAI && (
                <CommandItem
                  onSelect={() => handleAction(() => onFetchAI(focusedLanguage!))}
                >
                  <Sparkles className="text-primary" />
                  <span>{t('translations.commandPalette.aiTranslateCurrentField')}</span>
                  <CommandShortcut><Kbd>⇧A</Kbd></CommandShortcut>
                </CommandItem>
              )}

              {hasAI && expandedKeyId && onFetchAIAll && (
                <CommandItem
                  onSelect={() => handleAction(onFetchAIAll)}
                >
                  <Sparkles className="text-primary" />
                  <span>{t('translations.commandPalette.aiTranslateAllLanguages')}</span>
                </CommandItem>
              )}

              {canDoLanguageActions && (
                <CommandItem
                  onSelect={() => handleAction(() => onCopyFromSource(focusedLanguage!))}
                >
                  <Copy />
                  <span>{t('translations.commandPalette.copyFromSource')}</span>
                  <CommandShortcut><Kbd>D</Kbd></CommandShortcut>
                </CommandItem>
              )}

              {currentTranslation && currentTranslation.value && (
                <>
                  <CommandItem
                    onSelect={() => handleAction(() => onApprove(currentTranslation.id))}
                  >
                    <ThumbsUp className="text-success" />
                    <span>{t('translations.commandPalette.approveTranslation')}</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => handleAction(() => onReject(currentTranslation.id))}
                  >
                    <ThumbsDown className="text-destructive" />
                    <span>{t('translations.commandPalette.rejectTranslation')}</span>
                  </CommandItem>
                </>
              )}

              {/* Approve/Reject all translations in key */}
              {keyTranslationsWithValues.length > 1 && (
                <>
                  <CommandItem
                    onSelect={() => handleAction(() => onApproveKey(keyTranslationsWithValues.map(tr => tr.id)))}
                  >
                    <CheckCheck className="text-success" />
                    <div className="flex items-center gap-2">
                      <span>{t('translations.commandPalette.approveAllTranslations')}</span>
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-success/10 text-success text-[10px] font-semibold">
                        {keyTranslationsWithValues.length}
                      </span>
                    </div>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => handleAction(() => onRejectKey(keyTranslationsWithValues.map(tr => tr.id)))}
                  >
                    <XCircle className="text-destructive" />
                    <div className="flex items-center gap-2">
                      <span>{t('translations.commandPalette.rejectAllTranslations')}</span>
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold">
                        {keyTranslationsWithValues.length}
                      </span>
                    </div>
                  </CommandItem>
                </>
              )}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Key Search */}
        <CommandGroup heading={t('translations.commandPalette.jumpToKey')}>
          {filteredKeys.map((key) => (
            <CommandItem
              key={key.id}
              value={key.name}
              onSelect={() => handleSelectKey(key.id)}
            >
              <Key className="text-muted-foreground/50" />
              <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                <span className="font-mono text-[13px] truncate">{key.name}</span>
                {key.translations[0]?.value && (
                  <span className="text-xs text-muted-foreground/60 truncate">
                    {key.translations[0].value.substring(0, 50)}
                    {key.translations[0].value.length > 50 ? '...' : ''}
                  </span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
