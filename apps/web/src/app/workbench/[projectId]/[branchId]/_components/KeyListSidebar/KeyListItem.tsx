'use client';

import { Checkbox } from '@/components/ui/checkbox';
import type { TranslationKey } from '@/lib/api';
import { cn } from '@/lib/utils';
import { QualityMeter, StatusDot } from '../shared';

interface KeyListItemProps {
  keyData: TranslationKey;
  keyIndex: number;
  isSelected: boolean;
  isChecked: boolean;
  isFocused?: boolean;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
  canApprove: boolean;
  targetLanguages: string[];
  sourcePreview: string;
}

export function KeyListItem({
  keyData,
  keyIndex,
  isSelected,
  isChecked,
  isFocused = false,
  onSelect,
  onCheck,
  canApprove,
  targetLanguages,
  sourcePreview,
}: KeyListItemProps) {
  // Get translation statuses for status dots
  const getTranslationStatus = (
    langCode: string
  ): 'APPROVED' | 'REJECTED' | 'PENDING' | 'empty' => {
    const translation = keyData.translations.find((t) => t.language === langCode);
    if (!translation || !translation.value) return 'empty';
    return translation.status;
  };

  // Calculate average quality score from all translations that have scores
  const getOverallQualityScore = (): number | null => {
    const scores = keyData.translations
      .filter((t) => t.qualityScore !== null)
      .map((t) => t.qualityScore!.score);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  };

  const overallQuality = getOverallQualityScore();

  const displayName = keyData.namespace
    ? keyData.name.replace(`${keyData.namespace}.`, '')
    : keyData.name;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-label={`${keyData.namespace ? keyData.namespace + ':' : ''}${keyData.name}`}
      data-key-index={keyIndex}
      tabIndex={isFocused ? 0 : -1}
      className={cn(
        'group flex cursor-pointer items-start gap-2.5 border-l-2 px-3 py-3 transition-all outline-none',
        isSelected ? 'bg-primary/5 border-l-primary' : 'hover:bg-muted/50 border-l-transparent',
        isFocused && 'ring-primary ring-2 ring-inset'
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Checkbox */}
      {canApprove && (
        <Checkbox
          checked={isChecked}
          onCheckedChange={onCheck}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Namespace */}
        {keyData.namespace && (
          <span className="text-muted-foreground mb-0.5 block truncate font-mono text-xs">
            {keyData.namespace}
          </span>
        )}

        {/* Key name - slightly larger for scanning */}
        <p className="truncate font-mono text-sm font-semibold" title={keyData.name}>
          {displayName}
        </p>

        {/* Source preview - improved readability */}
        {sourcePreview && (
          <p className="text-muted-foreground mt-1 truncate text-sm leading-snug">
            {sourcePreview}
          </p>
        )}

        {/* Status dots and quality */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            {targetLanguages.map((lang) => (
              <StatusDot key={lang} status={getTranslationStatus(lang)} />
            ))}
          </div>
          {overallQuality !== null && <QualityMeter score={overallQuality} size="sm" />}
        </div>
      </div>
    </div>
  );
}
