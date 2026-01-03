'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Save,
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
import { SettingsSectionHeader } from '@/components/settings';

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
  const [scoreAfterAITranslation, setScoreAfterAITranslation] = useState(true);
  const [scoreBeforeMerge, setScoreBeforeMerge] = useState(false);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(80);
  const [flagThreshold, setFlagThreshold] = useState(60);

  // Sync state when config loads - safe pattern for form initialization
  useEffect(() => {
    if (config) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync form from server data
      setScoreAfterAITranslation(config.scoreAfterAITranslation);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync form from server data
      setScoreBeforeMerge(config.scoreBeforeMerge);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync form from server data
      setAutoApproveThreshold(config.autoApproveThreshold);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync form from server data
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
    <div className="space-y-8">
      {/* Scoring Triggers */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={Zap}
          title={t('settings.quality.triggers.title')}
          description={t('settings.quality.triggers.description')}
          color="emerald"
        />

        <div className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
          <div className="p-6 space-y-5">
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
      </section>

      {/* Thresholds */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={Target}
          title={t('settings.quality.thresholds.title')}
          description={t('settings.quality.thresholds.description')}
          color="amber"
        />

        <div className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Visual Threshold Bar */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
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
              {/* Labels positioned relative to the bar */}
              <div className="relative mt-2 text-[10px] font-medium text-muted-foreground h-4">
                {/* Fixed left label */}
                <div className="absolute left-0 flex items-center gap-1">
                  <AlertTriangle className="size-3 text-destructive" />
                  <span>Needs Review</span>
                </div>
                {/* Flag threshold label - positioned at threshold % */}
                <div
                  className="absolute flex items-center gap-1 -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${flagThreshold}%` }}
                >
                  <span className="text-warning">Flag at {flagThreshold}</span>
                </div>
                {/* Auto-approve label - positioned at threshold % */}
                <div
                  className="absolute flex items-center gap-1 -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${autoApproveThreshold}%` }}
                >
                  <span className="text-success">Auto-approve at {autoApproveThreshold}</span>
                </div>
                {/* Fixed right label */}
                <div className="absolute right-0 flex items-center gap-1">
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
        </div>
      </section>

      {/* AI Provider Link */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={Sparkles}
          title={t('settings.quality.aiProviderLink.title')}
          description={t('settings.quality.aiProviderLink.description')}
        />

        <Link
          href={`/projects/${projectId}/settings/ai-translation`}
          className="flex items-center justify-between p-5 rounded-2xl border border-border/60 bg-card/50 group hover:border-primary/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Configure AI Providers</p>
              <p className="text-xs text-muted-foreground">
                Set up OpenAI, Anthropic, Google AI, or Mistral for quality evaluation
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </section>

      {/* Save Footer */}
      <div className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {t('projectSettings.unsavedChanges')}
          </p>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="min-w-[120px]"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Save className="size-4" />
                {t('common.saveChanges')}
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
