'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  getAIProviderDisplayName,
  getModelDisplayName,
  useAIConfigs,
  useAISupportedModels,
} from '@/hooks/use-ai-translation';
import type { AIProvider } from '@/lib/api';
import { getQualityConfig, updateQualityConfig } from '@/lib/api/quality';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Save, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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

  // Local state - initialized from config
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Sync state when config loads - safe pattern for form initialization
  useEffect(() => {
    if (qualityConfig) {
      setAiEnabled(qualityConfig.aiEvaluationEnabled);

      setSelectedProvider(qualityConfig.aiEvaluationProvider || '');

      setSelectedModel(qualityConfig.aiEvaluationModel || '');
    }
  }, [qualityConfig]);

  // Fetch models for selected provider (hook internally checks enabled: !!provider)
  const { data: modelsData } = useAISupportedModels(selectedProvider as AIProvider);
  const models = useMemo(() => modelsData?.models || [], [modelsData?.models]);

  // Track changes using useMemo
  const hasChanges = useMemo(() => {
    if (!qualityConfig) return false;
    return (
      aiEnabled !== qualityConfig.aiEvaluationEnabled ||
      selectedProvider !== (qualityConfig.aiEvaluationProvider || '') ||
      selectedModel !== (qualityConfig.aiEvaluationModel || '')
    );
  }, [aiEnabled, selectedProvider, selectedModel, qualityConfig]);

  // Handle provider change - auto-select first model
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    // Model will be validated after models load
  };

  // Auto-select first model when provider changes and models load
  useEffect(() => {
    if (models.length > 0 && !models.includes(selectedModel)) {
      setSelectedModel(models[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

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
    },
    onError: (error: Error) => {
      toast.error(t('quality.saveFailed'), { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="island animate-fade-in-up p-6">
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      </div>
    );
  }

  const hasEnabledProviders = enabledProviders.length > 0;

  return (
    <div className="island animate-fade-in-up overflow-hidden">
      {/* Header */}
      <div className="border-border/40 border-b p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="from-primary/20 to-primary/10 flex size-10 items-center justify-center rounded-xl bg-linear-to-br">
              <Sparkles className="text-primary size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{t('quality.title')}</h3>
              <p className="text-muted-foreground mt-0.5 text-[13px]">{t('quality.description')}</p>
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
      <div className="space-y-5 p-5">
        {/* Enable Toggle */}
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border p-4 transition-all',
            aiEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border/50'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-9 items-center justify-center rounded-lg transition-colors',
                aiEnabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <Label htmlFor="aiQualityEnabled" className="cursor-pointer text-sm font-medium">
                {t('quality.enable')}
              </Label>
              <p className="text-muted-foreground text-xs">{t('quality.enableDescription')}</p>
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
          <div className="bg-warning/5 border-warning/20 text-warning rounded-xl border p-4 text-sm">
            {t('quality.noProvidersWarning')}
          </div>
        )}

        {/* Provider & Model Selection */}
        {aiEnabled && hasEnabledProviders && (
          <div className="animate-fade-in space-y-4">
            {/* Provider Select */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">{t('quality.provider')}</Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t('quality.selectProvider')} />
                </SelectTrigger>
                <SelectContent>
                  {enabledProviders.map((config) => {
                    const colorClasses = getProviderColor(config.provider);
                    return (
                      <SelectItem key={config.provider} value={config.provider}>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'flex size-6 items-center justify-center rounded-md',
                              colorClasses
                            )}
                          >
                            <ProviderLogoIcon provider={config.provider} className="size-3.5" />
                          </div>
                          <span>{getAIProviderDisplayName(config.provider)}</span>
                          {config.isActive && (
                            <CheckCircle2 className="text-success ml-auto size-3.5" />
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">{t('quality.providerDescription')}</p>
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
                <p className="text-muted-foreground text-xs">{t('quality.modelDescription')}</p>
              </div>
            )}

            {/* Current Selection Summary */}
            {selectedProvider && selectedModel && (
              <div className="bg-success/5 border-success/20 rounded-xl border p-4">
                <div className="text-success flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4" />
                  <span className="font-medium">{t('quality.configuredWith')}</span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {getAIProviderDisplayName(selectedProvider as AIProvider)} ·{' '}
                  {getModelDisplayName(selectedModel)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
