'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { ChevronDown, Filter, FolderTree, Globe, Search, Sparkles } from 'lucide-react';
import type { GuideStep } from '../steps';

interface FiltersStepProps {
  step: GuideStep;
}

/**
 * Step 7: "The Lens" - Radial focus layout
 * Search prominent, filters orbiting around focus center
 */
export function FiltersStep({ step }: FiltersStepProps) {
  const { t } = useTranslation();

  const filters = [
    {
      icon: Filter,
      label: t('workbench.guide.demo.filters.status'),
      value: t('workbench.guide.demo.filters.missing'),
      position: 'top-left',
    },
    {
      icon: Sparkles,
      label: t('workbench.guide.demo.filters.quality'),
      value: t('workbench.guide.demo.filters.low'),
      position: 'top-right',
    },
    {
      icon: FolderTree,
      label: t('workbench.guide.demo.filters.namespace'),
      value: t('workbench.guide.demo.filters.all'),
      position: 'bottom-left',
    },
    {
      icon: Globe,
      label: t('workbench.guide.demo.filters.language'),
      value: t('workbench.guide.demo.filters.all'),
      position: 'bottom-right',
    },
  ];

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
      <div className="relative mx-auto max-w-lg">
        {/* Gradient glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-transparent blur-3xl" />

        {/* Search bar - prominent at top */}
        <div className="animate-fade-in-up stagger-1 relative mb-12">
          <div className="border-border/50 bg-card/80 flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-sm">
            <Search className="text-muted-foreground size-5" />
            <input
              type="text"
              placeholder={t('workbench.guide.demo.searchKeys')}
              className="placeholder:text-muted-foreground/50 text-foreground flex-1 bg-transparent text-lg outline-none"
              readOnly
            />
            <kbd className="font-kbd text-muted-foreground/60 rounded border px-2 py-0.5 text-sm">
              /
            </kbd>
          </div>
        </div>

        {/* Focus ring animation */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Outer ring */}
          <div className="animate-focus-ring size-48 rounded-full border-2 border-cyan-500/20" />
          {/* Inner ring */}
          <div
            className="animate-focus-ring absolute inset-4 rounded-full border-2 border-cyan-500/30"
            style={{ animationDelay: '0.5s' }}
          />
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/40">
            <div className="absolute inset-1 rounded-full bg-cyan-400" />
          </div>
        </div>

        {/* Filter dropdowns orbiting */}
        <div className="relative h-56">
          {filters.map((filter, i) => {
            const Icon = filter.icon;
            const positionClasses = {
              'top-left': 'top-0 left-8',
              'top-right': 'top-0 right-8',
              'bottom-left': 'bottom-0 left-8',
              'bottom-right': 'bottom-0 right-8',
            }[filter.position];

            return (
              <div
                key={filter.label}
                className={cn('animate-fade-in-up absolute', positionClasses, `stagger-${i + 2}`)}
              >
                <div className="border-border/40 bg-card/70 flex items-center gap-2 rounded-xl border px-4 py-2.5 shadow-lg backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:bg-cyan-500/10">
                  <Icon className="size-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-foreground text-sm font-medium">{filter.label}</span>
                  <span className="text-muted-foreground/60 text-xs">{filter.value}</span>
                  <ChevronDown className="text-muted-foreground/50 size-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features list */}
      <div className="mt-8 flex justify-center gap-8">
        {step.features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Icon className="size-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-foreground/80">{t(feature.titleKey)}</span>
            </div>
          );
        })}
      </div>

      {/* Pro tip - highlighted */}
      {step.proTipKey && (
        <div className="mt-6 flex justify-center">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-center">
            <span className="text-cyan-600 dark:text-cyan-400">💡 </span>
            <span className="text-foreground/80 text-sm">{t(step.proTipKey)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
