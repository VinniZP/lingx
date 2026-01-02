'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Key, Sparkles, Terminal, Globe, Code } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createApiKeySchema, type CreateApiKeyInput } from '@lingx/shared';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { useTranslation } from '@lingx/sdk-nextjs';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  isLoading: boolean;
  /** Optional: API error to display as field error */
  error?: ApiError | null;
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  error,
}: ApiKeyDialogProps) {
  const { t } = useTranslation();

  // Suggested key name templates - defined inside component to use translations
  const suggestions = [
    { icon: Terminal, label: t('apiKeys.suggestions.cli'), value: 'CLI' },
    { icon: Code, label: t('apiKeys.suggestions.development'), value: 'Development SDK' },
    { icon: Globe, label: t('apiKeys.suggestions.production'), value: 'Production' },
  ];

  const form = useForm<CreateApiKeyInput>({
    resolver: zodResolver(createApiKeySchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
    },
  });

  // Handle API errors passed from parent
  if (error) {
    handleApiFieldErrors(error, form.setError);
  }

  const handleSubmit = async (data: CreateApiKeyInput) => {
    await onSubmit(data.name.trim());
    form.reset();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const handleSuggestionClick = (value: string) => {
    form.setValue('name', value, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-linear-to-br from-warm/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-warm/20 flex items-center justify-center border border-warm/20">
                <Key className="size-5 text-warm" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {t('apiKeys.title')}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {t('apiKeys.description')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-6 pb-6">
            <div className="space-y-4">
              {/* Quick suggestions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('apiKeys.quickStart')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.value}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion.value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
                        'border border-transparent hover:border-border'
                      )}
                    >
                      <suggestion.icon className="size-3.5" />
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name input */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('apiKeys.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('apiKeys.namePlaceholder')}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('apiKeys.nameHint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Security note */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="size-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-4 text-info" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">{t('apiKeys.oneTimeDisplay')}</p>
                  <p>{t('apiKeys.oneTimeDisplayHint')}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="mt-6 gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="h-11 flex-1 sm:flex-none"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !form.formState.isValid}
                className="h-11 gap-2 flex-1 sm:flex-none"
              >
                {isLoading ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('apiKeys.generating')}
                  </>
                ) : (
                  <>
                    <Key className="size-4" />
                    {t('apiKeys.generate')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
