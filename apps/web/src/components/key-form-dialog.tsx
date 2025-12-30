'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createKeySchema, updateKeySchema, type CreateKeyInput, type UpdateKeyInput } from '@localeflow/shared';
import {
  translationApi,
  TranslationKey,
  ApiError,
} from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Key,
  Loader2,
  Tag,
  FileText,
  Sparkles,
  MessageSquare,
  Settings,
  AlertCircle,
} from 'lucide-react';

interface KeyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  editKey?: TranslationKey;
}

// Quick suggestion templates for common key patterns
const nameSuggestions = [
  { icon: MessageSquare, label: 'common.', description: 'Shared strings' },
  { icon: FileText, label: 'page.', description: 'Page-specific' },
  { icon: AlertCircle, label: 'error.', description: 'Error messages' },
  { icon: Settings, label: 'settings.', description: 'Settings labels' },
];

export function KeyFormDialog({
  open,
  onOpenChange,
  branchId,
  editKey,
}: KeyFormDialogProps) {
  const queryClient = useQueryClient();
  const [selectedPrefix, setSelectedPrefix] = useState<string | null>(null);

  const form = useForm<CreateKeyInput>({
    resolver: zodResolver(createKeySchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Sync form values when dialog opens or editKey changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: editKey?.name || '',
        description: editKey?.description || '',
      });
      setSelectedPrefix(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (data: CreateKeyInput) =>
      translationApi.createKey(branchId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      toast.success('Key created', {
        description: `"${variables.name}" has been created.`,
      });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      if (!handleApiFieldErrors(error, form.setError)) {
        toast.error('Failed to create key', {
          description: error.message,
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateKeyInput) =>
      translationApi.updateKey(editKey!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      toast.success('Key updated', {
        description: 'Changes have been saved.',
      });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      if (!handleApiFieldErrors(error, form.setError)) {
        toast.error('Failed to update key', {
          description: error.message,
        });
      }
    },
  });

  const handleSubmit = (data: CreateKeyInput) => {
    if (editKey) {
      updateMutation.mutate({
        name: data.name !== editKey.name ? data.name : undefined,
        description: data.description || undefined,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        description: data.description,
      });
    }
  };

  const handlePrefixClick = (prefix: string) => {
    const currentName = form.getValues('name');
    // If clicking same prefix, toggle it off
    if (selectedPrefix === prefix) {
      // Remove the prefix if the name starts with it
      if (currentName.startsWith(prefix)) {
        form.setValue('name', currentName.slice(prefix.length), { shouldValidate: true });
      }
      setSelectedPrefix(null);
    } else {
      // Remove old prefix if any, then add new one
      let baseName = currentName;
      if (selectedPrefix && currentName.startsWith(selectedPrefix)) {
        baseName = currentName.slice(selectedPrefix.length);
      }
      form.setValue('name', prefix + baseName, { shouldValidate: true });
      setSelectedPrefix(prefix);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setSelectedPrefix(null);
    }
    onOpenChange(newOpen);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!editKey;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                <Key className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {isEditing ? 'Edit Translation Key' : 'New Translation Key'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {isEditing
                    ? 'Update the key identifier and context'
                    : 'Create a unique identifier for your translatable string'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-6 pb-6">
            <div className="space-y-5">
              {/* Quick prefix suggestions - only for new keys */}
              {!isEditing && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Namespace Prefix
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nameSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.label}
                        type="button"
                        onClick={() => handlePrefixClick(suggestion.label)}
                        className={cn(
                          'group inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all',
                          'border hover:shadow-sm',
                          selectedPrefix === suggestion.label
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <suggestion.icon className="size-3.5" />
                        <span className="font-mono font-medium">{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Key name input */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                        <Input
                          placeholder="e.g., common.welcome.title"
                          className="pl-10 font-mono text-[15px]"
                          autoFocus
                          autoComplete="off"
                          spellCheck={false}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Use dot notation for namespacing (e.g., <code className="text-xs bg-muted px-1 py-0.5 rounded">page.home.hero_title</code>)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description input */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Context for Translators
                      <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe where this text appears and any important context for accurate translation..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Help translators understand the context and tone
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Helpful tip */}
              {!isEditing && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-0.5">Pro tip</p>
                    <p>After creating the key, you can immediately add translations in the editor below.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="mt-6 gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="h-11 flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !form.formState.isValid}
                className="h-11 gap-2 flex-1 sm:flex-none"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {isEditing ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Key className="size-4" />
                    {isEditing ? 'Save Changes' : 'Create Key'}
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
