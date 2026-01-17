'use client';

import { LoadingPulse } from '@/components/namespace-loader';
import { SettingsSectionHeader } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRequirePermission } from '@/hooks';
import { getQualityConfig, updateQualityConfig } from '@/lib/api/quality';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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

  // Permission check - MANAGER+ required
  const { isLoading: isLoadingPermissions, hasPermission } = useRequirePermission({
    projectId,
    permission: 'canManageSettings',
  });

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

  // Show loading state while checking permissions or loading config
  if (isLoading || isLoadingPermissions || !hasPermission) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <LoadingPulse />
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

        <div className="border-border/60 bg-card/50 overflow-hidden rounded-2xl border">
          <div className="space-y-5 p-6">
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

            <div className="from-border/60 via-border/30 h-px bg-linear-to-r to-transparent" />

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

        <div className="border-border/60 bg-card/50 overflow-hidden rounded-2xl border">
          <div className="space-y-6 p-6">
            {/* Visual Threshold Bar */}
            <div className="bg-muted/30 border-border/50 rounded-xl border p-4">
              <div className="from-destructive/20 via-warning/20 to-success/20 relative h-3 overflow-hidden rounded-full bg-linear-to-r">
                {/* Threshold markers */}
                <div
                  className="bg-warning absolute top-0 bottom-0 w-0.5 transition-all duration-300"
                  style={{ left: `${flagThreshold}%` }}
                />
                <div
                  className="bg-success absolute top-0 bottom-0 w-0.5 transition-all duration-300"
                  style={{ left: `${autoApproveThreshold}%` }}
                />
              </div>
              {/* Labels positioned relative to the bar */}
              <div className="text-muted-foreground relative mt-2 h-4 text-[10px] font-medium">
                {/* Fixed left label */}
                <div className="absolute left-0 flex items-center gap-1">
                  <AlertTriangle className="text-destructive size-3" />
                  <span>Needs Review</span>
                </div>
                {/* Flag threshold label - positioned at threshold % */}
                <div
                  className="absolute flex -translate-x-1/2 items-center gap-1 transition-all duration-300"
                  style={{ left: `${flagThreshold}%` }}
                >
                  <span className="text-warning">Flag at {flagThreshold}</span>
                </div>
                {/* Auto-approve label - positioned at threshold % */}
                <div
                  className="absolute flex -translate-x-1/2 items-center gap-1 transition-all duration-300"
                  style={{ left: `${autoApproveThreshold}%` }}
                >
                  <span className="text-success">Auto-approve at {autoApproveThreshold}</span>
                </div>
                {/* Fixed right label */}
                <div className="absolute right-0 flex items-center gap-1">
                  <CheckCircle2 className="text-success size-3" />
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
          className="border-border/60 bg-card/50 group hover:border-primary/20 flex items-center justify-between rounded-2xl border p-5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-10 items-center justify-center rounded-xl">
              <Sparkles className="text-primary size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Configure AI Providers</p>
              <p className="text-muted-foreground text-xs">
                Set up OpenAI, Anthropic, Google AI, or Mistral for quality evaluation
              </p>
            </div>
          </div>
          <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 transition-all group-hover:translate-x-1" />
        </Link>
      </section>

      {/* Save Footer */}
      <div className="border-border/60 bg-card/50 overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-muted-foreground text-[11px]">{t('projectSettings.unsavedChanges')}</p>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="min-w-[120px]">
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
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg transition-opacity',
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
              'cursor-pointer text-sm font-medium transition-colors',
              !checked && 'text-muted-foreground'
            )}
          >
            {label}
          </Label>
          <p className="text-muted-foreground truncate text-xs">{description}</p>
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
        <div
          className={cn(
            'flex size-7 items-center justify-center rounded-lg',
            styles.bg,
            styles.text
          )}
        >
          {icon}
        </div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      </div>
      <div
        className={cn(
          'bg-card border-border/50 flex h-11 items-center gap-3 rounded-xl border px-4',
          'transition-all focus-within:ring-2 focus-within:ring-offset-0',
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
          className="h-auto w-16 border-0 bg-transparent p-0 text-lg font-semibold focus-visible:ring-0"
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
      <p className="text-muted-foreground pl-9 text-xs">{description}</p>
    </div>
  );
}
