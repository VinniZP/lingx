'use client';

import { cn } from '@/lib/utils';

/**
 * SettingsSectionHeader - Section header with icon and title
 *
 * Used for sidebar sections and content group headers
 */

interface SettingsSectionHeaderProps {
  /**
   * The icon component to display
   */
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Section title
   */
  title: string;
  /**
   * Icon background color variant
   * @default 'muted'
   */
  iconVariant?: 'muted' | 'primary' | 'info' | 'warm' | 'success' | 'warning';
  /**
   * Optional right-side content (e.g., count badge)
   */
  trailing?: React.ReactNode;
}

export function SettingsSectionHeader({
  icon: Icon,
  title,
  iconVariant = 'muted',
  trailing,
}: SettingsSectionHeaderProps) {
  const variants = {
    muted: { bg: 'bg-muted/50', icon: 'text-muted-foreground' },
    primary: { bg: 'bg-primary/10', icon: 'text-primary' },
    info: { bg: 'bg-info/10', icon: 'text-info' },
    warm: { bg: 'bg-warm/10', icon: 'text-warm' },
    success: { bg: 'bg-success/10', icon: 'text-success' },
    warning: { bg: 'bg-warning/10', icon: 'text-warning' },
  };

  const colors = variants[iconVariant];

  return (
    <div className="mb-5 flex items-center justify-between px-1">
      <h3 className="text-foreground flex items-center gap-2.5 text-sm font-semibold tracking-tight">
        <div className={cn('flex size-6 items-center justify-center rounded-lg', colors.bg)}>
          <Icon className={cn('size-3.5', colors.icon)} />
        </div>
        {title}
      </h3>
      {trailing}
    </div>
  );
}
