'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectLanguage } from '@lingx/shared';

// Language code to flag emoji mapping
function getFlagEmoji(code: string): string {
  const flags: Record<string, string> = {
    en: '🇺🇸', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹',
    pt: '🇵🇹', nl: '🇳🇱', pl: '🇵🇱', ru: '🇷🇺', ja: '🇯🇵',
    ko: '🇰🇷', zh: '🇨🇳', ar: '🇸🇦', tr: '🇹🇷', uk: '🇺🇦',
    cs: '🇨🇿', sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮', no: '🇳🇴',
  };
  return flags[code.toLowerCase()] || '🌐';
}

interface SourceSectionProps {
  language: ProjectLanguage;
  value: string;
  onChange?: (value: string) => void;
  isSaving?: boolean;
  isSaved?: boolean;
}

export function SourceSection({
  language,
  value,
  onChange,
  isSaving = false,
  isSaved = false,
}: SourceSectionProps) {
  const [copied, setCopied] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="px-5 py-4 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{getFlagEmoji(language.code)}</span>
        <span className="text-base font-medium">{language.name}</span>
        <Badge variant="outline" className="text-xs">Source</Badge>

        {/* Status indicators */}
        {isSaving && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
        {isSaved && !isSaving && (
          <Check className="size-4 text-success" />
        )}

        <span className="text-sm text-muted-foreground ml-auto tabular-nums">
          {localValue.length} chars
        </span>
        {placeholderCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="size-4 text-success" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </div>

      {isEditable ? (
        <Textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className={cn(
            'font-mono text-base leading-relaxed min-h-[80px] resize-none',
            'bg-background/50'
          )}
          placeholder="Enter source text..."
        />
      ) : (
        <div className="font-mono text-base leading-relaxed bg-background/50 rounded-xl px-4 py-3 border border-border">
          {localValue || <span className="text-muted-foreground italic">No source text</span>}
        </div>
      )}
    </div>
  );
}
