'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  getAIProviderDisplayName,
  getModelDisplayName,
  useAISupportedModels,
  useDeleteAIConfig,
  useSaveAIConfig,
  useTestAIConnection,
} from '@/hooks/use-ai-translation';
import type { AIConfig, AIProvider } from '@/lib/api';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Check, Cpu, Key, Loader2, Send, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ProviderLogoIcon, getProviderColor } from './provider-logos';
import { providerConfigSchema, type ProviderConfigFormData } from './schemas';

interface ProviderCardProps {
  projectId: string;
  provider: AIProvider;
  config?: AIConfig;
  onSave: () => void;
}

export function ProviderCard({ projectId, provider, config, onSave }: ProviderCardProps) {
  const { t } = useTranslation('aiTranslation');
  const [isEditing, setIsEditing] = useState(!config);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const saveMutation = useSaveAIConfig(projectId);
  const deleteMutation = useDeleteAIConfig(projectId);
  const testMutation = useTestAIConnection(projectId);
  const { data: modelsData } = useAISupportedModels(provider);

  const models = modelsData?.models || [];
  const isExisting = !!config;

  const form = useForm<ProviderConfigFormData>({
    resolver: zodResolver(providerConfigSchema),
    mode: 'onTouched',
    defaultValues: {
      apiKey: '',
      model: config?.model || models[0] || '',
      isActive: config?.isActive ?? true,
    },
  });

  const handleSave = async (data: ProviderConfigFormData) => {
    if (!isExisting && (!data.apiKey || !data.apiKey.trim())) {
      form.setError('apiKey', { message: 'API key is required' });
      return;
    }

    try {
      const payload: { provider: AIProvider; model: string; isActive: boolean; apiKey?: string } = {
        provider,
        model: data.model,
        isActive: data.isActive,
      };

      if (data.apiKey && data.apiKey.trim()) {
        payload.apiKey = data.apiKey;
      }

      await saveMutation.mutateAsync(payload);
      toast.success(t('toasts.configSaved'), {
        description: t('toasts.configSavedDescription', {
          provider: getAIProviderDisplayName(provider),
        }),
      });
      setIsEditing(false);
      form.reset({ apiKey: '', model: data.model, isActive: data.isActive });
      onSave();
    } catch {
      toast.error(t('toasts.configSaveFailed'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(provider);
      toast.success(t('toasts.configRemoved'), {
        description: t('toasts.configRemovedDescription', {
          provider: getAIProviderDisplayName(provider),
        }),
      });
      setShowDeleteDialog(false);
      form.reset({ apiKey: '', model: models[0] || '', isActive: true });
      setIsEditing(true);
      onSave();
    } catch {
      toast.error(t('toasts.configRemoveFailed'));
    }
  };

  const handleTest = async () => {
    try {
      const result = await testMutation.mutateAsync(provider);
      if (result.success) {
        toast.success(t('toasts.connectionSuccess'), {
          description: t('toasts.connectionSuccessDescription', {
            provider: getAIProviderDisplayName(provider),
          }),
        });
      } else {
        toast.error(t('toasts.connectionFailed'), {
          description: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error(t('toasts.connectionTestFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const getProviderDescription = () => {
    switch (provider) {
      case 'OPENAI':
        return t('provider.openai.description');
      case 'ANTHROPIC':
        return t('provider.anthropic.description');
      case 'GOOGLE_AI':
        return t('provider.googleAI.description');
      case 'MISTRAL':
        return t('provider.mistral.description');
      default:
        return t('provider.openai.description');
    }
  };

  const getApiKeyHint = () => {
    switch (provider) {
      case 'OPENAI':
        return t('provider.form.apiKeyHint.openai');
      case 'ANTHROPIC':
        return t('provider.form.apiKeyHint.anthropic');
      case 'GOOGLE_AI':
        return t('provider.form.apiKeyHint.googleAI');
      case 'MISTRAL':
        return t('provider.form.apiKeyHint.mistral');
      default:
        return '';
    }
  };

  const providerName = getAIProviderDisplayName(provider);
  const colorClasses = getProviderColor(provider);

  return (
    <div className="border-border/60 bg-card/50 animate-fade-in-up overflow-hidden rounded-2xl border">
      {/* Header */}
      <div className="border-border/40 border-b p-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-xl border bg-linear-to-br',
              colorClasses
            )}
          >
            <ProviderLogoIcon provider={provider} className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold">{providerName}</h3>
              {config && !isEditing && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                    config.isActive
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {config.isActive ? t('provider.status.active') : t('provider.status.inactive')}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[13px]">
              {getProviderDescription()}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-baseline justify-between">
                      <FormLabel className="text-sm font-medium">
                        {t('provider.form.apiKey')}
                      </FormLabel>
                      {isExisting && (
                        <span className="text-muted-foreground text-[10px]">
                          {t('provider.form.apiKeyKeepCurrent')}
                        </span>
                      )}
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Key className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          type="password"
                          placeholder={
                            isExisting
                              ? t('provider.form.apiKeyUpdatePlaceholder')
                              : t('provider.form.apiKeyPlaceholder', { provider: providerName })
                          }
                          className="bg-background/50 pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-[11px]">{getApiKeyHint()}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t('provider.form.model')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder={t('provider.form.modelPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {getModelDisplayName(model)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[11px]">
                      {t('provider.form.modelDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="border-border/60 bg-background/30 flex items-center justify-between rounded-xl border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {t('provider.form.enableProvider')}
                      </FormLabel>
                      <FormDescription className="text-[11px]">
                        {t('provider.form.enableProviderDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                {config && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.reset();
                      setIsEditing(false);
                    }}
                  >
                    {t('provider.actions.cancel')}
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t('provider.actions.saving')}
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      {t('provider.actions.save')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            {/* Config Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 border-border/40 rounded-xl border p-3">
                <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Cpu className="size-3.5" />
                  <span className="text-[11px] font-medium">{t('provider.form.model')}</span>
                </div>
                <p className="truncate text-sm font-medium">
                  {getModelDisplayName(config?.model || '')}
                </p>
              </div>
              <div className="bg-background/50 border-border/40 rounded-xl border p-3">
                <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Key className="size-3.5" />
                  <span className="text-[11px] font-medium">{t('provider.form.apiKey')}</span>
                </div>
                <p className="font-mono text-sm font-medium">{config?.keyPrefix}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    {t('provider.actions.remove')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('provider.removeDialog.title', { provider: providerName })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('provider.removeDialog.description', { provider: providerName })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('provider.actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        t('provider.actions.remove')
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {t('provider.actions.test')}
              </Button>

              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Settings2 className="size-4" />
                {t('provider.actions.edit')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
