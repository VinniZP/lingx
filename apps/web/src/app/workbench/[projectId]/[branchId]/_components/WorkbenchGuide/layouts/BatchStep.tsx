'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Check, CheckSquare, Sparkles, Square, Trash2 } from 'lucide-react';
import type { GuideStep } from '../steps';

interface BatchStepProps {
  step: GuideStep;
}

/**
 * Step 6: "The Assembly Line" - Grid with conveyor flow
 * Checkbox grid with lines flowing to action bar
 */
export function BatchStep({ step }: BatchStepProps) {
  const { t } = useTranslation();

  const keys = [
    { name: 'common.save', selected: true },
    { name: 'common.cancel', selected: false },
    { name: 'common.delete', selected: true },
    { name: 'auth.login', selected: false },
    { name: 'auth.logout', selected: true },
    { name: 'error.404', selected: true },
  ];

  const selectedCount = keys.filter((k) => k.selected).length;

  return (
    <div>
      {/* Title */}
      <div className="mb-6 text-center">
        <h3 className="text-foreground text-2xl font-semibold tracking-tight">
          {t(step.titleKey)}
        </h3>
        <p className="text-muted-foreground mt-2 text-[15px]">{t(step.descriptionKey)}</p>
      </div>

      {/* Main visualization */}
      <div className="relative">
        {/* Gradient glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-transparent blur-3xl" />

        <div className="relative">
          {/* Checkbox grid */}
          <div className="mb-8 grid grid-cols-3 gap-3">
            {keys.map((key, i) => (
              <div
                key={key.name}
                className={cn(
                  'animate-fade-in-up border-border/40 bg-card/60 relative flex items-center gap-3 rounded-xl border p-3 backdrop-blur-sm',
                  key.selected && 'border-indigo-500/50 bg-indigo-500/10',
                  `stagger-${(i % 3) + 1}`
                )}
              >
                {/* Checkbox */}
                {key.selected ? (
                  <CheckSquare className="size-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Square className="text-muted-foreground/50 size-5" />
                )}
                <span
                  className={cn('text-sm', key.selected ? 'text-foreground' : 'text-foreground/60')}
                >
                  {key.name}
                </span>

                {/* Pulse animation for selected */}
                {key.selected && (
                  <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-indigo-500/20 blur-sm" />
                )}
              </div>
            ))}
          </div>

          {/* Conveyor lines - SVG */}
          <svg className="absolute inset-0 -z-10 h-full w-full overflow-visible" aria-hidden="true">
            {/* Lines from selected items to action bar */}
            <defs>
              <linearGradient id="conveyorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Simplified conveyor representation */}
            <path
              d="M 100 120 Q 100 180 200 200 M 340 120 Q 340 180 280 200 M 500 120 Q 500 180 360 200"
              stroke="url(#conveyorGradient)"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
              className="animate-dash"
            />
          </svg>

          {/* Action bar */}
          <div className="border-border/50 bg-card/80 animate-fade-in-up stagger-4 mx-auto flex max-w-xl items-center justify-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-sm">
            {/* Selection count */}
            <div className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-2.5 py-1">
              <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                {selectedCount}
              </span>
              <span className="text-muted-foreground text-xs">selected</span>
            </div>

            {/* Divider */}
            <div className="bg-border/40 h-6 w-px" />

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              <button className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-600 transition-colors hover:bg-emerald-500/30 dark:text-emerald-400">
                <Check className="size-3.5" />
                Approve
              </button>
              <button className="flex items-center gap-1 rounded-lg bg-blue-500/20 px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-500/30 dark:text-blue-400">
                <Sparkles className="size-3.5" />
                AI Translate
              </button>
              <button className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-500/30 dark:text-rose-400">
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features below */}
      <div className="mt-8 flex justify-center gap-8">
        {step.features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Icon className="size-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-foreground/80">{t(feature.titleKey)}</span>
            </div>
          );
        })}
      </div>

      {/* Pro tip */}
      {step.proTipKey && (
        <div className="text-muted-foreground/70 mt-6 text-center text-sm italic">
          <span className="text-indigo-600 dark:text-indigo-400">💡</span> {t(step.proTipKey)}
        </div>
      )}
    </div>
  );
}
