'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SettingsPageHeader - Premium hero section for settings pages
 *
 * Features:
 * - Gradient accent band at top
 * - Icon with glow effect
 * - Title and description
 * - Optional right-side widget slot
 * - Optional bottom action slot
 */

interface SettingsPageHeaderProps {
  /**
   * The main icon component to display
   */
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Page title
   */
  title: string;
  /**
   * Page description
   */
  description: string;
  /**
   * Accent color theme
   * @default 'primary'
   */
  accentColor?: 'primary' | 'info' | 'warm';
  /**
   * Optional widget to display on the right side
   */
  widget?: React.ReactNode;
  /**
   * Optional action area below the header content
   */
  actions?: React.ReactNode;
  /**
   * Optional badges/tags to display next to the title
   */
  badges?: React.ReactNode;
  /**
   * Animation stagger class
   * @default 'stagger-1'
   */
  stagger?: string;
}

export function SettingsPageHeader({
  icon: Icon,
  title,
  description,
  accentColor = 'primary',
  widget,
  actions,
  badges,
  stagger = 'stagger-1',
}: SettingsPageHeaderProps) {
  const colorVariants = {
    primary: {
      band: 'from-primary via-primary/70 to-warm',
      glow1: 'bg-primary/25',
      glow2: 'from-primary/30 to-warm/20',
      icon: 'from-primary/20 via-primary/10 to-warm/5',
      iconBorder: 'border-primary/20',
      iconColor: 'text-primary',
      shadow: 'shadow-primary/[0.03]',
    },
    info: {
      band: 'from-info via-info/70 to-primary',
      glow1: 'bg-info/25',
      glow2: 'from-info/30 to-primary/20',
      icon: 'from-info/20 via-info/10 to-primary/5',
      iconBorder: 'border-info/20',
      iconColor: 'text-info',
      shadow: 'shadow-info/[0.03]',
    },
    warm: {
      band: 'from-warm via-warm/70 to-primary',
      glow1: 'bg-warm/25',
      glow2: 'from-warm/30 to-primary/20',
      icon: 'from-warm/20 via-warm/10 to-primary/5',
      iconBorder: 'border-warm/20',
      iconColor: 'text-warm',
      shadow: 'shadow-warm/[0.03]',
    },
  };

  const colors = colorVariants[accentColor];

  return (
    <div className={cn('relative mb-12 animate-fade-in-up', stagger)}>
      <div className={cn('island overflow-hidden border-0 shadow-lg', colors.shadow)}>
        {/* Gradient accent band */}
        <div className={cn('h-1.5 bg-gradient-to-r', colors.band)} />

        <div className="p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            {/* Icon with premium glow effect */}
            <div className="relative shrink-0">
              <div className={cn('absolute inset-0 rounded-3xl blur-2xl scale-110', colors.glow1)} />
              <div className={cn('absolute inset-0 bg-gradient-to-br rounded-3xl blur-xl', colors.glow2)} />
              <div
                className={cn(
                  'relative size-20 lg:size-24 rounded-3xl bg-gradient-to-br flex items-center justify-center border backdrop-blur-sm',
                  colors.icon,
                  colors.iconBorder
                )}
              >
                <Icon className={cn('size-10 lg:size-12', colors.iconColor)} />
                <Sparkles className={cn('absolute -top-1 -right-1 size-5 animate-pulse', colors.iconColor)} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                  {title}
                </h1>
                {badges}
              </div>
              <p className="text-muted-foreground text-base lg:text-lg max-w-xl leading-relaxed">
                {description}
              </p>
            </div>

            {/* Optional widget slot */}
            {widget}
          </div>

          {/* Optional actions area */}
          {actions && (
            <div className="mt-8 pt-8 border-t border-border/40">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}
