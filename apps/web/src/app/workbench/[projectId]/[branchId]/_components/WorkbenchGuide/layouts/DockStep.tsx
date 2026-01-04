'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { BookOpen, GripHorizontal, Layers, Link2, Sparkles } from 'lucide-react';
import type { GuideStep } from '../steps';

interface DockStepProps {
  step: GuideStep;
}

/**
 * Step 5: "The Treasure Chest" - Card fan layout
 * Dock tabs as fanned cards emerging from bottom
 */
export function DockStep({ step }: DockStepProps) {
  const { t } = useTranslation();

  const dockTabs = [
    {
      icon: Layers,
      label: 'TM',
      preview: '95%',
      color: 'from-pink-500/20 to-rose-500/10',
      iconColor: 'text-pink-600 dark:text-pink-400',
    },
    {
      icon: BookOpen,
      label: 'Glossary',
      preview: '3 terms',
      color: 'from-purple-500/20 to-violet-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: Sparkles,
      label: 'AI',
      preview: '2 ideas',
      color: 'from-blue-500/20 to-cyan-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: Link2,
      label: 'Related',
      preview: '5 keys',
      color: 'from-emerald-500/20 to-teal-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Title */}
      <div className="mb-4 text-center">
        <h3 className="text-foreground text-2xl font-semibold tracking-tight">
          {t(step.titleKey)}
        </h3>
        <p className="text-muted-foreground mt-2 text-[15px]">{t(step.descriptionKey)}</p>
      </div>

      {/* Instruction text */}
      <div className="text-muted-foreground/70 mb-8 flex items-center gap-2 text-sm">
        <span className="text-rose-600 dark:text-rose-400">↑</span>
        <span>Pull up to discover helpful suggestions</span>
      </div>

      {/* Fanned cards */}
      <div className="relative w-full">
        {/* Gradient glow behind cards */}
        <div className="absolute -bottom-4 left-1/2 h-32 w-96 -translate-x-1/2 rounded-full bg-gradient-to-t from-pink-500/15 via-rose-500/10 to-transparent blur-3xl" />

        {/* Cards in horizontal row */}
        <div className="relative flex items-end justify-center gap-3">
          {dockTabs.map((tab, i) => {
            const Icon = tab.icon;
            const rotation = (i - 1.5) * 4; // Subtle fan rotation
            const translateY = Math.abs(i - 1.5) * 6; // Slight lift at edges

            return (
              <div
                key={tab.label}
                className={cn('animate-fade-in-up', `stagger-${i + 1}`)}
                style={{
                  transform: `rotate(${rotation}deg) translateY(-${translateY}px)`,
                }}
              >
                <div
                  className={cn(
                    'border-border/50 bg-card/90 w-24 overflow-hidden rounded-xl border shadow-xl backdrop-blur-sm',
                    'transition-transform hover:-translate-y-2'
                  )}
                >
                  {/* Card gradient header */}
                  <div className={cn('bg-gradient-to-br p-2.5', tab.color)}>
                    <Icon className={cn('size-5', tab.iconColor)} />
                  </div>

                  {/* Card content */}
                  <div className="p-2.5">
                    <div className="text-foreground text-xs font-medium">{tab.label}</div>
                    <div className="text-muted-foreground/70 mt-0.5 text-[10px]">{tab.preview}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dock handle */}
      <div className="mt-4 flex flex-col items-center">
        <div className="border-border/40 bg-card/60 flex items-center gap-2 rounded-full border px-6 py-2 shadow-lg backdrop-blur-sm">
          <GripHorizontal className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-sm">Dock Panel</span>
        </div>
      </div>

      {/* Feature descriptions */}
      <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
        {step.features.slice(0, 4).map((feature, i) => {
          const Icon = feature.icon;
          return (
            <div key={i} className="flex items-start gap-2">
              <Icon className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <span className="text-foreground/80">{t(feature.titleKey)}</span>
                {feature.descriptionKey && (
                  <p className="text-muted-foreground/60 mt-0.5 text-xs">
                    {t(feature.descriptionKey)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pro tip */}
      {step.proTipKey && (
        <div className="text-muted-foreground/70 mt-6 text-center text-sm italic">
          <span className="text-rose-600 dark:text-rose-400">💡</span> {t(step.proTipKey)}
        </div>
      )}
    </div>
  );
}
