'use client';

import { use } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Sparkles, Zap, Brain, BarChart3, Gauge } from 'lucide-react';
import { useAIConfigs } from '@/hooks/use-ai-translation';
import { ProviderCard, ContextConfigSection, UsageSection, QualityEvaluationSection } from './_components';
import {LoadingPulse} from "@/components/namespace-loader";

export default function AITranslationSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { t, ready } = useTranslation('aiTranslation');
  const { projectId } = use(params);
  const { data: configsData, refetch } = useAIConfigs(projectId);
  const configs = configsData?.configs || [];

  const openAIConfig = configs.find((c) => c.provider === 'OPENAI');
  const anthropicConfig = configs.find((c) => c.provider === 'ANTHROPIC');
  const googleAIConfig = configs.find((c) => c.provider === 'GOOGLE_AI');
  const mistralConfig = configs.find((c) => c.provider === 'MISTRAL');

  // Show loading state while translations are loading
  if (!ready) {
    return (
        <div className="flex items-center justify-center min-h-100">
          <LoadingPulse />
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <div className="size-12 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t('pageTitle')}</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {t('pageDescription')}
          </p>
        </div>
      </div>

      {/* Providers Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('sections.providers')}
          </h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ProviderCard
            projectId={projectId}
            provider="OPENAI"
            config={openAIConfig}
            onSave={refetch}
          />
          <ProviderCard
            projectId={projectId}
            provider="ANTHROPIC"
            config={anthropicConfig}
            onSave={refetch}
          />
          <ProviderCard
            projectId={projectId}
            provider="GOOGLE_AI"
            config={googleAIConfig}
            onSave={refetch}
          />
          <ProviderCard
            projectId={projectId}
            provider="MISTRAL"
            config={mistralConfig}
            onSave={refetch}
          />
        </div>
      </section>

      {/* Context Configuration */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('sections.contextSettings')}
          </h3>
        </div>
        <ContextConfigSection projectId={projectId} />
      </section>

      {/* Quality Evaluation */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('sections.qualityEvaluation')}
          </h3>
        </div>
        <QualityEvaluationSection projectId={projectId} />
      </section>

      {/* Usage Statistics */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('sections.usage')}
          </h3>
        </div>
        <UsageSection projectId={projectId} />
      </section>
    </div>
  );
}
