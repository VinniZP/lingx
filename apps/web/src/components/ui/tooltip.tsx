'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { usePlatform } from '@/hooks';
import { cn } from '@/lib/utils';

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

interface TooltipContentProps extends React.ComponentProps<typeof TooltipPrimitive.Content> {
  /** Optional keyboard shortcut to display (use ⌘ for modifier, will be converted to Ctrl on non-Mac) */
  kbd?: string;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  kbd,
  ...props
}: TooltipContentProps) {
  const { isMac } = usePlatform();

  // Transform kbd string for non-Mac platforms: ⌘ → Ctrl+, ⌥ → Alt+, ⇧ → Shift+
  const displayKbd = React.useMemo(() => {
    if (!kbd) return undefined;
    if (isMac) return kbd;

    return kbd
      .replace(/⌘/g, 'Ctrl+')
      .replace(/⌥/g, 'Alt+')
      .replace(/⇧/g, 'Shift+')
      .replace(/⏎/g, 'Enter')
      .replace(/⌫/g, 'Backspace');
  }, [kbd, isMac]);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // Layout
          'z-50 w-fit max-w-[280px]',
          // Premium dark style - always dark for contrast
          'bg-zinc-900 text-zinc-100',
          // Subtle border and shadow
          'border border-zinc-800 shadow-lg shadow-black/20',
          // Typography
          'text-[13px] leading-snug font-medium tracking-[-0.01em]',
          // Spacing
          'rounded-lg px-3 py-2',
          // Smooth animations
          'animate-in fade-in-0 zoom-in-95 duration-150',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100',
          'data-[side=bottom]:slide-in-from-top-1',
          'data-[side=left]:slide-in-from-right-1',
          'data-[side=right]:slide-in-from-left-1',
          'data-[side=top]:slide-in-from-bottom-1',
          'origin-(--radix-tooltip-content-transform-origin)',
          className
        )}
        {...props}
      >
        {displayKbd ? (
          <div className="flex items-center justify-between gap-3">
            <span>{children}</span>
            <kbd className="font-kbd shrink-0 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[11px] font-normal text-zinc-400">
              {displayKbd}
            </kbd>
          </div>
        ) : (
          children
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
