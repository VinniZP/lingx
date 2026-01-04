'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { BookOpen, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { StepContent } from './StepContent';
import { GUIDE_STEPS } from './steps';

interface WorkbenchGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function WorkbenchGuideDialog({
  open,
  onOpenChange,
  onComplete,
}: WorkbenchGuideDialogProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  // Wrap onOpenChange to reset step when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setCurrentStep(0);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;
  const currentStepData = GUIDE_STEPS[currentStep];

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
      onOpenChange(false);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete, onOpenChange]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(() => {
    onComplete();
    onOpenChange(false);
  }, [onComplete, onOpenChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleNext, handlePrevious, handleSkip]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[720px]" showCloseButton={false}>
        {/* Header */}
        <DialogHeader className="border-border/40 flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-xl border bg-linear-to-br',
                currentStepData.gradient.from,
                currentStepData.gradient.via,
                currentStepData.gradient.to,
                'border-foreground/10'
              )}
            >
              <BookOpen className={cn('size-5', currentStepData.accentColor)} />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {t('workbench.guide.title')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {t('workbench.guide.description')}
              </DialogDescription>
            </div>
          </div>
          {/* Step indicators */}
          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label={t('workbench.guide.stepIndicators')}
          >
            {GUIDE_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <button
                  key={step.id}
                  role="tab"
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    'flex items-center justify-center rounded-lg p-1.5 transition-all',
                    isActive
                      ? cn('bg-foreground/10', currentStepData.accentColor)
                      : 'hover:bg-foreground/5'
                  )}
                  aria-label={`Step ${index + 1}: ${step.id}`}
                  aria-selected={isActive}
                  aria-current={isActive ? 'step' : undefined}
                  tabIndex={isActive ? 0 : -1}
                >
                  <StepIcon
                    className={cn(
                      'size-4',
                      isActive
                        ? currentStepData.accentColor
                        : isCompleted
                          ? 'text-foreground/50'
                          : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Step content - only render active step */}
        <div className="px-6 py-5">
          <StepContent key={currentStepData.id} step={currentStepData} />
        </div>

        {/* Footer with refined styling */}
        <DialogFooter className="border-border/40 bg-muted/20 border-t pt-4">
          {currentStep < GUIDE_STEPS.length - 2 && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground mr-auto"
            >
              {t('workbench.guide.skip')}
            </Button>
          )}
          {!isFirstStep && (
            <Button type="button" variant="outline" onClick={handlePrevious} className="h-11 gap-2">
              <ChevronLeft className="size-4" />
              {t('workbench.guide.previous')}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleNext}
            className={cn(
              'h-11 gap-2',
              isLastStep && 'from-primary via-primary to-primary/90 bg-linear-to-r'
            )}
          >
            {isLastStep ? (
              <>
                <Sparkles className="size-4" />
                {t('workbench.guide.finish')}
              </>
            ) : (
              <>
                {t('workbench.guide.next')}
                <ChevronRight className="size-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
