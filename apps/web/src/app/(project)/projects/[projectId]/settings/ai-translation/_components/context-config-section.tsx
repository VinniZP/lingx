'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tKey, useTranslation } from '@lingx/sdk-nextjs';
import { toast } from 'sonner';
import { Check, Loader2, Brain, Database, BookOpen, Link, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useAIContextConfig, useUpdateAIContextConfig } from '@/hooks/use-ai-translation';
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
      <div className="rounded-2xl border border-border/60 bg-card/50 p-12 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden animate-fade-in-up stagger-2">
      {/* Header */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-linear-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center">
            <Brain className="size-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{t('context.title')}</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {t('context.description')}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <div className="p-6 space-y-6">
            {/* Context Sources Grid */}
            <div className="grid gap-4">
              {CONTEXT_SOURCES.map((source) => (
                <div key={source.name} className="rounded-xl border border-border/60 bg-background/30 overflow-hidden">
                  <FormField
                    control={form.control}
                    name={source.name}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 m-0 space-y-0">
                        <div className="flex items-center gap-3">
                          <div className={cn('size-9 rounded-lg flex items-center justify-center', source.bgColor)}>
                            <source.icon className={cn('size-4.5', source.color)} />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-medium cursor-pointer">{td(source.labelKey)}</FormLabel>
                            <FormDescription className="text-[11px] mt-0.5">
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
                  {form.watch(source.name) && (
                    <div className="px-4 pb-4 pt-0 ml-12 space-y-3">
                      <FormField
                        control={form.control}
                        name={source.limitName}
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-[11px] font-medium text-muted-foreground">
                                {t('context.maxItems')}
                              </FormLabel>
                              <span className="text-[11px] font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
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
                                <FormLabel className="text-[11px] font-medium text-muted-foreground">
                                  {t('context.minSimilarity')}
                                </FormLabel>
                                <span className="text-[11px] font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
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
            <div className="rounded-xl border border-border/60 bg-background/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <MessageSquare className="size-4.5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">{t('context.customInstructions.title')}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
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
                        className="min-h-[80px] bg-background/50 resize-none text-sm"
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
          <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {t('context.saveNote')}
            </p>
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
