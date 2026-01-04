'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { QualityIssue } from '@/lib/api/quality';
import { cn } from '@/lib/utils';
import type { UnifiedSuggestion } from '@/types';
import { Brain, Database, Loader2, Sparkles, Wand2, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QualityIssuesInline } from '../shared';

type FocusMode = 'keys' | 'source' | 'language' | 'suggestion';

interface LanguageRowContentProps {
  value: string;
  onChange: (value: string) => void;
  sourceCharCount: number;
  sourcePlaceholderCount: number;
  validationError?: string;
  qualityIssues?: QualityIssue[];
  suggestions: UnifiedSuggestion[];
  onApplySuggestion: (text: string, suggestionId: string) => void;
  isEmpty: boolean;
  onFetchMT: () => void;
  onFetchAI: () => void;
  isFetchingMT: boolean;
  isFetchingAI: boolean;
  hasMT: boolean;
  hasAI: boolean;
  // Keyboard navigation props
  registerTextareaRef?: (ref: HTMLTextAreaElement | null) => void;
  languageName?: string;
  isLanguageFocused?: boolean;
  isSuggestionFocused?: (index: number) => boolean;
  focusMode?: FocusMode;
  onFocus?: () => void;
}

export function LanguageRowContent({
  value,
  onChange,
  sourceCharCount,
  sourcePlaceholderCount,
  validationError,
  qualityIssues = [],
  suggestions,
  onApplySuggestion,
  isEmpty,
  onFetchMT,
  onFetchAI,
  isFetchingMT,
  isFetchingAI,
  hasMT,
  hasAI,
  // Keyboard navigation props
  registerTextareaRef,
  languageName,
  isLanguageFocused = false,
  isSuggestionFocused,
  focusMode,
  onFocus,
}: LanguageRowContentProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [localValue, setLocalValue] = useState(value);
  const [showEditor, setShowEditor] = useState(!isEmpty);

  // Register textarea ref with parent
  const setTextareaRef = useCallback(
    (ref: HTMLTextAreaElement | null) => {
      textareaRef.current = ref;
      registerTextareaRef?.(ref);
    },
    [registerTextareaRef]
  );

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Reset showEditor when isEmpty changes (e.g., when switching keys)
  // Also show editor when suggestions arrive (from AI/MT translation)
  useEffect(() => {
    if (!isEmpty || suggestions.length > 0) {
      setShowEditor(true);
    } else {
      setShowEditor(false);
    }
  }, [isEmpty, suggestions.length]);

  // Focus textarea when showEditor becomes true from user clicking "start typing"
  useEffect(() => {
    if (showEditor && isEmpty && suggestions.length === 0) {
      // Small delay to ensure textarea is rendered
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [showEditor, isEmpty, suggestions.length]);

  const handleStartTyping = () => {
    setShowEditor(true);
  };

  // Count placeholders in current value
  const placeholderCount = (localValue.match(/\{[^}]+\}/g) || []).length;
  const placeholderMismatch = placeholderCount !== sourcePlaceholderCount;

  // Character ratio warning
  const charRatio = sourceCharCount > 0 ? localValue.length / sourceCharCount : 0;
  const hasLengthWarning = charRatio > 1.5;
  const hasLengthCaution = charRatio > 1.2 && !hasLengthWarning;

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  // Empty state - show when isEmpty AND not manually showing editor
  if (isEmpty && !showEditor) {
    return (
      <div className="border-border/30 from-muted/20 border-t bg-gradient-to-b to-transparent px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="relative">
            <div className="from-primary/20 to-primary/5 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-inner">
              <Sparkles className="text-primary size-5" />
            </div>
            <div className="bg-primary/10 absolute inset-0 size-12 animate-ping rounded-2xl opacity-30" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No translation yet</p>
            <p className="text-muted-foreground text-xs">
              Add a translation using AI or start typing manually
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasMT && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shadow-sm"
                onClick={onFetchMT}
                disabled={isFetchingMT}
              >
                {isFetchingMT ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Wand2 className="mr-1.5 size-3.5" />
                )}
                {isFetchingMT ? 'Translating...' : 'Machine Translate'}
              </Button>
            )}
            {hasAI && (
              <Button
                size="sm"
                className="rounded-full shadow-sm"
                onClick={onFetchAI}
                disabled={isFetchingAI}
              >
                {isFetchingAI ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 size-3.5" />
                )}
                {isFetchingAI ? 'Translating...' : 'AI Translate'}
              </Button>
            )}
          </div>
          <button
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 transition-colors hover:underline"
            onClick={handleStartTyping}
          >
            or start typing
          </button>
        </div>
      </div>
    );
  }

  // Get icon for suggestion type
  const getSuggestionIcon = (type: 'tm' | 'mt' | 'ai') => {
    switch (type) {
      case 'tm':
        return <Database className="size-3.5" />;
      case 'mt':
        return <Zap className="size-3.5" />;
      case 'ai':
        return <Brain className="size-3.5" />;
    }
  };

  // Get label for suggestion type
  const getSuggestionLabel = (type: 'tm' | 'mt' | 'ai') => {
    switch (type) {
      case 'tm':
        return 'Translation Memory';
      case 'mt':
        return 'Machine Translation';
      case 'ai':
        return 'AI Suggestion';
    }
  };

  return (
    <div className="border-border/30 space-y-4 border-t px-5 py-4">
      {/* Textarea - larger font for readability */}
      <div className="relative">
        <Textarea
          ref={setTextareaRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onFocus={onFocus}
          className={cn(
            'min-h-[100px] resize-none font-mono text-base leading-relaxed',
            validationError && 'border-destructive focus-visible:ring-destructive'
          )}
          placeholder="Enter translation..."
          aria-label={languageName ? `${languageName} translation text` : 'Translation text'}
        />
      </div>

      {/* Validation error */}
      {validationError && <p className="text-destructive text-sm font-medium">{validationError}</p>}

      {/* Stats row - slightly larger */}
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        {/* Character count */}
        <span
          className={cn(
            'tabular-nums',
            hasLengthWarning && 'text-destructive font-medium',
            hasLengthCaution && 'text-warning font-medium'
          )}
        >
          {localValue.length} / {sourceCharCount} chars
          {hasLengthWarning && ' (too long)'}
          {hasLengthCaution && ' (long)'}
        </span>

        {/* Placeholder count */}
        {sourcePlaceholderCount > 0 && (
          <Badge
            variant="outline"
            className={cn('text-xs', placeholderMismatch && 'border-destructive text-destructive')}
          >
            {placeholderCount}/{sourcePlaceholderCount} placeholders
          </Badge>
        )}
      </div>

      {/* Quality issues */}
      {qualityIssues.length > 0 && <QualityIssuesInline issues={qualityIssues} />}

      {/* Suggestions - MUCH more prominent */}
      {suggestions.length > 0 && (
        <div className="space-y-3 pt-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Suggestions
          </p>
          <div className="flex flex-col gap-2" role="listbox" aria-label="Translation suggestions">
            {suggestions.slice(0, 3).map((suggestion, index) => {
              const isThisSuggestionFocused =
                isLanguageFocused && focusMode === 'suggestion' && isSuggestionFocused?.(index);

              return (
                <button
                  key={suggestion.id}
                  role="option"
                  aria-selected={isThisSuggestionFocused}
                  tabIndex={isThisSuggestionFocused ? 0 : -1}
                  className={cn(
                    'group relative rounded-xl px-4 py-3 text-left transition-all duration-200 outline-none',
                    'hover:scale-[1.01] active:scale-[0.99]',
                    suggestion.type === 'tm' &&
                      'bg-info/8 border-info/25 hover:border-info/50 hover:bg-info/12 border-2',
                    suggestion.type === 'mt' &&
                      'bg-warning/8 border-warning/25 hover:border-warning/50 hover:bg-warning/12 border-2',
                    suggestion.type === 'ai' &&
                      'bg-primary/8 border-primary/25 hover:border-primary/50 hover:bg-primary/12 border-2',
                    isThisSuggestionFocused && 'ring-primary ring-2 ring-offset-2'
                  )}
                  onClick={() => onApplySuggestion(suggestion.text, suggestion.id)}
                  title={`Click to apply: ${suggestion.text}`}
                >
                  {/* Header row with type badge */}
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                        suggestion.type === 'tm' && 'bg-info/15 text-info',
                        suggestion.type === 'mt' && 'bg-warning/15 text-warning',
                        suggestion.type === 'ai' && 'bg-primary/15 text-primary'
                      )}
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <span>{getSuggestionLabel(suggestion.type)}</span>
                      {suggestion.type === 'tm' && (
                        <span className="ml-1 opacity-80">{suggestion.confidence}%</span>
                      )}
                    </div>
                    {suggestion.provider && (
                      <span className="text-muted-foreground text-xs">
                        via {suggestion.provider}
                      </span>
                    )}
                  </div>

                  {/* Suggestion text - prominent and readable */}
                  <p className="text-foreground line-clamp-2 font-mono text-sm leading-relaxed">
                    {suggestion.text}
                  </p>

                  {/* Click hint */}
                  <div className="absolute top-1/2 right-3 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-muted-foreground text-xs">Click to apply</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
