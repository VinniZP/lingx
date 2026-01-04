'use client';

import { usePlatform } from '@/hooks';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Sparkles } from 'lucide-react';
import type { GuideStep } from '../steps';

interface SidebarStepProps {
  step: GuideStep;
}

/**
 * Step 1: "The Navigator" - Split diagonal layout
 * Large stylized sidebar mockup on left, floating features on right
 */
export function SidebarStep({ step }: SidebarStepProps) {
  const { t } = useTranslation();
  const { isMac } = usePlatform();
  const mod = isMac ? '⌘' : 'Ctrl';

  return (
    <div className="grid grid-cols-[1fr,1.2fr] gap-8">
      {/* Left: Stylized Sidebar Mockup */}
      <div className="relative">
        {/* Gradient glow background */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent blur-xl" />

        {/* Sidebar illustration */}
        <div className="border-border/30 bg-card/50 relative overflow-hidden rounded-2xl border backdrop-blur-sm">
          {/* Header */}
          <div className="border-border/30 flex items-center justify-between border-b px-4 py-3">
            <span className="text-muted-foreground text-sm font-medium">Keys</span>
            <span className="text-muted-foreground/60 text-xs">50</span>
          </div>

          {/* Key list items */}
          <div className="space-y-1 p-2">
            {/* Regular item */}
            <div className="bg-muted/30 rounded-lg px-3 py-2.5">
              <div className="text-foreground/70 text-sm">common.greeting</div>
              <div className="text-muted-foreground/50 mt-0.5 text-xs">Hello, World!</div>
              <div className="mt-1.5 flex gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* SELECTED item with spotlight glow */}
            <div className="relative">
              <div className="absolute -inset-1 animate-pulse rounded-xl bg-violet-500/30 blur-md" />
              <div className="relative rounded-lg border-2 border-violet-500 bg-violet-500/10 px-3 py-2.5">
                <div className="font-medium text-violet-700 dark:text-violet-300">auth.signIn</div>
                <div className="mt-0.5 text-xs text-violet-600/70 dark:text-violet-400/70">
                  Sign in to continue
                </div>
                <div className="mt-1.5 flex gap-1">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  <span className="bg-muted size-1.5 rounded-full" />
                  <span className="bg-muted size-1.5 rounded-full" />
                  <span className="bg-muted size-1.5 rounded-full" />
                </div>
              </div>
            </div>

            {/* More items fading out */}
            <div className="bg-muted/20 rounded-lg px-3 py-2.5 opacity-60">
              <div className="text-foreground/50 text-sm">auth.signOut</div>
              <div className="text-muted-foreground/30 mt-0.5 text-xs">Log out</div>
              <div className="mt-1.5 flex gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500/50" />
                <span className="size-1.5 rounded-full bg-emerald-500/50" />
                <span className="size-1.5 rounded-full bg-emerald-500/50" />
                <span className="bg-muted/50 size-1.5 rounded-full" />
                <span className="bg-muted/50 size-1.5 rounded-full" />
              </div>
            </div>

            <div className="bg-muted/10 rounded-lg px-3 py-2.5 opacity-30">
              <div className="text-foreground/30 text-sm">error.notFound</div>
              <div className="text-muted-foreground/20 mt-0.5 text-xs">Page not found</div>
            </div>
          </div>

          {/* Pagination footer */}
          <div className="border-border/30 flex items-center justify-center gap-2 border-t px-4 py-2">
            <span className="text-muted-foreground/50 text-xs">3 / 29</span>
          </div>
        </div>
      </div>

      {/* Right: Features & Shortcuts */}
      <div className="flex flex-col justify-center space-y-6">
        {/* Title area */}
        <div>
          <h3 className="text-foreground text-2xl font-semibold tracking-tight">
            {t(step.titleKey)}
          </h3>
          <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
            {t(step.descriptionKey)}
          </p>
        </div>

        {/* Feature pills - floating organic layout */}
        <div className="flex flex-wrap gap-2">
          {step.features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className={cn(
                  'bg-card/60 border-border/40 flex items-center gap-2 rounded-full border px-3 py-1.5',
                  'animate-fade-in-up',
                  i === 0 && 'stagger-1',
                  i === 1 && 'stagger-2',
                  i === 2 && 'stagger-3',
                  i === 3 && 'stagger-4'
                )}
              >
                <Icon className="size-3.5 text-violet-600 dark:text-violet-400" />
                <span className="text-foreground/80 text-sm">{t(feature.titleKey)}</span>
              </div>
            );
          })}
        </div>

        {/* Shortcut highlight */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <kbd className="font-kbd bg-card rounded-md border px-2 py-1 text-sm shadow-sm">
                {mod}
              </kbd>
              <span className="text-muted-foreground">+</span>
              <kbd className="font-kbd bg-card rounded-md border px-2 py-1 text-sm shadow-sm">
                ↑↓
              </kbd>
            </div>
            <span className="text-foreground/70 text-sm">Navigate between keys</span>
          </div>
        </div>

        {/* Pro tip */}
        {step.proTipKey && (
          <div className="text-muted-foreground/80 flex items-start gap-2 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400" />
            <span className="italic">{t(step.proTipKey)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
