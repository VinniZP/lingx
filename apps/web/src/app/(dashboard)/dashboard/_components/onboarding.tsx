'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Languages, Plus } from 'lucide-react';

export function Onboarding() {
  return (
    <div className="island p-8 lg:p-10 animate-fade-in-up stagger-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
            <Languages className="size-7 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Welcome to LocaleFlow
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Professional translation management with git-like version control for modern teams
          </p>
        </div>

        {/* Onboarding steps */}
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <OnboardingStep
            step={1}
            title="Create a project"
            description="Define your source and target languages"
          />
          <OnboardingStep
            step={2}
            title="Add translation keys"
            description="Import existing or create new keys"
          />
          <OnboardingStep
            step={3}
            title="Sync with your app"
            description="Use CLI or API to pull translations"
          />
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/projects/new">
              <Plus className="size-4" />
              Create your first project
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
