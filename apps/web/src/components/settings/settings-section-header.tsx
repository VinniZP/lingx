'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ColorVariant = 'primary' | 'blue' | 'emerald' | 'amber' | 'destructive';

interface SettingsSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  color?: ColorVariant;
  className?: string;
}

const colorStyles: Record<ColorVariant, { gradient: string; border: string; iconColor: string }> = {
  primary: {
    gradient: 'bg-linear-to-br from-primary/15 to-primary/5',
    border: 'border-primary/10',
    iconColor: 'text-primary',
  },
  blue: {
    gradient: 'bg-linear-to-br from-blue-500/15 to-blue-500/5',
    border: 'border-blue-500/10',
    iconColor: 'text-blue-500',
  },
  emerald: {
    gradient: 'bg-linear-to-br from-emerald-500/15 to-emerald-500/5',
    border: 'border-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
  amber: {
    gradient: 'bg-linear-to-br from-amber-500/15 to-amber-500/5',
    border: 'border-amber-500/10',
    iconColor: 'text-amber-500',
  },
  destructive: {
    gradient: 'bg-linear-to-br from-destructive/15 to-destructive/5',
    border: 'border-destructive/10',
    iconColor: 'text-destructive',
  },
};

/**
 * Unified section header for settings pages.
 *
 * Provides a consistent section header with colored icon box, title, and optional description.
 * Supports multiple color variants for different section types.
 */
export function SettingsSectionHeader({
  icon: Icon,
  title,
  description,
  color = 'primary',
  className,
}: SettingsSectionHeaderProps) {
  const styles = colorStyles[color];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'size-10 rounded-xl flex items-center justify-center border',
          styles.gradient,
          styles.border
        )}
      >
        <Icon className={cn('size-4.5', styles.iconColor)} />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
