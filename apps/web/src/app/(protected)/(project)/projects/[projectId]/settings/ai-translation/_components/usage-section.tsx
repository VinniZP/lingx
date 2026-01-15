'use client';

import {
  formatAICost,
  formatTokenCount,
  getAIProviderDisplayName,
  getModelDisplayName,
  useAIUsage,
} from '@/hooks/use-ai-translation';
import { cn } from '@/lib/utils';
import { tKey, useTranslation } from '@lingx/sdk-nextjs';
import { Activity, BarChart3, CircleDollarSign, Loader2, TrendingUp, Zap } from 'lucide-react';

interface UsageSectionProps {
  projectId: string;
}

const STAT_CONFIG = [
  {
    labelKey: tKey('usage.stats.totalTokens', 'aiTranslation'),
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    labelKey: tKey('usage.stats.requests', 'aiTranslation'),
    icon: Zap,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    labelKey: tKey('usage.stats.cacheHits', 'aiTranslation'),
    icon: TrendingUp,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    labelKey: tKey('usage.stats.estCost', 'aiTranslation'),
    icon: CircleDollarSign,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
] as const;

export function UsageSection({ projectId }: UsageSectionProps) {
  const { t, td } = useTranslation('aiTranslation');
  const { data: usageData, isLoading } = useAIUsage(projectId);
  const providers = usageData?.providers || [];

  if (isLoading) {
    return (
      <div className="border-border/60 bg-card/50 animate-fade-in-up stagger-3 flex items-center justify-center rounded-2xl border p-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (providers.length === 0) {
    return null;
  }

  const totals = providers.reduce(
    (acc, stat) => ({
      tokens: acc.tokens + stat.currentMonth.inputTokens + stat.currentMonth.outputTokens,
      requests: acc.requests + stat.currentMonth.requestCount,
      cacheHits: acc.cacheHits + stat.currentMonth.cacheHits,
      cost: acc.cost + stat.currentMonth.estimatedCost,
    }),
    { tokens: 0, requests: 0, cacheHits: 0, cost: 0 }
  );

  const stats = STAT_CONFIG.map((config, index) => ({
    ...config,
    value:
      index === 0
        ? formatTokenCount(totals.tokens)
        : index === 1
          ? totals.requests.toLocaleString()
          : index === 2
            ? totals.cacheHits.toLocaleString()
            : formatAICost(totals.cost),
  }));

  return (
    <div className="border-border/60 bg-card/50 animate-fade-in-up stagger-3 overflow-hidden rounded-2xl border">
      {/* Header */}
      <div className="border-border/40 border-b p-6">
        <div className="flex items-center gap-3">
          <div className="from-success/15 to-success/5 border-success/10 flex size-10 items-center justify-center rounded-xl border bg-linear-to-br">
            <BarChart3 className="text-success size-4.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t('usage.title')}</h3>
            <p className="text-muted-foreground mt-0.5 text-[13px]">{t('usage.description')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.labelKey}
              className="bg-background/50 border-border/40 rounded-xl border p-4 text-center"
            >
              <div
                className={cn(
                  'mx-auto mb-2 flex size-8 items-center justify-center rounded-lg',
                  stat.bgColor
                )}
              >
                <stat.icon className={cn('size-4', stat.color)} />
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-muted-foreground mt-0.5 text-[11px]">{td(stat.labelKey)}</div>
            </div>
          ))}
        </div>

        {/* Provider Breakdown */}
        {providers.length > 1 && (
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-medium">{t('usage.byProvider')}</h4>
            <div className="space-y-2">
              {providers.map((stat) => {
                const totalTokens = stat.currentMonth.inputTokens + stat.currentMonth.outputTokens;
                const percentage = totals.tokens > 0 ? (totalTokens / totals.tokens) * 100 : 0;

                return (
                  <div
                    key={`${stat.provider}-${stat.model}`}
                    className="border-border/40 bg-background/30 rounded-xl border p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getAIProviderDisplayName(stat.provider)}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {getModelDisplayName(stat.model)}
                        </span>
                      </div>
                      <span className="text-primary text-sm font-semibold">
                        {formatAICost(stat.currentMonth.estimatedCost)}
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-[10px]">
                      <span>
                        {formatTokenCount(totalTokens)} {t('usage.tokens')}
                      </span>
                      <span>
                        {stat.currentMonth.requestCount} {t('usage.requests')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
