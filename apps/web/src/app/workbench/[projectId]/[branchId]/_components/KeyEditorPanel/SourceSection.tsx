'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ProjectLanguage } from '@lingx/shared';
import { Check, Copy, Loader2 } from 'lucide-react';
import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

// Language code to flag emoji mapping
function getFlagEmoji(code: string): string {
  const flags: Record<string, string> = {
    en: '🇺🇸',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    it: '🇮🇹',
    pt: '🇵🇹',
    nl: '🇳🇱',
    pl: '🇵🇱',
    ru: '🇷🇺',
    ja: '🇯🇵',
    ko: '🇰🇷',
    zh: '🇨🇳',
    ar: '🇸🇦',
    tr: '🇹🇷',
    uk: '🇺🇦',
    cs: '🇨🇿',
    sv: '🇸🇪',
    da: '🇩🇰',
    fi: '🇫🇮',
    no: '🇳🇴',
  };
  return flags[code.toLowerCase()] || '🌐';
}

interface SourceSectionProps {
  language: ProjectLanguage;
  value: string;
  onChange?: (value: string) => void;
  isSaving?: boolean;
  isSaved?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  isFocused?: boolean;
  onFocus?: () => void;
}

export function SourceSection({
  language,
  value,
  onChange,
  isSaving = false,
  isSaved = false,
  textareaRef,
  isFocused = false,
  onFocus,
}: SourceSectionProps) {
  const [copied, setCopied] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(localValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBlur = () => {
    if (localValue !== value && onChange) {
      onChange(localValue);
    }
  };

  // Count placeholders
  const placeholderCount = (localValue.match(/\{[^}]+\}/g) || []).length;
  const isEditable = !!onChange;

  return (
    <div className="border-border bg-muted/30 border-b px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{getFlagEmoji(language.code)}</span>
        <span className="text-base font-medium">{language.name}</span>
        <Badge variant="outline" className="text-xs">
          Source
        </Badge>

        {/* Status indicators */}
        {isSaving && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
        {isSaved && !isSaving && <Check className="text-success size-4" />}

        <span className="text-muted-foreground ml-auto text-sm tabular-nums">
          {localValue.length} chars
        </span>
        {placeholderCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''}
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="size-8" onClick={handleCopy}>
          {copied ? <Check className="text-success size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>

      {isEditable ? (
        <Textarea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onFocus={onFocus}
          className={cn(
            'min-h-[80px] resize-none font-mono text-base leading-relaxed',
            'bg-background/50',
            isFocused && 'ring-primary ring-2'
          )}
          placeholder="Enter source text..."
          aria-label={`${language.name} source text`}
        />
      ) : (
        <div className="bg-background/50 border-border rounded-xl border px-4 py-3 font-mono text-base leading-relaxed">
          {localValue || <span className="text-muted-foreground italic">No source text</span>}
        </div>
      )}
    </div>
  );
}
