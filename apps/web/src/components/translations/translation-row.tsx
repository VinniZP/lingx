'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProjectLanguage } from '@localeflow/shared';
import { TranslationKey, type ApprovalStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Check, Loader2, Clock, CheckCircle, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TranslationStatus = 'translated' | 'modified' | 'missing';

const approvalStatusConfig: Record<ApprovalStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive'; icon: typeof Clock }> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
};

interface TranslationRowProps {
  translationKey: TranslationKey;
  languages: ProjectLanguage[];
  visibleLanguages: Set<string>;
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  onTranslationChange: (keyId: string, lang: string, value: string) => void;
  onSave: (keyId: string) => Promise<void>;
  hasUnsavedChanges: (keyId: string, lang: string) => boolean;
  savingLanguages: Set<string>;
  savedLanguages: Set<string>;
  canApprove?: boolean;
  onApprove?: (translationId: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  approvingTranslations?: Set<string>;
  // Selection for batch operations
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (keyId: string, selected: boolean) => void;
  // TM focus tracking
  onTranslationFocus?: (keyId: string, language: string) => void;
}

export function TranslationRow({
  translationKey,
  languages,
  visibleLanguages,
  getTranslationValue,
  onTranslationChange,
  onSave,
  hasUnsavedChanges,
  savingLanguages,
  savedLanguages,
  canApprove = false,
  onApprove,
  approvingTranslations = new Set(),
  selectable = false,
  selected = false,
  onSelectionChange,
  onTranslationFocus,
}: TranslationRowProps) {
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Get visible languages in order
  const visibleLangs = languages.filter((l) => visibleLanguages.has(l.code));
  const defaultLang = languages.find((l) => l.isDefault);

  // Auto-resize textareas
  useEffect(() => {
    Object.values(textareaRefs.current).forEach((textarea) => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    });
  }, [editingLang, visibleLanguages]);

  // Get original saved value from translation key
  const getOriginalValue = (lang: string): string => {
    return translationKey.translations.find((t) => t.language === lang)?.value || '';
  };

  // Get approval status from translation key
  const getApprovalStatus = (lang: string): ApprovalStatus | null => {
    const translation = translationKey.translations.find((t) => t.language === lang);
    return translation?.status ?? null;
  };

  // Get translation ID for approval actions
  const getTranslationId = (lang: string): string | null => {
    const translation = translationKey.translations.find((t) => t.language === lang);
    return translation?.id ?? null;
  };

  const getStatus = (lang: string): TranslationStatus => {
    const currentValue = getTranslationValue(translationKey, lang);
    const originalValue = getOriginalValue(lang);

    if (!currentValue) return 'missing';
    // Compare current with original to detect modifications
    if (currentValue !== originalValue) return 'modified';
    return 'translated';
  };

  const handleClick = (langCode: string) => {
    setEditingLang(langCode);
    onTranslationFocus?.(translationKey.id, langCode);
    setTimeout(() => textareaRefs.current[langCode]?.focus(), 0);
  };

  const handleBlur = (langCode: string) => {
    const currentValue = getTranslationValue(translationKey, langCode);
    const originalValue = getOriginalValue(langCode);
    // Only close if no unsaved changes
    if (currentValue === originalValue) {
      setEditingLang(null);
    }
  };

  return (
    <div className={cn(
      "group relative px-5 py-4 border-b border-border/40 transition-colors hover:bg-muted/20",
      selected && "bg-primary/5"
    )}>
      {/* Key name with optional checkbox */}
      <div className="flex items-center gap-3 mb-3">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectionChange?.(translationKey.id, checked === true)}
            className="shrink-0"
          />
        )}
        <div className="font-mono text-xs text-muted-foreground tracking-wide">
          {translationKey.name}
        </div>
      </div>

      {/* Language translations */}
      <div className="space-y-2">
        {visibleLangs.map((lang) => {
          const value = getTranslationValue(translationKey, lang.code);
          const status = getStatus(lang.code);
          const approvalStatus = getApprovalStatus(lang.code);
          const isEditing = editingLang === lang.code;
          const isSaving = savingLanguages.has(lang.code);
          const justSaved = savedLanguages.has(lang.code);
          const translationId = getTranslationId(lang.code);
          const isApproving = translationId ? approvingTranslations.has(translationId) : false;

          return (
            <div key={lang.code} className="flex items-start gap-3">
              {/* Status dot */}
              <div
                className={cn(
                  'size-2 rounded-full mt-2 shrink-0 transition-colors',
                  status === 'translated' && 'bg-emerald-500',
                  status === 'modified' && 'bg-amber-500',
                  status === 'missing' && 'bg-red-500'
                )}
              />

              {/* Language label */}
              <div className="w-8 shrink-0">
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    lang.isDefault ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {lang.code}
                </span>
              </div>

              {/* Value */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <textarea
                    ref={(el) => { textareaRefs.current[lang.code] = el; }}
                    value={value}
                    onChange={(e) =>
                      onTranslationChange(translationKey.id, lang.code, e.target.value)
                    }
                    onBlur={() => handleBlur(lang.code)}
                    placeholder={`Enter ${lang.name} translation...`}
                    className={cn(
                      'w-full bg-transparent text-[15px] leading-relaxed resize-none',
                      'focus:outline-none placeholder:text-muted-foreground/40',
                      'min-h-[24px]'
                    )}
                    rows={1}
                  />
                ) : (
                  <button
                    onClick={() => handleClick(lang.code)}
                    className={cn(
                      'w-full text-left text-[15px] leading-relaxed',
                      !value && 'italic text-muted-foreground/60'
                    )}
                  >
                    {value || 'Missing translation'}
                  </button>
                )}
              </div>

              {/* Status badges and actions */}
              <div className="shrink-0 flex items-center gap-2 justify-end">
                {/* Approve/Reject buttons - show on hover or when pending, if user can approve */}
                {canApprove && onApprove && value && translationId && (
                  <div className={cn(
                    'flex items-center gap-1 transition-opacity',
                    approvalStatus === 'PENDING' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}>
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

                {/* Approval status badge - only show if translation exists and has a value */}
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

                {/* Save status */}
                {isSaving && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-fade-in">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Saving</span>
                  </div>
                )}
                {justSaved && !isSaving && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 animate-fade-in">
                    <Check className="size-3" />
                    <span>Saved</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
