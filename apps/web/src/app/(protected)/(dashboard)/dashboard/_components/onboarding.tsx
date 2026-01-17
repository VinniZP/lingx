'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Languages, Plus } from 'lucide-react';
import Link from 'next/link';

export function Onboarding() {
  const { t } = useTranslation();
  return (
    <div className="island animate-fade-in-up stagger-6 p-8 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="from-primary to-primary/60 shadow-primary/20 mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br shadow-lg">
            <Languages className="size-7 text-white" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">{t('dashboard.welcome.title')}</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            {t('dashboard.welcome.description')}
          </p>
        </div>

        {/* Onboarding steps */}
        <div className="mb-8 grid gap-6 sm:grid-cols-3">
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
      <div className="bg-primary/10 mx-auto mb-3 flex size-10 items-center justify-center rounded-xl">
        <span className="text-primary text-sm font-semibold">{step}</span>
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{description}</p>
    </div>
  );
}
