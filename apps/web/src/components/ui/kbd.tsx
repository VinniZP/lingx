'use client';

import { Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
  /** Show in a pill/badge style */
  variant?: 'default' | 'pill';
}

/**
 * Keyboard shortcut display with command icon
 * Usage: <Kbd>M</Kbd> renders as [⌘ icon] M
 */
export function Kbd({ children, className, variant = 'default' }: KbdProps) {
  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/20 text-inherit font-kbd text-[11px] tracking-wide',
          className
        )}
      >
        <Command className="size-3" />
        {children}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <Command className="size-3" />
      <span className="font-kbd text-xs">{children}</span>
    </span>
  );
}
