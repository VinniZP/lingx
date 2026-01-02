'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Sparkles, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAIConfigs, useAISupportedModels, getAIProviderDisplayName, getModelDisplayName } from '@/hooks/use-ai-translation';
import { getQualityConfig, updateQualityConfig } from '@/lib/api/quality';
import type { AIProvider } from '@/lib/api';
import { ProviderLogoIcon, getProviderColor } from './provider-logos';

interface QualityEvaluationSectionProps {
  projectId: string;
}

export function QualityEvaluationSection({ projectId }: QualityEvaluationSectionProps) {
  const { t } = useTranslation('aiTranslation');
  const queryClient = useQueryClient();

  // Fetch enabled AI providers
  const { data: configsData } = useAIConfigs(projectId);
  const enabledProviders = (configsData?.configs || []).filter((c) => c.isActive);

  // Fetch quality config
  const { data: qualityConfig, isLoading } = useQuery({
    queryKey: ['quality-config', projectId],
    queryFn: () => getQualityConfig(projectId),
  });

  // Local state
  const [aiEnabled, setAiEnabled] = useState(qualityConfig?.aiEvaluationEnabled ?? false);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    qualityConfig?.aiEvaluationProvider || ''
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    qualityConfig?.aiEvaluationModel || ''
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch models for selected provider (hook internally checks enabled: !!provider)
  const { data: modelsData } = useAISupportedModels(selectedProvider as AIProvider);
  const models = modelsData?.models || [];

  // Update local state when config loads
  useEffect(() => {
    if (qualityConfig) {
      setAiEnabled(qualityConfig.aiEvaluationEnabled);
      setSelectedProvider(qualityConfig.aiEvaluationProvider || '');
      setSelectedModel(qualityConfig.aiEvaluationModel || '');
    }
  }, [qualityConfig]);

  // Track changes
  useEffect(() => {
    if (!qualityConfig) return;
    const changed =
      aiEnabled !== qualityConfig.aiEvaluationEnabled ||
      selectedProvider !== (qualityConfig.aiEvaluationProvider || '') ||
      selectedModel !== (qualityConfig.aiEvaluationModel || '');
    setHasChanges(changed);
  }, [aiEnabled, selectedProvider, selectedModel, qualityConfig]);

  // Auto-select first model when provider changes
  useEffect(() => {
    if (models.length > 0 && !models.includes(selectedModel)) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      updateQualityConfig(projectId, {
        aiEvaluationEnabled: aiEnabled,
        aiEvaluationProvider: selectedProvider || null,
        aiEvaluationModel: selectedModel || null,
      }),
    onSuccess: () => {
      toast.success(t('quality.saved'));
      queryClient.invalidateQueries({ queryKey: ['quality-config', projectId] });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(t('quality.saveFailed'), { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="island p-6 animate-fade-in-up">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="size-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  const hasEnabledProviders = enabledProviders.length > 0;

  return (
    <div className="island overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="p-5 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{t('quality.title')}</h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {t('quality.description')}
              </p>
            </div>
          </div>
          {hasChanges && (
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t('quality.save')}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Enable Toggle */}
        <div
          className={cn(
            'flex items-center justify-between p-4 rounded-xl border transition-all',
            aiEnabled
              ? 'bg-primary/5 border-primary/20'
              : 'bg-muted/30 border-border/50'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'size-9 rounded-lg flex items-center justify-center transition-colors',
                aiEnabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <Label htmlFor="aiQualityEnabled" className="text-sm font-medium cursor-pointer">
                {t('quality.enable')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('quality.enableDescription')}
              </p>
            </div>
          </div>
          <Switch
            id="aiQualityEnabled"
            checked={aiEnabled}
            onCheckedChange={setAiEnabled}
            disabled={!hasEnabledProviders}
          />
        </div>

        {/* No providers warning */}
        {!hasEnabledProviders && (
          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-sm text-warning">
            {t('quality.noProvidersWarning')}
          </div>
        )}

        {/* Provider & Model Selection */}
        {aiEnabled && hasEnabledProviders && (
          <div className="space-y-4 animate-fade-in">
            {/* Provider Select */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">{t('quality.provider')}</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t('quality.selectProvider')} />
                </SelectTrigger>
                <SelectContent>
                  {enabledProviders.map((config) => {
                    const colorClasses = getProviderColor(config.provider);
                    return (
                      <SelectItem key={config.provider} value={config.provider}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn('size-6 rounded-md flex items-center justify-center', colorClasses)}>
                            <ProviderLogoIcon provider={config.provider} className="size-3.5" />
                          </div>
                          <span>{getAIProviderDisplayName(config.provider)}</span>
                          {config.isActive && (
                            <CheckCircle2 className="size-3.5 text-success ml-auto" />
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('quality.providerDescription')}
              </p>
            </div>

            {/* Model Select */}
            {selectedProvider && models.length > 0 && (
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">{t('quality.model')}</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t('quality.selectModel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {getModelDisplayName(model)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('quality.modelDescription')}
                </p>
              </div>
            )}

            {/* Current Selection Summary */}
            {selectedProvider && selectedModel && (
              <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="size-4" />
                  <span className="font-medium">{t('quality.configuredWith')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {getAIProviderDisplayName(selectedProvider as AIProvider)} · {getModelDisplayName(selectedModel)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
