'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Save,
  Gauge,
  Zap,
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { getQualityConfig, updateQualityConfig } from '@/lib/api/quality';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * Quality Settings Page
 *
 * Configures quality scoring triggers and thresholds.
 * AI provider settings are managed in AI Translation settings.
 */
export default function QualitySettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch current config
  const { data: config, isLoading } = useQuery({
    queryKey: ['quality-config', projectId],
    queryFn: () => getQualityConfig(projectId),
  });

  // Local state for form
  const [scoreAfterAITranslation, setScoreAfterAITranslation] = useState(
    config?.scoreAfterAITranslation ?? true
  );
  const [scoreBeforeMerge, setScoreBeforeMerge] = useState(config?.scoreBeforeMerge ?? false);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(
    config?.autoApproveThreshold ?? 80
  );
  const [flagThreshold, setFlagThreshold] = useState(config?.flagThreshold ?? 60);

  // Update state when config loads
  useEffect(() => {
    if (config) {
      setScoreAfterAITranslation(config.scoreAfterAITranslation);
      setScoreBeforeMerge(config.scoreBeforeMerge);
      setAutoApproveThreshold(config.autoApproveThreshold);
      setFlagThreshold(config.flagThreshold);
    }
  }, [config]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      updateQualityConfig(projectId, {
        scoreAfterAITranslation,
        scoreBeforeMerge,
        autoApproveThreshold,
        flagThreshold,
      }),
    onSuccess: () => {
      toast.success(t('settings.quality.saved'));
      queryClient.invalidateQueries({ queryKey: ['quality-config', projectId] });
    },
    onError: (error: Error) => {
      toast.error(t('settings.quality.saveFailed'), { description: error.message });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-16 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 text-primary animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{t('settings.quality.loading')}</p>
            <p className="text-xs text-muted-foreground">{t('common.pleaseWait')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Subtle ambient gradient */}
      <div className="absolute -top-20 -right-20 size-80 rounded-full bg-linear-to-br from-primary/5 via-transparent to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 size-60 rounded-full bg-linear-to-tr from-[#E8916F]/5 to-transparent blur-2xl pointer-events-none" />

      <div className="relative space-y-8">
        {/* Header */}
        <div className="animate-fade-in-up stagger-1">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center justify-center size-12 rounded-2xl bg-linear-to-br from-primary/15 to-primary/5 border border-primary/10 shadow-sm">
              <Gauge className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t('settings.quality.title')}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {t('settings.quality.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Scoring Triggers */}
        <div className="island p-6 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10">
              <Zap className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('settings.quality.triggers.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('settings.quality.triggers.description')}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* After AI Translation */}
            <SettingToggle
              id="scoreAfterAI"
              checked={scoreAfterAITranslation}
              onCheckedChange={setScoreAfterAITranslation}
              label={t('settings.quality.triggers.afterAI')}
              description={t('settings.quality.triggers.afterAIDescription')}
              icon={<Sparkles className="size-4" />}
              accentColor="primary"
            />

            <div className="h-px bg-linear-to-r from-border/60 via-border/30 to-transparent" />

            {/* Before Merge */}
            <SettingToggle
              id="scoreBeforeMerge"
              checked={scoreBeforeMerge}
              onCheckedChange={setScoreBeforeMerge}
              label={t('settings.quality.triggers.beforeMerge')}
              description={t('settings.quality.triggers.beforeMergeDescription')}
              icon={<ArrowRight className="size-4" />}
              accentColor="info"
            />
          </div>
        </div>

        {/* Thresholds */}
        <div className="island p-6 animate-fade-in-up stagger-3">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center size-10 rounded-xl bg-amber-500/10">
              <Target className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('settings.quality.thresholds.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('settings.quality.thresholds.description')}
              </p>
            </div>
          </div>

          {/* Visual Threshold Bar */}
          <div className="mb-8 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="relative h-3 rounded-full bg-linear-to-r from-destructive/20 via-warning/20 to-success/20 overflow-hidden">
              {/* Threshold markers */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-warning transition-all duration-300"
                style={{ left: `${flagThreshold}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-success transition-all duration-300"
                style={{ left: `${autoApproveThreshold}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-medium text-muted-foreground">
              <div className="flex items-center gap-1">
                <AlertTriangle className="size-3 text-destructive" />
                <span>Needs Review</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-warning">Flag at {flagThreshold}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-success">Auto-approve at {autoApproveThreshold}</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-success" />
                <span>Excellent</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Auto Approve Threshold */}
            <ThresholdInput
              id="autoApprove"
              value={autoApproveThreshold}
              onChange={setAutoApproveThreshold}
              label={t('settings.quality.thresholds.autoApprove')}
              description={t('settings.quality.thresholds.autoApproveDescription')}
              color="success"
              icon={<CheckCircle2 className="size-4" />}
            />

            {/* Flag Threshold */}
            <ThresholdInput
              id="flagThreshold"
              value={flagThreshold}
              onChange={setFlagThreshold}
              label={t('settings.quality.thresholds.flag')}
              description={t('settings.quality.thresholds.flagDescription')}
              color="warning"
              icon={<AlertTriangle className="size-4" />}
            />
          </div>
        </div>

        {/* AI Provider Link */}
        <Link
          href={`/projects/${projectId}/settings/ai-translation`}
          className="island p-5 flex items-center justify-between group hover:border-primary/20 transition-colors animate-fade-in-up stagger-4"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{t('settings.quality.aiProviderLink.title')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('settings.quality.aiProviderLink.description')}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Floating Save Button */}
        <div className="sticky bottom-6 flex justify-end animate-fade-in-up stagger-5">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={cn(
              'gap-2.5 h-12 px-8 rounded-xl shadow-lg',
              'bg-linear-to-r from-primary to-primary/90',
              'hover:from-primary/90 hover:to-primary/80',
              'shadow-primary/25 hover:shadow-primary/35',
              'transition-all duration-300'
            )}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span className="font-medium">{t('common.saving')}</span>
              </>
            ) : (
              <>
                <Save className="size-4.5" />
                <span className="font-medium">{t('common.save')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium Setting Toggle Component
 */
function SettingToggle({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  icon,
  accentColor = 'primary',
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description: string;
  icon: React.ReactNode;
  accentColor?: 'primary' | 'success' | 'warning' | 'info';
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'flex items-center justify-center size-9 rounded-lg shrink-0 transition-opacity',
            colorMap[accentColor],
            !checked && 'opacity-50'
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <Label
            htmlFor={id}
            className={cn(
              'text-sm font-medium cursor-pointer transition-colors',
              !checked && 'text-muted-foreground'
            )}
          >
            {label}
          </Label>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/**
 * Premium Threshold Input Component
 */
function ThresholdInput({
  id,
  value,
  onChange,
  label,
  description,
  color,
  icon,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  label: string;
  description: string;
  color: 'success' | 'warning';
  icon: React.ReactNode;
}) {
  const colorStyles = {
    success: {
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'focus-within:ring-success/30',
    },
    warning: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'focus-within:ring-warning/30',
    },
  };

  const styles = colorStyles[color];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={cn('flex items-center justify-center size-7 rounded-lg', styles.bg, styles.text)}>
          {icon}
        </div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      </div>
      <div
        className={cn(
          'flex items-center gap-3 px-4 h-11 rounded-xl bg-card border border-border/50',
          'focus-within:ring-2 focus-within:ring-offset-0 transition-all',
          styles.border
        )}
      >
        <Input
          id={id}
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-auto border-0 bg-transparent p-0 text-lg font-semibold w-16 focus-visible:ring-0"
        />
        <span className="text-muted-foreground text-sm">/ 100</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div
            className={cn('size-2 rounded-full transition-colors', styles.bg.replace('/10', ''))}
          />
          <span className={cn('text-xs font-medium', styles.text)}>
            {value >= 80 ? 'High' : value >= 60 ? 'Medium' : 'Low'}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground pl-9">{description}</p>
    </div>
  );
}
