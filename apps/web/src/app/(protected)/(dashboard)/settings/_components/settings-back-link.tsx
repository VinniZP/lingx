'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

export function SettingsBackLink({ href = '/settings', label }: SettingsBackLinkProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground group animate-fade-in-up mb-12 inline-flex items-center gap-3 text-sm transition-all duration-300"
    >
      <div className="bg-card border-border/50 group-hover:border-primary/30 group-hover:bg-primary/5 flex size-9 items-center justify-center rounded-xl border shadow-sm transition-all duration-300">
        <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
      </div>
      <span className="font-medium tracking-tight">{label ?? t('settings.backToSettings')}</span>
    </Link>
  );
}
