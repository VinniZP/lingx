'use client';

import { ExternalLink, BookOpen } from 'lucide-react';

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
      className="p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors group"
    >
      <div className="size-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors border border-border/30 group-hover:border-primary/20">
        <Icon className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <ExternalLink className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </a>
  );
}
