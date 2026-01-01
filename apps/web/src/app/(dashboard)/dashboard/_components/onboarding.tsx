'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Languages, Plus } from 'lucide-react';
import { useTranslation } from '@localeflow/sdk-nextjs';

export function Onboarding() {
  const { t } = useTranslation();
  return (
    <div className="island p-8 lg:p-10 animate-fade-in-up stagger-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
            <Languages className="size-7 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {t('dashboard.welcome.title')}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('dashboard.welcome.description')}
          </p>
        </div>

        {/* Onboarding steps */}
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <OnboardingStep
            step={1}
            title={t('dashboard.onboarding.step1.title')}
            description={t('dashboard.onboarding.step1.description')}
          />
          <OnboardingStep
            step={2}
            title={t('dashboard.onboarding.step2.title')}
            description={t('dashboard.onboarding.step2.description')}
          />
          <OnboardingStep
            step={3}
            title={t('dashboard.onboarding.step3.title')}
            description={t('dashboard.onboarding.step3.description')}
          />
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/projects/new">
              <Plus className="size-4" />
              {t('dashboard.onboarding.cta')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OnboardingStepProps {
  step: number;
  title: string;
  description: string;
}

function OnboardingStep({ step, title, description }: OnboardingStepProps) {
  return (
    <div className="text-center">
      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <span className="text-sm font-semibold text-primary">{step}</span>
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {description}
      </p>
    </div>
  );
}
