'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Zap, Brain, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { queueBatchQuality } from '@/lib/api/quality';
import { toast } from 'sonner';
import { useTranslation } from '@lingx/sdk-nextjs';
import { cn } from '@/lib/utils';

interface BulkQualityEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  translationIds?: string[];
}

/**
 * Premium Bulk Quality Evaluation Dialog
 *
 * A refined dialog for triggering quality scoring with:
 * - Animated gradient orb as visual anchor
 * - Tiered evaluation options (heuristic vs AI)
 * - Elegant cards with hover states
 * - Smooth entrance animations
 */
export function BulkQualityEvaluationDialog({
  open,
  onOpenChange,
  branchId,
  translationIds,
}: BulkQualityEvaluationDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [forceAI, setForceAI] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(timer);
    } else {
      setMounted(false);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => queueBatchQuality(branchId, translationIds, forceAI),
    onSuccess: (result) => {
      toast.success(t('quality.bulkEvaluation.queued'), {
        description: t('quality.bulkEvaluation.jobId', { jobId: result.jobId }),
      });
      queryClient.invalidateQueries({ queryKey: ['quality-summary', branchId] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(t('quality.bulkEvaluation.failed'), {
        description: error.message,
      });
    },
  });

  const handleEvaluate = () => {
    mutation.mutate();
  };

  const count = translationIds?.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden" showCloseButton={false}>
        {/* Animated Header with Gradient Orb */}
        <div className="relative px-8 pt-10 pb-8 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[#E8916F]/5" />

          {/* Floating orb - the hero element */}
          <div
            className={cn(
              "absolute -top-20 -right-20 size-64 rounded-full opacity-0 transition-all duration-700 ease-out",
              "bg-gradient-to-br from-primary/20 via-primary/10 to-[#E8916F]/20",
              "blur-3xl",
              mounted && "opacity-100 translate-y-0",
              !mounted && "translate-y-4"
            )}
          />

          {/* Secondary orb */}
          <div
            className={cn(
              "absolute -bottom-10 -left-10 size-40 rounded-full opacity-0 transition-all duration-700 delay-100 ease-out",
              "bg-gradient-to-tr from-[#E8916F]/15 to-primary/10",
              "blur-2xl",
              mounted && "opacity-100",
            )}
          />

          {/* Content */}
          <div className="relative">
            {/* Icon badge */}
            <div
              className={cn(
                "inline-flex items-center justify-center size-14 rounded-2xl mb-6",
                "bg-gradient-to-br from-primary to-primary/80",
                "shadow-lg shadow-primary/25",
                "opacity-0 transition-all duration-500 ease-out",
                mounted && "opacity-100 translate-y-0",
                !mounted && "translate-y-2"
              )}
            >
              <Sparkles className="size-7 text-white" />
            </div>

            {/* Title */}
            <h2
              className={cn(
                "text-2xl font-semibold tracking-tight text-foreground mb-2",
                "opacity-0 transition-all duration-500 delay-75 ease-out",
                mounted && "opacity-100 translate-y-0",
                !mounted && "translate-y-2"
              )}
            >
              {t('quality.bulkEvaluation.title')}
            </h2>

            {/* Description */}
            <p
              className={cn(
                "text-muted-foreground leading-relaxed",
                "opacity-0 transition-all duration-500 delay-100 ease-out",
                mounted && "opacity-100 translate-y-0",
                !mounted && "translate-y-2"
              )}
            >
              {count && count > 0
                ? t('quality.bulkEvaluation.descriptionSelected', { count })
                : t('quality.bulkEvaluation.descriptionAll')}
            </p>
          </div>
        </div>

        {/* Evaluation Tiers */}
        <div className="px-8 pb-6 space-y-4">
          {/* Tier Cards */}
          <div
            className={cn(
              "grid gap-3",
              "opacity-0 transition-all duration-500 delay-150 ease-out",
              mounted && "opacity-100 translate-y-0",
              !mounted && "translate-y-3"
            )}
          >
            {/* Heuristic Tier - Always included */}
            <div className="group relative rounded-xl border border-border/60 bg-card/50 p-4 transition-all hover:border-primary/30 hover:bg-card">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Zap className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">Heuristic Analysis</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Free
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('quality.bulkEvaluation.infoHeuristic')}
                  </p>
                </div>
                <div className="text-emerald-500">
                  <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* AI Tier - Optional */}
            <div
              className={cn(
                "group relative rounded-xl border p-4 transition-all cursor-pointer",
                forceAI
                  ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-card"
              )}
              onClick={() => setForceAI(!forceAI)}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex items-center justify-center size-10 rounded-xl shrink-0 transition-colors",
                  forceAI
                    ? "bg-primary/20 text-primary"
                    : "bg-primary/10 text-primary/70"
                )}>
                  <Brain className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">AI Evaluation</span>
                    <span className={cn(
                      "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors",
                      forceAI
                        ? "bg-primary/20 text-primary"
                        : "bg-primary/10 text-primary/60"
                    )}>
                      Enhanced
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('quality.bulkEvaluation.infoAI')}
                  </p>
                </div>
                <Switch
                  checked={forceAI}
                  onCheckedChange={setForceAI}
                  className="shrink-0"
                />
              </div>

              {/* Subtle highlight line when active */}
              <div
                className={cn(
                  "absolute left-0 top-4 bottom-4 w-0.5 rounded-full transition-all duration-300",
                  forceAI ? "bg-primary opacity-100" : "bg-transparent opacity-0"
                )}
              />
            </div>
          </div>

          {/* Processing note */}
          <div
            className={cn(
              "flex items-center gap-2.5 text-xs text-muted-foreground/80 px-1",
              "opacity-0 transition-all duration-500 delay-200 ease-out",
              mounted && "opacity-100",
            )}
          >
            <Clock className="size-3.5" />
            <span>{t('quality.bulkEvaluation.infoProcessing')}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-end gap-3 px-8 py-5 border-t border-border/50 bg-muted/30",
            "opacity-0 transition-all duration-500 delay-200 ease-out",
            mounted && "opacity-100",
          )}
        >
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="px-5"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleEvaluate}
            disabled={mutation.isPending}
            className={cn(
              "gap-2.5 px-6 min-w-[160px]",
              "bg-gradient-to-r from-primary to-primary/90",
              "hover:from-primary/90 hover:to-primary/80",
              "shadow-md shadow-primary/20",
              "transition-all duration-200"
            )}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t('quality.bulkEvaluation.queuing')}</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>{t('quality.bulkEvaluation.evaluate')}</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
