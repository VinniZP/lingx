'use client';

import { Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type QualityFilterValue = 'all' | 'excellent' | 'good' | 'needsReview' | 'unscored';

interface QualityFilterProps {
  value: QualityFilterValue;
  onChange: (value: QualityFilterValue) => void;
  className?: string;
}

/**
 * Quality score filter dropdown
 *
 * Allows filtering translations by quality score range
 * - All: Show all translations
 * - Excellent (≥80): Green scores
 * - Good (60-79): Yellow scores
 * - Needs Review (<60): Red scores
 * - Unscored: No quality score yet
 */
export function QualityFilter({ value, onChange, className }: QualityFilterProps) {
  const options: Array<{ value: QualityFilterValue; label: string; description: string }> = [
    { value: 'all', label: 'All Quality Scores', description: 'Show all translations' },
    {
      value: 'excellent',
      label: 'Excellent (≥80)',
      description: 'Production-ready translations',
    },
    { value: 'good', label: 'Good (60-79)', description: 'Minor issues, review optional' },
    {
      value: 'needsReview',
      label: 'Needs Review (<60)',
      description: 'Requires attention',
    },
    { value: 'unscored', label: 'Unscored', description: 'Not yet evaluated' },
  ];

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-9 gap-2 font-normal', className)}
        >
          <span className={cn(
            'size-2 rounded-full',
            value === 'excellent' && 'bg-emerald-500',
            value === 'good' && 'bg-amber-500',
            value === 'needsReview' && 'bg-red-500',
            value === 'unscored' && 'bg-gray-400',
            value === 'all' && 'bg-blue-500'
          )} />
          <span>{selected.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px]">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as QualityFilterValue)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="flex-col items-start py-3">
              <div className="flex items-center gap-2 w-full">
                <span className={cn(
                  'size-2 rounded-full',
                  option.value === 'excellent' && 'bg-emerald-500',
                  option.value === 'good' && 'bg-amber-500',
                  option.value === 'needsReview' && 'bg-red-500',
                  option.value === 'unscored' && 'bg-gray-400',
                  option.value === 'all' && 'bg-blue-500'
                )} />
                <span className="font-medium">{option.label}</span>
                {value === option.value && <Check className="size-4 ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-4">{option.description}</p>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
