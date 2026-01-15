'use client';

import { BookOpen, ExternalLink } from 'lucide-react';

/**
 * SettingsResourceLink - External documentation link with premium styling
 *
 * Features:
 * - Icon container with hover effect
 * - External link indicator
 * - Smooth transitions
 */

interface SettingsResourceLinkProps {
  /**
   * The URL to link to
   */
  href: string;
  /**
   * Link title
   */
  title: string;
  /**
   * Link description
   */
  description: string;
  /**
   * Optional custom icon (defaults to BookOpen)
   */
  icon?: React.ComponentType<{ className?: string }>;
}

export function SettingsResourceLink({
  href,
  title,
  description,
  icon: Icon = BookOpen,
}: SettingsResourceLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-muted/20 group flex items-center gap-4 p-5 transition-colors"
    >
      <div className="bg-muted/40 group-hover:bg-primary/10 border-border/30 group-hover:border-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors">
        <Icon className="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="group-hover:text-primary text-sm font-semibold transition-colors">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      </div>
      <ExternalLink className="text-muted-foreground/40 group-hover:text-primary size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
    </a>
  );
}
