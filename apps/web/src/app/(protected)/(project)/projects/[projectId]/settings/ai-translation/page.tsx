'use client';

import { LoadingPulse } from '@/components/namespace-loader';
import { SettingsSectionHeader } from '@/components/settings';
import { useRequirePermission } from '@/hooks';
import { useAIConfigs } from '@/hooks/use-ai-translation';
import { useTranslation } from '@lingx/sdk-nextjs';
import { BarChart3, Brain, Gauge, Sparkles } from 'lucide-react';
import { use } from 'react';
import {
  ContextConfigSection,
  ProviderCard,
  QualityEvaluationSection,
  UsageSection,
} from './_components';

export default function AITranslationSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { t, ready } = useTranslation('aiTranslation');
  const { projectId } = use(params);

  // Permission check - MANAGER+ required
  const { isLoading: isLoadingPermissions, hasPermission } = useRequirePermission({
    projectId,
    permission: 'canManageSettings',
  });

  const { data: configsData, refetch } = useAIConfigs(projectId);
  const configs = configsData?.configs || [];

  const openAIConfig = configs.find((c) => c.provider === 'OPENAI');
  const anthropicConfig = configs.find((c) => c.provider === 'ANTHROPIC');
  const googleAIConfig = configs.find((c) => c.provider === 'GOOGLE_AI');
  const mistralConfig = configs.find((c) => c.provider === 'MISTRAL');

  // Show loading state while translations or permissions are loading
  if (!ready || isLoadingPermissions || !hasPermission) {
    return (
      <div className="flex min-h-100 items-center justify-center">
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
