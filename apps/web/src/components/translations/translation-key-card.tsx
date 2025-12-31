'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import type { ProjectLanguage } from '@localeflow/shared';
import { TranslationKey, type ApprovalStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Check,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Copy,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InlineSuggestion } from './inline-suggestion';
import type { UnifiedSuggestion } from '@/hooks/use-suggestions';

const approvalStatusConfig: Record<
  ApprovalStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive'; icon: typeof Clock }
> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
};

interface TranslationKeyCardProps {
  translationKey: TranslationKey;
  languages: ProjectLanguage[];
  defaultLanguage: ProjectLanguage | undefined;
  isExpanded: boolean;
  onExpand: (keyId: string | null) => void;
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  onTranslationChange: (keyId: string, lang: string, value: string) => void;
  savingLanguages: Set<string>;
  savedLanguages: Set<string>;
  canApprove?: boolean;
  onApprove?: (translationId: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  approvingTranslations?: Set<string>;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (keyId: string, selected: boolean) => void;
  suggestions: Map<string, UnifiedSuggestion[]>;
  onApplySuggestion: (lang: string, text: string, suggestionId: string) => void;
  onFetchMT: (lang: string) => void;
  isFetchingMT: Set<string>;
  focusedLanguage: string | null;
  onFocusLanguage: (lang: string | null) => void;
  isFocusedKey: boolean;
  onKeyboardNavigate: (direction: 'up' | 'down' | 'next' | 'prev') => void;
}

export const TranslationKeyCard = memo(function TranslationKeyCard({
  translationKey,
  languages,
  defaultLanguage,
  isExpanded,
  onExpand,
  getTranslationValue,
  onTranslationChange,
  savingLanguages,
  savedLanguages,
  canApprove = false,
  onApprove,
  approvingTranslations = new Set(),
  selectable = false,
  selected = false,
  onSelectionChange,
  suggestions,
  onApplySuggestion,
  onFetchMT,
  isFetchingMT,
  focusedLanguage,
  onFocusLanguage,
  isFocusedKey,
  onKeyboardNavigate,
}: TranslationKeyCardProps) {
  const inputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate completion for this key
  const completedLangs = languages.filter((lang) => {
    const value = getTranslationValue(translationKey, lang.code);
    return value && value.length > 0;
  }).length;
  const totalLangs = languages.length;
  const completionPercent = totalLangs > 0 ? Math.round((completedLangs / totalLangs) * 100) : 0;

  // Get original saved value
  const getOriginalValue = (lang: string): string => {
    return translationKey.translations.find((t) => t.language === lang)?.value || '';
  };

  // Get approval status
  const getApprovalStatus = (lang: string): ApprovalStatus | null => {
    const translation = translationKey.translations.find((t) => t.language === lang);
    return translation?.status ?? null;
  };

  // Get translation ID
  const getTranslationId = (lang: string): string | null => {
    const translation = translationKey.translations.find((t) => t.language === lang);
    return translation?.id ?? null;
  };

  // Focus input when language is focused
  useEffect(() => {
    if (isExpanded && focusedLanguage) {
      const textarea = inputRefs.current.get(focusedLanguage);
      if (textarea) {
        textarea.focus();
      }
    }
  }, [isExpanded, focusedLanguage]);

  // Keyboard navigation within the card
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, langCode: string) => {
      const langIndex = languages.findIndex((l) => l.code === langCode);

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            // Previous language
            if (langIndex > 0) {
              onFocusLanguage(languages[langIndex - 1].code);
            } else {
              // Move to previous key
              onKeyboardNavigate('prev');
            }
          } else {
            // Next language
            if (langIndex < languages.length - 1) {
              onFocusLanguage(languages[langIndex + 1].code);
            } else {
              // Move to next key
              onKeyboardNavigate('next');
            }
          }
          break;
        case 'ArrowUp':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onKeyboardNavigate('up');
          }
          break;
        case 'ArrowDown':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onKeyboardNavigate('down');
          }
          break;
        case 'Enter':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            // Apply best suggestion
            const langSuggestions = suggestions.get(langCode);
            if (langSuggestions && langSuggestions.length > 0) {
              const best = langSuggestions[0];
              onApplySuggestion(langCode, best.text, best.id);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          onExpand(null);
          break;
        case 'd':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            // Copy from source language
            if (defaultLanguage && langCode !== defaultLanguage.code) {
              const sourceText = getTranslationValue(translationKey, defaultLanguage.code);
              if (sourceText) {
                onTranslationChange(translationKey.id, langCode, sourceText);
              }
            }
          }
          break;
        case 'm':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            // Fetch MT
            onFetchMT(langCode);
          }
          break;
      }
    },
    [
      languages,
      onFocusLanguage,
      onKeyboardNavigate,
      suggestions,
      onApplySuggestion,
      onExpand,
      defaultLanguage,
      getTranslationValue,
      translationKey,
      onTranslationChange,
      onFetchMT,
    ]
  );

  // Auto-resize textarea
  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    langCode: string
  ) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    onTranslationChange(translationKey.id, langCode, textarea.value);
  };

  // Click to expand
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on checkbox or buttons
    if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) {
      return;
    }
    if (!isExpanded) {
      onExpand(translationKey.id);
      // Focus first non-source language
      const firstTarget = languages.find((l) => !l.isDefault);
      if (firstTarget) {
        onFocusLanguage(firstTarget.code);
      }
    }
  };

  // Collapsed view
  if (!isExpanded) {
    return (
      <div
        ref={cardRef}
        onClick={handleCardClick}
        className={cn(
          'group relative px-4 py-3 cursor-pointer transition-all duration-200',
          'hover:bg-muted/30',
          isFocusedKey && 'bg-primary/5 ring-1 ring-primary/20',
          selected && 'bg-primary/5'
        )}
      >
        <div className="flex items-center gap-3">
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) =>
                onSelectionChange?.(translationKey.id, checked === true)
              }
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Expand indicator */}
          <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />

          {/* Key name */}
          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm text-foreground/90 truncate block">
              {translationKey.name}
            </span>
            {translationKey.description && (
              <span className="text-xs text-muted-foreground truncate block mt-0.5">
                {translationKey.description}
              </span>
            )}
          </div>

          {/* Completion indicator */}
          <div className="flex items-center gap-2">
            {/* Language completion dots */}
            <div className="flex items-center gap-1">
              {languages.map((lang) => {
                const hasValue = !!getTranslationValue(translationKey, lang.code);
                return (
                  <div
                    key={lang.code}
                    className={cn(
                      'size-2 rounded-full transition-colors',
                      hasValue ? 'bg-success' : 'bg-muted-foreground/30'
                    )}
                  />
                );
              })}
            </div>

            {/* Completion badge */}
            <Badge
              variant={completionPercent === 100 ? 'success' : completionPercent > 0 ? 'secondary' : 'outline'}
              className="h-5 text-[10px] font-semibold tabular-nums"
            >
              {completedLangs}/{totalLangs}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      ref={cardRef}
      className={cn(
        'relative border-l-2 transition-all duration-300',
        'bg-card/50',
        isFocusedKey ? 'border-l-primary' : 'border-l-transparent'
      )}
    >
      {/* Card header */}
      <div
        onClick={() => onExpand(null)}
        className="px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/40"
      >
        <div className="flex items-center gap-3">
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) =>
                onSelectionChange?.(translationKey.id, checked === true)
              }
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          <ChevronRight className="size-4 text-primary rotate-90 transition-transform" />

          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm text-foreground font-medium truncate block">
              {translationKey.name}
            </span>
            {translationKey.description && (
              <span className="text-xs text-muted-foreground truncate block mt-0.5">
                {translationKey.description}
              </span>
            )}
          </div>

          <Badge
            variant={completionPercent === 100 ? 'success' : completionPercent > 0 ? 'secondary' : 'outline'}
            className="h-5 text-[10px] font-semibold tabular-nums"
          >
            {completedLangs}/{totalLangs}
          </Badge>
        </div>
      </div>

      {/* Languages */}
      <div className="px-4 py-3 space-y-4">
        {languages.map((lang) => {
          const value = getTranslationValue(translationKey, lang.code);
          const originalValue = getOriginalValue(lang.code);
          const approvalStatus = getApprovalStatus(lang.code);
          const translationId = getTranslationId(lang.code);
          const isSaving = savingLanguages.has(lang.code);
          const justSaved = savedLanguages.has(lang.code);
          const isApproving = translationId ? approvingTranslations.has(translationId) : false;
          const langSuggestions = suggestions.get(lang.code) || [];
          const isFetching = isFetchingMT.has(lang.code);
          const isFocused = focusedLanguage === lang.code;
          const isSource = lang.isDefault;
          const hasUnsaved = value !== originalValue;
          const isEmpty = !value || value.length === 0;

          return (
            <div key={lang.code} className="space-y-2">
              {/* Language header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded',
                      isSource
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {lang.code}
                  </span>
                  {isSource && (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Source
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick actions for non-source languages */}
                  {!isSource && (
                    <div className="flex items-center gap-1">
                      {/* Copy from source */}
                      {defaultLanguage && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const sourceText = getTranslationValue(
                                  translationKey,
                                  defaultLanguage.code
                                );
                                if (sourceText) {
                                  onTranslationChange(translationKey.id, lang.code, sourceText);
                                }
                              }}
                            >
                              <Copy className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Copy from source
                            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-muted">
                              ⌘D
                            </kbd>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {/* Get MT */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'size-7',
                              isFetching
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => onFetchMT(lang.code)}
                            disabled={isFetching}
                          >
                            {isFetching ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Zap className="size-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Machine translate
                          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-muted">
                            ⌘M
                          </kbd>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}

                  {/* Approval actions */}
                  {canApprove && onApprove && value && translationId && !isSource && (
                    <div className="flex items-center gap-1">
                      {isApproving ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-success hover:text-success hover:bg-success/10"
                                onClick={() => onApprove(translationId, 'APPROVED')}
                                disabled={approvalStatus === 'APPROVED'}
                              >
                                <ThumbsUp className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onApprove(translationId, 'REJECTED')}
                                disabled={approvalStatus === 'REJECTED'}
                              >
                                <ThumbsDown className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reject</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  )}

                  {/* Status indicators */}
                  {approvalStatus && value && (
                    <Badge
                      variant={approvalStatusConfig[approvalStatus].variant}
                      className="h-5 text-[10px] gap-1"
                    >
                      {(() => {
                        const Icon = approvalStatusConfig[approvalStatus].icon;
                        return <Icon className="size-3" />;
                      })()}
                      {approvalStatusConfig[approvalStatus].label}
                    </Badge>
                  )}

                  {isSaving && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      <span>Saving</span>
                    </div>
                  )}
                  {justSaved && !isSaving && (
                    <div className="flex items-center gap-1.5 text-xs text-success">
                      <Check className="size-3" />
                      <span>Saved</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Input */}
              <div className="relative">
                <textarea
                  ref={(el) => {
                    if (el) inputRefs.current.set(lang.code, el);
                  }}
                  value={value}
                  onChange={(e) => handleTextareaChange(e, lang.code)}
                  onFocus={() => onFocusLanguage(lang.code)}
                  onKeyDown={(e) => handleKeyDown(e, lang.code)}
                  placeholder={isEmpty ? `Enter ${lang.name} translation...` : undefined}
                  readOnly={isSource}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-xl text-sm leading-relaxed resize-none',
                    'bg-background border transition-all duration-200',
                    'placeholder:text-muted-foreground/50',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                    isSource && 'bg-muted/30 cursor-default',
                    isFocused && !isSource && 'ring-2 ring-primary/50 border-primary',
                    hasUnsaved && 'border-warning/50',
                    isEmpty && !isSource && 'border-dashed'
                  )}
                  rows={1}
                  style={{ minHeight: '44px' }}
                />

                {/* Quick MT button for empty fields */}
                {isEmpty && !isSource && !isFetching && (
                  <button
                    onClick={() => onFetchMT(lang.code)}
                    className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2',
                      'px-2.5 py-1.5 rounded-lg',
                      'bg-primary/10 text-primary text-xs font-medium',
                      'hover:bg-primary/20 transition-colors',
                      'flex items-center gap-1.5'
                    )}
                  >
                    <Zap className="size-3.5" />
                    Translate
                  </button>
                )}
              </div>

              {/* Inline suggestions */}
              {!isSource && langSuggestions.length > 0 && (
                <InlineSuggestion
                  suggestions={langSuggestions}
                  onApply={(text, id) => onApplySuggestion(lang.code, text, id)}
                  onDismiss={() => {}}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Keyboard hints footer */}
      <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Tab</kbd> next field
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted font-mono">⌘↵</kbd> apply suggestion
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Esc</kbd> collapse
        </span>
      </div>
    </div>
  );
});
