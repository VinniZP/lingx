'use client';

import { usePlatform } from '@/hooks';
import { cn } from '@/lib/utils';
import { Command } from 'lucide-react';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
  /** Show in a pill/badge style */
  variant?: 'default' | 'pill';
}

/**
 * Keyboard shortcut display with platform-aware modifier.
 * Shows ⌘ icon on Mac, "Ctrl" text on Windows/Linux.
 *
 * Usage: <Kbd>M</Kbd> renders as [⌘] M on Mac, [Ctrl] M on Windows
 */
export function Kbd({ children, className, variant = 'default' }: KbdProps) {
  const { isMac } = usePlatform();

  const ModifierDisplay = isMac ? (
    <Command className="size-3" aria-hidden="true" />
  ) : (
    <span className="text-[10px] font-medium">Ctrl</span>
  );

  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'bg-background/20 font-kbd inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] tracking-wide text-inherit',
          className
        )}
      >
        {ModifierDisplay}
        {children}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {ModifierDisplay}
      <span className="font-kbd text-xs">{children}</span>
    </span>
  );
}
