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
    <div className="p-5 flex items-start gap-4">
      <div
        className={cn(
          'size-10 rounded-xl flex items-center justify-center shrink-0 bg-linear-to-br border',
          colors.bg,
          colors.border
        )}
      >
        <Icon className={cn('size-5', colors.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{title}</p>
          {comingSoon && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
              Soon
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {description}
        </p>
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
    <div
      className={cn(
        'p-5 rounded-2xl border border-border/40 bg-linear-to-br',
        colors.bg
      )}
    >
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-xl bg-card/80 flex items-center justify-center border border-border/40 shrink-0">
          <Icon className={cn('size-5', colors.color)} />
        </div>
        <div>
          <p className="font-semibold text-sm mb-1">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
