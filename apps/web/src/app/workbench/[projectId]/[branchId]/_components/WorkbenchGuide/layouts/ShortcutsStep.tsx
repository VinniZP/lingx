'use client';

import { usePlatform } from '@/hooks';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { GuideStep } from '../steps';

interface ShortcutsStepProps {
  step: GuideStep;
}

/**
 * Step 4: "The Command Center" - Radial constellation
 * Keyboard in center, shortcuts radiating outward
 */
export function ShortcutsStep({ step }: ShortcutsStepProps) {
  const { t, td } = useTranslation();
  const { isMac } = usePlatform();
  const mod = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      keys: [mod, 'M'],
      label: t('workbench.guide.demo.machineTranslate'),
      position: 'top-left',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      keys: [mod, 'I'],
      label: t('workbench.guide.demo.aiTranslate'),
      position: 'top-right',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      keys: [mod, '⏎'],
      label: t('workbench.guide.demo.approve'),
      position: 'right',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      keys: [mod, '⌫'],
      label: t('workbench.guide.demo.reject'),
      position: 'bottom-right',
      color: 'text-rose-600 dark:text-rose-400',
    },
    {
      keys: ['Esc'],
      label: t('workbench.guide.demo.collapse'),
      position: 'bottom',
      color: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div>
      {/* Title - centered */}
      <div className="mb-8 text-center">
        <h3 className="text-foreground text-2xl font-semibold tracking-tight">
          {td(step.titleKey)}
        </h3>
        <p className="text-muted-foreground mt-2 text-[15px]">{td(step.descriptionKey)}</p>
      </div>

      {/* Constellation layout */}
      <div className="relative mx-auto h-64 max-w-lg">
        {/* Gradient glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent blur-3xl" />

        {/* Center: Mini keyboard */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="border-border/50 bg-card/90 flex gap-1 rounded-xl border p-2 shadow-2xl backdrop-blur-sm">
            {['M', 'I', '⏎'].map((key, i) => (
              <div
                key={key}
                className={cn(
                  'font-kbd flex size-10 items-center justify-center rounded-lg border text-sm font-medium transition-all',
                  'border-border/40 bg-muted/50 hover:border-amber-500/50 hover:bg-amber-500/20',
                  i === 0 && 'animate-pulse-subtle'
                )}
              >
                {key}
              </div>
            ))}
          </div>
        </div>

        {/* Shortcut labels radiating out */}
        {shortcuts.map((shortcut, i) => {
          const positionClasses = {
            'top-left': 'top-0 left-4',
            'top-right': 'top-0 right-4',
            right: 'top-1/2 right-0 -translate-y-1/2',
            'bottom-right': 'bottom-8 right-8',
            bottom: 'bottom-0 left-1/2 -translate-x-1/2',
          }[shortcut.position];

          const lineRotation = {
            'top-left': 'rotate-[225deg]',
            'top-right': 'rotate-[-45deg]',
            right: 'rotate-0',
            'bottom-right': 'rotate-45',
            bottom: 'rotate-90',
          }[shortcut.position];

          return (
            <div
              key={shortcut.label}
              className={cn('animate-fade-in-up absolute', positionClasses, `stagger-${i + 1}`)}
            >
              {/* Connector line */}
              <div
                className={cn(
                  'bg-border/30 absolute top-1/2 left-1/2 h-px w-16 origin-left',
                  lineRotation
                )}
              />

              {/* Shortcut card */}
              <div className="bg-card/80 border-border/40 rounded-lg border p-3 backdrop-blur-sm">
                <div className="mb-1 flex items-center gap-1">
                  {shortcut.keys.map((key, ki) => (
                    <span key={ki}>
                      {ki > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
                      <kbd
                        className={cn(
                          'font-kbd rounded border px-1.5 py-0.5 text-xs',
                          'border-border/50 bg-muted/50'
                        )}
                      >
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
                <span className={cn('text-xs font-medium', shortcut.color)}>{shortcut.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Platform indicator */}
      <div className="mt-6 flex justify-center">
        <div className="bg-card/60 border-border/30 inline-flex items-center gap-2 rounded-full border px-4 py-2">
          <span className="text-muted-foreground text-sm">
            {t('workbench.guide.demo.platform')}:
          </span>
          <span className="text-foreground font-medium">{isMac ? 'macOS' : 'Windows/Linux'}</span>
          <span className="text-muted-foreground/60 text-xs">
            ({isMac ? t('workbench.guide.demo.macModifier') : t('workbench.guide.demo.winModifier')}
            )
          </span>
        </div>
      </div>

      {/* Pro tip */}
      {step.proTipKey && (
        <div className="text-muted-foreground/70 mt-4 text-center text-sm italic">
          <span className="text-amber-600 dark:text-amber-400">💡</span> {td(step.proTipKey)}
        </div>
      )}
    </div>
  );
}
