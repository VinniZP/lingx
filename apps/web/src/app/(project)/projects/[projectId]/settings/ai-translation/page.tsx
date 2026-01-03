'use client';

import { use } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Sparkles, Zap, Brain, BarChart3, Gauge } from 'lucide-react';
import { useAIConfigs } from '@/hooks/use-ai-translation';
import { ProviderCard, ContextConfigSection, UsageSection, QualityEvaluationSection } from './_components';
import { LoadingPulse } from '@/components/namespace-loader';
import { SettingsSectionHeader } from '@/components/settings';

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
      {/* Providers Section */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={Sparkles}
          title={t('sections.providers')}
          description={t('pageDescription')}
        />
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
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={Brain}
          title={t('sections.contextSettings')}
          description="Fine-tune how AI understands your content"
          color="blue"
        />
        <ContextConfigSection projectId={projectId} />
      </section>

      {/* Quality Evaluation */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={Gauge}
          title={t('sections.qualityEvaluation')}
          description="AI-powered translation quality scoring"
          color="amber"
        />
        <QualityEvaluationSection projectId={projectId} />
      </section>

      {/* Usage Statistics */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={BarChart3}
          title={t('sections.usage')}
          description="Monitor your AI translation usage and costs"
          color="emerald"
        />
        <UsageSection projectId={projectId} />
      </section>
    </div>
  );
}
