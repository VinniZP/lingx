'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Check, Sparkles } from 'lucide-react';
import type { GuideStep } from '../steps';

interface EditorStepProps {
  step: GuideStep;
}

/**
 * Step 2: "The Craftsman" - Centered typewriter layout
 * Large editor mockup in center, ICU ribbon at bottom
 */
export function EditorStep({ step }: EditorStepProps) {
  const { t, td } = useTranslation();

  return (
    <div className="flex flex-col items-center">
      {/* Title - centered above */}
      <div className="mb-6 text-center">
        <h3 className="text-foreground text-2xl font-semibold tracking-tight">
          {td(step.titleKey)}
        </h3>
        <p className="text-muted-foreground mt-2 text-[15px]">{td(step.descriptionKey)}</p>
      </div>

      {/* Editor mockup - typewriter style */}
      <div className="relative w-full max-w-md">
        {/* Glow effect */}
        <div className="absolute -inset-6 rounded-3xl bg-gradient-to-b from-emerald-500/15 via-teal-500/10 to-transparent blur-2xl" />

        {/* Editor card */}
        <div className="border-border/40 bg-card/80 relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-sm">
          {/* Language header */}
          <div className="border-border/30 flex items-center gap-3 border-b px-4 py-3">
            <span className="text-lg">🇬🇧</span>
            <div>
              <span className="text-foreground font-medium">
                {t('workbench.guide.demo.languages.english')}
              </span>
              <span className="text-muted-foreground ml-2 text-sm">
                · {t('workbench.guide.demo.source')}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-muted-foreground/60 text-xs">
                {t('workbench.guide.demo.chars', { count: 12 })}
              </span>
            </div>
          </div>

          {/* Text area with blinking cursor */}
          <div className="relative px-4 py-6">
            <div className="text-foreground text-lg leading-relaxed">
              {t('workbench.guide.demo.sampleKeys.helloWorld').replace('!', '')}
              <span className="animate-blink ml-0.5 inline-block h-5 w-0.5 bg-emerald-500" />
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="absolute top-3 right-4 flex items-center gap-1.5">
            <div className="size-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-500/80">
              {t('workbench.guide.demo.autoSaved')}
            </span>
          </div>
        </div>

        {/* Features as floating badges around the editor */}
        <div className="animate-fade-in-up stagger-1 absolute -top-2 -right-4">
          <div className="bg-card/90 border-border/40 flex items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-lg">
            <Check className="size-3.5 text-emerald-500" />
            <span className="text-xs">{t('workbench.guide.demo.autoSave')}</span>
          </div>
        </div>
      </div>

      {/* ICU Ribbon - full width highlight */}
      <div className="mt-8 w-full">
        <div className="relative overflow-hidden rounded-xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent" />

          {/* Content */}
          <div className="relative px-6 py-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <span className="text-foreground/80 text-sm font-medium">
                {t('workbench.guide.demo.icuMessageFormat')}
              </span>
            </div>
            <code className="font-kbd text-sm">
              <span className="text-muted-foreground">{'{'}</span>
              <span className="text-emerald-600 dark:text-emerald-400">count</span>
              <span className="text-muted-foreground">, plural,</span>
              <span className="text-amber-600 dark:text-amber-400"> one </span>
              <span className="text-muted-foreground">{'{'}</span>
              <span className="text-foreground/80"># item</span>
              <span className="text-muted-foreground">{'}'}</span>
              <span className="text-amber-600 dark:text-amber-400"> other </span>
              <span className="text-muted-foreground">{'{'}</span>
              <span className="text-foreground/80"># items</span>
              <span className="text-muted-foreground">{'}'}</span>
              <span className="text-muted-foreground">{'}'}</span>
            </code>
          </div>
        </div>
      </div>

      {/* Shortcuts row */}
      <div className="mt-6 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <kbd className="font-kbd bg-card rounded border px-2 py-0.5 text-sm">Tab</kbd>
          <span className="text-muted-foreground text-sm">
            {t('workbench.guide.demo.nextField')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="font-kbd bg-card rounded border px-2 py-0.5 text-sm">Shift</kbd>
          <span className="text-muted-foreground text-sm">+</span>
          <kbd className="font-kbd bg-card rounded border px-2 py-0.5 text-sm">Tab</kbd>
          <span className="text-muted-foreground text-sm">
            {t('workbench.guide.demo.previous')}
          </span>
        </div>
      </div>

      {/* Pro tip */}
      {step.proTipKey && (
        <div className="text-muted-foreground/70 mt-6 flex items-center gap-2 text-sm italic">
          <span className="text-emerald-500">💡</span>
          {td(step.proTipKey)}
        </div>
      )}
    </div>
  );
}
