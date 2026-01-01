'use client';

import Link from 'next/link';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, ChevronLeft, Loader2 } from 'lucide-react';
import { TranslationKeyCard } from '@/components/translations';
import { KeyFormDialog } from '@/components/key-form-dialog';
import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@localeflow/shared';
import type { UnifiedSuggestion } from '@/hooks/use-suggestions';

interface MobileTranslationsViewProps {
  projectId: string;
  branchId: string;
  spaceName: string | undefined;
  branchName: string | undefined;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  keys: TranslationKey[];
  languages: ProjectLanguage[];
  defaultLanguage: ProjectLanguage | undefined;
  expandedKeyId: string | null;
  onExpandKey: (keyId: string | null) => void;
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  onTranslationChange: (keyId: string, lang: string, value: string) => void;
  savingKeys: Map<string, Set<string>>;
  savedKeys: Map<string, Set<string>>;
  canApprove: boolean;
  onApprove: (translationId: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  approvingTranslations: Set<string>;
  selectedKeys: Set<string>;
  onSelectionChange: (keyId: string, selected: boolean) => void;
  getSuggestions: (keyId: string) => Map<string, UnifiedSuggestion[]>;
  onApplySuggestion: (keyId: string, lang: string, text: string, id: string) => void;
  onFetchMT: (keyId: string, lang: string) => void;
  getFetchingMTSet: (keyId: string) => Set<string>;
  focusedLanguage: string | null;
  onFocusLanguage: (lang: string | null) => void;
  isKeyIdFocused: (keyId: string) => boolean;
  onKeyboardNavigate: (direction: 'up' | 'down' | 'next' | 'prev') => void;
  showKeyDialog: boolean;
  onShowKeyDialogChange: (open: boolean) => void;
  editingKey: TranslationKey | undefined;
}

export function MobileTranslationsView({
  projectId,
  branchId,
  spaceName,
  branchName,
  search,
  onSearchChange,
  isLoading,
  keys,
  languages,
  defaultLanguage,
  expandedKeyId,
  onExpandKey,
  getTranslationValue,
  onTranslationChange,
  savingKeys,
  savedKeys,
  canApprove,
  onApprove,
  approvingTranslations,
  selectedKeys,
  onSelectionChange,
  getSuggestions,
  onApplySuggestion,
  onFetchMT,
  getFetchingMTSet,
  focusedLanguage,
  onFocusLanguage,
  isKeyIdFocused,
  onKeyboardNavigate,
  showKeyDialog,
  onShowKeyDialogChange,
  editingKey,
}: MobileTranslationsViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link href={`/projects/${projectId}`}>
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground truncate">
                {spaceName} / {branchName}
              </div>
              <h1 className="text-lg font-semibold">{t('translations.title')}</h1>
            </div>
            <Button size="icon" onClick={() => onShowKeyDialogChange(true)} className="h-10 w-10">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('translations.searchPlaceholder')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>
      </div>
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-muted-foreground">{t('translations.noResults')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {keys.map((key) => (
              <TranslationKeyCard
                key={key.id}
                translationKey={key}
                languages={languages}
                defaultLanguage={defaultLanguage}
                isExpanded={expandedKeyId === key.id}
                onExpand={onExpandKey}
                getTranslationValue={(k, lang) => getTranslationValue(k, lang)}
                onTranslationChange={onTranslationChange}
                savingLanguages={savingKeys.get(key.id) || new Set()}
                savedLanguages={savedKeys.get(key.id) || new Set()}
                canApprove={canApprove}
                onApprove={onApprove}
                approvingTranslations={approvingTranslations}
                selectable={canApprove}
                selected={selectedKeys.has(key.id)}
                onSelectionChange={onSelectionChange}
                suggestions={getSuggestions(key.id)}
                onApplySuggestion={(lang, text, id) => onApplySuggestion(key.id, lang, text, id)}
                onFetchMT={(lang) => onFetchMT(key.id, lang)}
                isFetchingMT={getFetchingMTSet(key.id)}
                focusedLanguage={expandedKeyId === key.id ? focusedLanguage : null}
                onFocusLanguage={onFocusLanguage}
                isFocusedKey={isKeyIdFocused(key.id)}
                onKeyboardNavigate={onKeyboardNavigate}
              />
            ))}
          </div>
        )}
      </div>
      <KeyFormDialog
        open={showKeyDialog}
        onOpenChange={onShowKeyDialogChange}
        branchId={branchId}
        editKey={editingKey}
      />
    </div>
  );
}
