'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { TranslationKey } from '@/lib/api';
import { StatusDot, QualityMeter } from '../shared';

interface KeyListItemProps {
  keyData: TranslationKey;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
  canApprove: boolean;
  targetLanguages: string[];
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  sourcePreview: string;
}

export function KeyListItem({
  keyData,
  isSelected,
  isChecked,
  onSelect,
  onCheck,
  canApprove,
  targetLanguages,
  getTranslationValue,
  sourcePreview,
}: KeyListItemProps) {
  // Get translation statuses for status dots
  const getTranslationStatus = (langCode: string): 'APPROVED' | 'REJECTED' | 'PENDING' | 'empty' => {
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
      className={cn(
        'group flex items-start gap-2.5 px-3 py-3 cursor-pointer transition-all border-l-2',
        isSelected
          ? 'bg-primary/5 border-l-primary'
          : 'border-l-transparent hover:bg-muted/50'
      )}
      onClick={onSelect}
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
      <div className="flex-1 min-w-0">
        {/* Namespace */}
        {keyData.namespace && (
          <span className="text-xs text-muted-foreground font-mono truncate block mb-0.5">
            {keyData.namespace}
          </span>
        )}

        {/* Key name - slightly larger for scanning */}
        <p className="text-sm font-semibold font-mono truncate" title={keyData.name}>
          {displayName}
        </p>

        {/* Source preview - improved readability */}
        {sourcePreview && (
          <p className="text-sm text-muted-foreground truncate mt-1 leading-snug">
            {sourcePreview}
          </p>
        )}

        {/* Status dots and quality */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            {targetLanguages.map((lang) => (
              <StatusDot key={lang} status={getTranslationStatus(lang)} />
            ))}
          </div>
          {overallQuality !== null && (
            <QualityMeter score={overallQuality} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}
