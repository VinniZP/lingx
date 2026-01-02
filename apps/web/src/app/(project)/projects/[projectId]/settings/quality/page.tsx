'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Save } from 'lucide-react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getQualityConfig, updateQualityConfig, type QualityConfig } from '@/lib/api/quality';
import { toast } from 'sonner';

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
  const [aiEvaluationEnabled, setAiEvaluationEnabled] = useState(
    config?.aiEvaluationEnabled ?? true
  );
  const [aiEvaluationProvider, setAiEvaluationProvider] = useState(
    config?.aiEvaluationProvider || ''
  );
  const [aiEvaluationModel, setAiEvaluationModel] = useState(config?.aiEvaluationModel || '');

  // Update state when config loads
  useState(() => {
    if (config) {
      setScoreAfterAITranslation(config.scoreAfterAITranslation);
      setScoreBeforeMerge(config.scoreBeforeMerge);
      setAutoApproveThreshold(config.autoApproveThreshold);
      setFlagThreshold(config.flagThreshold);
      setAiEvaluationEnabled(config.aiEvaluationEnabled);
      setAiEvaluationProvider(config.aiEvaluationProvider || '');
      setAiEvaluationModel(config.aiEvaluationModel || '');
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      updateQualityConfig(projectId, {
        scoreAfterAITranslation,
        scoreBeforeMerge,
        autoApproveThreshold,
        flagThreshold,
        aiEvaluationEnabled,
        aiEvaluationProvider: aiEvaluationProvider || null,
        aiEvaluationModel: aiEvaluationModel || null,
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.quality.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('settings.quality.description')}</p>
      </div>

      <Separator />

      {/* Scoring Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.quality.triggers.title')}</CardTitle>
          <CardDescription>{t('settings.quality.triggers.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="scoreAfterAI">{t('settings.quality.triggers.afterAI')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.quality.triggers.afterAIDescription')}
              </p>
            </div>
            <Switch
              id="scoreAfterAI"
              checked={scoreAfterAITranslation}
              onCheckedChange={setScoreAfterAITranslation}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="scoreBeforeMerge">{t('settings.quality.triggers.beforeMerge')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.quality.triggers.beforeMergeDescription')}
              </p>
            </div>
            <Switch
              id="scoreBeforeMerge"
              checked={scoreBeforeMerge}
              onCheckedChange={setScoreBeforeMerge}
            />
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.quality.thresholds.title')}</CardTitle>
          <CardDescription>{t('settings.quality.thresholds.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="autoApprove">{t('settings.quality.thresholds.autoApprove')}</Label>
            <Input
              id="autoApprove"
              type="number"
              min="0"
              max="100"
              value={autoApproveThreshold}
              onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              {t('settings.quality.thresholds.autoApproveDescription')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flagThreshold">{t('settings.quality.thresholds.flag')}</Label>
            <Input
              id="flagThreshold"
              type="number"
              min="0"
              max="100"
              value={flagThreshold}
              onChange={(e) => setFlagThreshold(Number(e.target.value))}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              {t('settings.quality.thresholds.flagDescription')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-purple-600" />
            {t('settings.quality.ai.title')}
          </CardTitle>
          <CardDescription>{t('settings.quality.ai.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="aiEnabled">{t('settings.quality.ai.enabled')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.quality.ai.enabledDescription')}
              </p>
            </div>
            <Switch
              id="aiEnabled"
              checked={aiEvaluationEnabled}
              onCheckedChange={setAiEvaluationEnabled}
            />
          </div>

          {aiEvaluationEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="aiProvider">{t('settings.quality.ai.provider')}</Label>
                <Select value={aiEvaluationProvider || '__default__'} onValueChange={(v) => setAiEvaluationProvider(v === '__default__' ? '' : v)}>
                  <SelectTrigger id="aiProvider">
                    <SelectValue placeholder={t('settings.quality.ai.providerPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">{t('settings.quality.ai.useProjectDefault')}</SelectItem>
                    <SelectItem value="ANTHROPIC">Anthropic (Claude)</SelectItem>
                    <SelectItem value="OPENAI">OpenAI (GPT)</SelectItem>
                    <SelectItem value="GOOGLE_AI">Google AI (Gemini)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t('settings.quality.ai.providerDescription')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiModel">{t('settings.quality.ai.model')}</Label>
                <Input
                  id="aiModel"
                  value={aiEvaluationModel}
                  onChange={(e) => setAiEvaluationModel(e.target.value)}
                  placeholder={t('settings.quality.ai.modelPlaceholder')}
                />
                <p className="text-sm text-muted-foreground">
                  {t('settings.quality.ai.modelDescription')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <Save className="size-4" />
              {t('common.save')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
