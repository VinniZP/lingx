'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import type { GuideStep } from '../steps';

interface LanguagesStepProps {
  step: GuideStep;
}

/**
 * Step 3: "The World" - Cascading diagonal cards
 * Language rows staggered with accordion-fold visual
 */
export function LanguagesStep({ step }: LanguagesStepProps) {
  const { t, td } = useTranslation();

  const languages = [
    {
      flag: '🇺🇦',
      name: t('workbench.guide.demo.languages.ukrainian'),
      status: t('workbench.guide.demo.status.pending'),
      statusKey: 'Pending',
      value: 'Всього',
      quality: 3,
      expanded: true,
    },
    {
      flag: '🇷🇺',
      name: t('workbench.guide.demo.languages.russian'),
      status: t('workbench.guide.demo.status.pending'),
      statusKey: 'Pending',
      value: 'Всего',
      quality: 4,
      expanded: true,
    },
    {
      flag: '🇩🇪',
      name: t('workbench.guide.demo.languages.german'),
      status: t('workbench.guide.demo.status.approved'),
      statusKey: 'Approved',
      value: 'Gesamt',
      quality: 5,
      expanded: false,
    },
  ];

  return (
    <div>
      {/* Title - offset to the right */}
      <div className="mb-8 ml-auto max-w-sm text-right">
        <h3 className="text-foreground text-2xl font-semibold tracking-tight">
          {td(step.titleKey)}
        </h3>
        <p className="text-muted-foreground mt-2 text-[15px]">{td(step.descriptionKey)}</p>
      </div>

      {/* Cascading language cards */}
      <div className="relative space-y-3">
        {/* Gradient glow */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-transparent blur-2xl" />

        {languages.map((lang, i) => (
          <div
            key={lang.name}
            className={cn(
              'animate-fade-in-up relative',
              i === 0 && 'stagger-1',
              i === 1 && 'stagger-2 ml-8',
              i === 2 && 'stagger-3 ml-16'
            )}
          >
            {/* Connector line to previous */}
            {i > 0 && (
              <div className="border-border/30 absolute -top-3 left-4 h-3 w-px border-l-2 border-dashed" />
            )}

            {/* Language card */}
            <div
              className={cn(
                'border-border/40 bg-card/70 overflow-hidden rounded-xl border backdrop-blur-sm',
                lang.expanded && 'ring-1 ring-blue-500/30'
              )}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <ChevronDown
                  className={cn(
                    'text-muted-foreground size-4 transition-transform',
                    !lang.expanded && '-rotate-90'
                  )}
                />
                <span className="text-xl">{lang.flag}</span>
                <span className="text-foreground font-medium">{lang.name}</span>

                {/* Status badge */}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    lang.statusKey === 'Approved'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  )}
                >
                  {lang.status}
                </span>

                {/* Quality dots */}
                <div className="ml-auto flex gap-1">
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <span
                      key={dot}
                      className={cn(
                        'size-1.5 rounded-full',
                        dot <= lang.quality
                          ? lang.statusKey === 'Approved'
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                          : 'bg-muted'
                      )}
                    />
                  ))}
                </div>

                {/* Action buttons (stylized) */}
                {lang.expanded && (
                  <div className="ml-4 flex items-center gap-2">
                    <button className="hover:bg-muted/50 rounded p-1">
                      <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button className="hover:bg-muted/50 rounded p-1">
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded content */}
              {lang.expanded && (
                <div className="border-border/30 border-t px-4 py-3">
                  <div className="bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-foreground/80">{lang.value}</span>
                  </div>
                  <div className="text-muted-foreground/60 mt-1 text-xs">
                    {t('workbench.guide.demo.charCount', {
                      current: lang.value.length,
                      total: lang.value.length,
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom instruction */}
      <div className="mt-8 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-600 dark:text-blue-400">
            {t('workbench.guide.demo.clickRow')}
          </span>
          <span className="text-muted-foreground">{t('workbench.guide.demo.toExpand')}</span>
        </div>
        <div className="bg-border/40 h-4 w-px" />
        <div className="flex items-center gap-2">
          <kbd className="font-kbd bg-card rounded border px-2 py-0.5 text-sm">Tab</kbd>
          <span className="text-muted-foreground text-sm">
            {t('workbench.guide.demo.toCycleLanguages')}
          </span>
        </div>
        <div className="bg-border/40 h-4 w-px" />
        <div className="flex items-center gap-2">
          <kbd className="font-kbd bg-card rounded border px-2 py-0.5 text-sm">Esc</kbd>
          <span className="text-muted-foreground text-sm">
            {t('workbench.guide.demo.toCollapse')}
          </span>
        </div>
      </div>

      {/* Pro tip */}
      {step.proTipKey && (
        <div className="text-muted-foreground/70 mt-6 text-center text-sm italic">
          <span className="text-blue-600 dark:text-blue-400">💡</span> {td(step.proTipKey)}
        </div>
      )}
    </div>
  );
}
