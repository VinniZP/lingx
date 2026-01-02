'use client';

import {tKey, useTranslation} from '@lingx/sdk-nextjs';
import { Loader2, BarChart3, Activity, Zap, TrendingUp, CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAIUsage,
  getAIProviderDisplayName,
  getModelDisplayName,
  formatTokenCount,
  formatAICost,
} from '@/hooks/use-ai-translation';

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
      <div className="rounded-2xl border border-border/60 bg-card/50 p-12 flex items-center justify-center animate-fade-in-up stagger-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
    value: index === 0
      ? formatTokenCount(totals.tokens)
      : index === 1
        ? totals.requests.toLocaleString()
        : index === 2
          ? totals.cacheHits.toLocaleString()
          : formatAICost(totals.cost),
  }));

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden animate-fade-in-up stagger-3">
      {/* Header */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-linear-to-br from-success/15 to-success/5 border border-success/10 flex items-center justify-center">
            <BarChart3 className="size-4.5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{t('usage.title')}</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {t('usage.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.labelKey}
              className="rounded-xl bg-background/50 border border-border/40 p-4 text-center"
            >
              <div className={cn('size-8 rounded-lg mx-auto mb-2 flex items-center justify-center', stat.bgColor)}>
                <stat.icon className={cn('size-4', stat.color)} />
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{td(stat.labelKey)}</div>
            </div>
          ))}
        </div>

        {/* Provider Breakdown */}
        {providers.length > 1 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{t('usage.byProvider')}</h4>
            <div className="space-y-2">
              {providers.map((stat) => {
                const totalTokens = stat.currentMonth.inputTokens + stat.currentMonth.outputTokens;
                const percentage = totals.tokens > 0 ? (totalTokens / totals.tokens) * 100 : 0;

                return (
                  <div
                    key={`${stat.provider}-${stat.model}`}
                    className="rounded-xl border border-border/40 bg-background/30 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{getAIProviderDisplayName(stat.provider)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {getModelDisplayName(stat.model)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {formatAICost(stat.currentMonth.estimatedCost)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                      <span>{formatTokenCount(totalTokens)} {t('usage.tokens')}</span>
                      <span>{stat.currentMonth.requestCount} {t('usage.requests')}</span>
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
