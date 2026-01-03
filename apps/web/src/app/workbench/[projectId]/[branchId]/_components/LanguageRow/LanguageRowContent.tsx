'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Sparkles, Loader2, Zap, Database, Brain } from 'lucide-react';
import type { QualityIssue } from '@/lib/api/quality';
import { QualityIssuesInline } from '../shared';

interface UnifiedSuggestion {
  id: string;
  type: 'tm' | 'mt' | 'ai';
  text: string;
  confidence: number;
  source?: string;
  provider?: string;
}

interface LanguageRowContentProps {
  value: string;
  onChange: (value: string) => void;
  sourceValue: string;
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
}

export function LanguageRowContent({
  value,
  onChange,
  sourceValue,
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
}: LanguageRowContentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [showEditor, setShowEditor] = useState(!isEmpty);

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
      <div className="px-4 py-8 border-t border-border/30 bg-gradient-to-b from-muted/20 to-transparent">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div className="absolute inset-0 size-12 rounded-2xl bg-primary/10 animate-ping opacity-30" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No translation yet</p>
            <p className="text-xs text-muted-foreground">Add a translation using AI or start typing manually</p>
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
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Wand2 className="size-3.5 mr-1.5" />
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
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5 mr-1.5" />
                )}
                {isFetchingAI ? 'Translating...' : 'AI Translate'}
              </Button>
            )}
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
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
    <div className="px-5 py-4 border-t border-border/30 space-y-4">
      {/* Textarea - larger font for readability */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className={cn(
            'font-mono text-base leading-relaxed min-h-[100px] resize-none',
            validationError && 'border-destructive focus-visible:ring-destructive'
          )}
          placeholder="Enter translation..."
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-sm text-destructive font-medium">{validationError}</p>
      )}

      {/* Stats row - slightly larger */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {/* Character count */}
        <span className={cn(
          'tabular-nums',
          hasLengthWarning && 'text-destructive font-medium',
          hasLengthCaution && 'text-warning font-medium'
        )}>
          {localValue.length} / {sourceCharCount} chars
          {hasLengthWarning && ' (too long)'}
          {hasLengthCaution && ' (long)'}
        </span>

        {/* Placeholder count */}
        {sourcePlaceholderCount > 0 && (
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              placeholderMismatch && 'border-destructive text-destructive'
            )}
          >
            {placeholderCount}/{sourcePlaceholderCount} placeholders
          </Badge>
        )}
      </div>

      {/* Quality issues */}
      {qualityIssues.length > 0 && (
        <QualityIssuesInline issues={qualityIssues} />
      )}

      {/* Suggestions - MUCH more prominent */}
      {suggestions.length > 0 && (
        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Suggestions
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                className={cn(
                  'group relative px-4 py-3 rounded-xl text-left transition-all duration-200',
                  'hover:scale-[1.01] active:scale-[0.99]',
                  suggestion.type === 'tm' && 'bg-info/8 border-2 border-info/25 hover:border-info/50 hover:bg-info/12',
                  suggestion.type === 'mt' && 'bg-warning/8 border-2 border-warning/25 hover:border-warning/50 hover:bg-warning/12',
                  suggestion.type === 'ai' && 'bg-primary/8 border-2 border-primary/25 hover:border-primary/50 hover:bg-primary/12'
                )}
                onClick={() => onApplySuggestion(suggestion.text, suggestion.id)}
                title={`Click to apply: ${suggestion.text}`}
              >
                {/* Header row with type badge */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                    suggestion.type === 'tm' && 'bg-info/15 text-info',
                    suggestion.type === 'mt' && 'bg-warning/15 text-warning',
                    suggestion.type === 'ai' && 'bg-primary/15 text-primary'
                  )}>
                    {getSuggestionIcon(suggestion.type)}
                    <span>{getSuggestionLabel(suggestion.type)}</span>
                    {suggestion.type === 'tm' && (
                      <span className="ml-1 opacity-80">{suggestion.confidence}%</span>
                    )}
                  </div>
                  {suggestion.provider && (
                    <span className="text-xs text-muted-foreground">
                      via {suggestion.provider}
                    </span>
                  )}
                </div>

                {/* Suggestion text - prominent and readable */}
                <p className="text-sm font-mono leading-relaxed text-foreground line-clamp-2">
                  {suggestion.text}
                </p>

                {/* Click hint */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-muted-foreground">Click to apply</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
