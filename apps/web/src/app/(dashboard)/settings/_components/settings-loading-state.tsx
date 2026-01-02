'use client';

import { cn } from '@/lib/utils';

/**
 * SettingsLoadingState - Premium loading spinner for settings pages
 *
 * Features:
 * - Icon with glow effect
 * - Pulsing animation
 * - Ping border effect
 * - Customizable loading text
 */

interface SettingsLoadingStateProps {
  /**
   * The icon component to display
   */
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Loading title text
   */
  title: string;
  /**
   * Optional subtitle/description
   */
  subtitle?: string;
  /**
   * Accent color for the glow effect
   * @default 'primary'
   */
  accentColor?: 'primary' | 'info' | 'warm';
}

export function SettingsLoadingState({
  icon: Icon,
  title,
  subtitle,
  accentColor = 'primary',
}: SettingsLoadingStateProps) {
  const colorVariants = {
    primary: {
      glow: 'bg-primary/20',
      icon: 'from-primary/20 to-primary/5',
      border: 'border-primary/20',
      ping: 'border-primary/30',
      iconColor: 'text-primary',
    },
    info: {
      glow: 'bg-info/20',
      icon: 'from-info/20 to-info/5',
      border: 'border-info/20',
      ping: 'border-info/30',
      iconColor: 'text-info',
    },
    warm: {
      glow: 'bg-warm/20',
      icon: 'from-warm/20 to-warm/5',
      border: 'border-warm/20',
      ping: 'border-warm/30',
      iconColor: 'text-warm',
    },
  };

  const colors = colorVariants[accentColor];

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className={cn('absolute inset-0 rounded-3xl blur-2xl scale-125', colors.glow)} />
          <div
            className={cn(
              'relative size-20 rounded-3xl bg-linear-to-br flex items-center justify-center border',
              colors.icon,
              colors.border
            )}
          >
            <Icon className={cn('size-10 animate-pulse', colors.iconColor)} />
          </div>
          <div
            className={cn('absolute inset-0 rounded-3xl border-2 animate-ping', colors.ping)}
            style={{ animationDuration: '2s' }}
          />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground mb-1">{title}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
