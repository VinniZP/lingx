'use client';

import { cn } from '@/lib/utils';

/**
 * SettingsTipCard - Premium tip/hint card with gradient styling
 *
 * Used for security tips, quick tips, and informational cards
 * in the settings sidebar.
 */

interface SettingsTipCardProps {
  /**
   * The icon component to display
   */
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Card title
   */
  title: string;
  /**
   * Card description/content
   */
  description: string;
  /**
   * Status/color variant
   * @default 'info'
   */
  status?: 'good' | 'warning' | 'info';
  /**
   * Whether to show as a "coming soon" feature
   * @default false
   */
  comingSoon?: boolean;
}

export function SettingsTipCard({
  icon: Icon,
  title,
  description,
  status = 'info',
  comingSoon = false,
}: SettingsTipCardProps) {
  const statusColors = {
    good: {
      icon: 'text-success',
      bg: 'from-success/15 to-success/5',
      border: 'border-success/20',
    },
    warning: {
      icon: 'text-warning',
      bg: 'from-warning/15 to-warning/5',
      border: 'border-warning/20',
    },
    info: {
      icon: 'text-info',
      bg: 'from-info/15 to-info/5',
      border: 'border-info/20',
    },
  };

  const colors = statusColors[status];

  return (
    <div className="flex items-start gap-4 p-5">
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl border bg-linear-to-br',
          colors.bg,
          colors.border
        )}
      >
        <Icon className={cn('size-5', colors.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          {comingSoon && (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
              Soon
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/**
 * SettingsQuickTip - Standalone tip card with gradient background
 *
 * Used outside of island containers, has its own border and background.
 */

interface SettingsQuickTipProps {
  /**
   * The icon component to display
   */
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Tip title
   */
  title: string;
  /**
   * Tip description/content
   */
  description: string;
  /**
   * Color variant
   * @default 'primary'
   */
  variant?: 'primary' | 'info' | 'warm' | 'success';
}

export function SettingsQuickTip({
  icon: Icon,
  title,
  description,
  variant = 'primary',
}: SettingsQuickTipProps) {
  const variants = {
    primary: {
      color: 'text-primary',
      bg: 'from-primary/10 to-primary/5',
    },
    info: {
      color: 'text-info',
      bg: 'from-info/10 to-info/5',
    },
    warm: {
      color: 'text-warm',
      bg: 'from-warm/10 to-warm/5',
    },
    success: {
      color: 'text-success',
      bg: 'from-success/10 to-success/5',
    },
  };

  const colors = variants[variant];

  return (
    <div className={cn('border-border/40 rounded-2xl border bg-linear-to-br p-5', colors.bg)}>
      <div className="flex items-start gap-4">
        <div className="bg-card/80 border-border/40 flex size-10 shrink-0 items-center justify-center rounded-xl border">
          <Icon className={cn('size-5', colors.color)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
