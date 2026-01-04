'use client';

import {
  BatchStep,
  DockStep,
  EditorStep,
  FiltersStep,
  LanguagesStep,
  ShortcutsStep,
  SidebarStep,
} from './layouts';
import type { GuideStep } from './steps';

interface StepContentProps {
  step: GuideStep;
}

/**
 * Dispatches to the appropriate unique layout component based on step ID.
 * Each step has its own completely different layout and visual design.
 */
export function StepContent({ step }: StepContentProps) {
  switch (step.id) {
    case 'sidebar':
      return <SidebarStep step={step} />;
    case 'editor':
      return <EditorStep step={step} />;
    case 'languages':
      return <LanguagesStep step={step} />;
    case 'shortcuts':
      return <ShortcutsStep step={step} />;
    case 'dock':
      return <DockStep step={step} />;
    case 'batch':
      return <BatchStep step={step} />;
    case 'filters':
      return <FiltersStep step={step} />;
    default:
      return null;
  }
}
