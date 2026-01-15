'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAIContextConfig, useUpdateAIContextConfig } from '@/hooks/use-ai-translation';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { tKey, useTranslation } from '@lingx/sdk-nextjs';
import { BookOpen, Brain, Check, Database, Link, Loader2, MessageSquare } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { contextConfigSchema, type ContextConfigFormData } from './schemas';

interface ContextConfigSectionProps {
  projectId: string;
}

const CONTEXT_SOURCES = [
  {
    name: 'includeGlossary' as const,
    limitName: 'glossaryLimit' as const,
    icon: BookOpen,
    labelKey: tKey('context.glossary.label', 'aiTranslation'),
    descriptionKey: tKey('context.glossary.description', 'aiTranslation'),
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    maxLimit: 50,
  },
  {
    name: 'includeTM' as const,
    limitName: 'tmLimit' as const,
    extraName: 'tmMinSimilarity' as const,
    icon: Database,
    labelKey: tKey('context.tm.label', 'aiTranslation'),
    descriptionKey: tKey('context.tm.description', 'aiTranslation'),
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    maxLimit: 20,
  },
  {
    name: 'includeRelatedKeys' as const,
    limitName: 'relatedKeysLimit' as const,
    icon: Link,
    labelKey: tKey('context.relatedKeys.label', 'aiTranslation'),
    descriptionKey: tKey('context.relatedKeys.description', 'aiTranslation'),
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    maxLimit: 20,
  },
] as const;

export function ContextConfigSection({ projectId }: ContextConfigSectionProps) {
  const { t, td } = useTranslation('aiTranslation');
  const { data: contextConfig, isLoading } = useAIContextConfig(projectId);
  const updateMutation = useUpdateAIContextConfig(projectId);

  const form = useForm<ContextConfigFormData>({
    resolver: zodResolver(contextConfigSchema),
    defaultValues: contextConfig || {
      includeGlossary: true,
      glossaryLimit: 10,
      includeTM: true,
      tmLimit: 5,
      tmMinSimilarity: 0.7,
      includeRelatedKeys: true,
      relatedKeysLimit: 5,
      includeDescription: true,
      customInstructions: null,
    },
  });

  useEffect(() => {
    if (contextConfig) {
      form.reset(contextConfig);
    }
  }, [contextConfig, form]);

  // Watch all source enable states at once for React Compiler compatibility
  const watchedSourceStates = useWatch({
    control: form.control,
    name: ['includeGlossary', 'includeTM', 'includeRelatedKeys'] as const,
  });

  const handleSave = async (data: ContextConfigFormData) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success(t('toasts.contextSaved'));
    } catch {
      toast.error(t('toasts.contextSaveFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="border-border/60 bg-card/50 flex items-center justify-center rounded-2xl border p-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="border-border/60 bg-card/50 animate-fade-in-up stagger-2 overflow-hidden rounded-2xl border">
      {/* Header */}
      <div className="border-border/40 border-b p-6">
        <div className="flex items-center gap-3">
          <div className="from-primary/15 to-primary/5 border-primary/10 flex size-10 items-center justify-center rounded-xl border bg-linear-to-br">
            <Brain className="text-primary size-4.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t('context.title')}</h3>
            <p className="text-muted-foreground mt-0.5 text-[13px]">{t('context.description')}</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <div className="space-y-6 p-6">
            {/* Context Sources Grid */}
            <div className="grid gap-4">
              {CONTEXT_SOURCES.map((source, sourceIndex) => (
                <div
                  key={source.name}
                  className="border-border/60 bg-background/30 overflow-hidden rounded-xl border"
                >
                  <FormField
                    control={form.control}
                    name={source.name}
                    render={({ field }) => (
                      <FormItem className="m-0 flex items-center justify-between space-y-0 p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex size-9 items-center justify-center rounded-lg',
                              source.bgColor
                            )}
                          >
                            <source.icon className={cn('size-4.5', source.color)} />
                          </div>
                          <div>
                            <FormLabel className="cursor-pointer text-sm font-medium">
                              {td(source.labelKey)}
                            </FormLabel>
                            <FormDescription className="mt-0.5 text-[11px]">
                              {td(source.descriptionKey)}
                            </FormDescription>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Expanded settings when enabled */}
                  {watchedSourceStates[sourceIndex] && (
                    <div className="ml-12 space-y-3 px-4 pt-0 pb-4">
                      <FormField
                        control={form.control}
                        name={source.limitName}
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-muted-foreground text-[11px] font-medium">
                                {t('context.maxItems')}
                              </FormLabel>
                              <span className="text-foreground bg-muted rounded px-2 py-0.5 text-[11px] font-semibold">
                                {field.value as number}
                              </span>
                            </div>
                            <FormControl>
                              <Slider
                                min={1}
                                max={source.maxLimit}
                                step={1}
                                value={[field.value as number]}
                                onValueChange={([v]) => field.onChange(v)}
                                className="w-full"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {'extraName' in source && source.extraName && (
                        <FormField
                          control={form.control}
                          name={source.extraName}
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-muted-foreground text-[11px] font-medium">
                                  {t('context.minSimilarity')}
                                </FormLabel>
                                <span className="text-foreground bg-muted rounded px-2 py-0.5 text-[11px] font-semibold">
                                  {Math.round((field.value as number) * 100)}%
                                </span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={0.5}
                                  max={1}
                                  step={0.05}
                                  value={[field.value as number]}
                                  onValueChange={([v]) => field.onChange(v)}
                                  className="w-full"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Custom Instructions */}
            <div className="border-border/60 bg-background/30 space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <MessageSquare className="size-4.5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">{t('context.customInstructions.title')}</h4>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {t('context.customInstructions.description')}
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="customInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={t('context.customInstructions.placeholder')}
                        className="bg-background/50 min-h-[80px] resize-none text-sm"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted/20 border-border/40 flex items-center justify-between border-t px-6 py-4">
            <p className="text-muted-foreground text-[11px]">{t('context.saveNote')}</p>
            <Button type="submit" size="sm" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('provider.actions.saving')}
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  {t('context.saveSettings')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
