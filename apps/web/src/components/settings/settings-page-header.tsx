'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

/**
 * Unified page header for settings pages.
 *
 * Provides a consistent header with icon, title, and optional description.
 * Includes fade-in animation.
 */
export function SettingsPageHeader({
  icon: Icon,
  title,
  description,
  className,
}: SettingsPageHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3 animate-fade-in-up', className)}>
      <div className="size-12 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
        <Icon className="size-5 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
