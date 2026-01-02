'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@lingx/sdk-nextjs';

/**
 * SettingsBackLink - Premium back navigation component for settings subpages
 *
 * Features:
 * - Icon container with hover effect
 * - Smooth transitions
 * - Arrow animation on hover
 */

interface SettingsBackLinkProps {
  /**
   * The href to navigate back to
   * @default '/settings'
   */
  href?: string;
  /**
   * Custom label text (uses translation by default)
   */
  label?: string;
}

export function SettingsBackLink({
  href = '/settings',
  label,
}: SettingsBackLinkProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 group mb-12 animate-fade-in-up"
    >
      <div className="size-9 rounded-xl bg-card border border-border/50 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300 shadow-sm">
        <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
      </div>
      <span className="font-medium tracking-tight">
        {label ?? t('settings.backToSettings')}
      </span>
    </Link>
  );
}
