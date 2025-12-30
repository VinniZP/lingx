'use client';

import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSpaceSchema, type CreateSpaceInput } from '@localeflow/shared';
import { spaceApi, ApiError } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { Layers, Loader2, Sparkles } from 'lucide-react';

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

/**
 * CreateSpaceDialog - Premium dialog for creating a new space
 *
 * Uses react-hook-form + zod validation matching project form patterns.
 * Features gradient header, auto-slug generation, and premium styling.
 */
export function CreateSpaceDialog({
  open,
  onOpenChange,
  projectId,
}: CreateSpaceDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<CreateSpaceInput>({
    resolver: zodResolver(createSpaceSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateSpaceInput) => spaceApi.create(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tree', projectId] });
      toast.success('Space created', {
        description: `"${variables.name}" space has been created with a main branch.`,
      });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      if (!handleApiFieldErrors(error, form.setError)) {
        toast.error('Failed to create space', {
          description: error.message,
        });
      }
    },
  });

  const handleNameChange = (value: string) => {
    form.setValue('name', value, { shouldValidate: true });
    // Auto-generate slug from name
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    form.setValue('slug', generatedSlug, { shouldValidate: true });
  };

  const onSubmit = (data: CreateSpaceInput) => {
    createMutation.mutate({
      name: data.name,
      slug: data.slug,
      description: data.description || undefined,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                <Layers className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  New Space
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Organize translations by feature or platform
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6">
            <div className="space-y-4">
              {/* Space Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Space Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Web App, Mobile, Marketing"
                        autoFocus
                        {...field}
                        onChange={(e) => handleNameChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="web-app"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL-safe identifier for your space
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What translations does this space contain?"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Info note */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="size-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-4 text-info" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">Auto-created branch</p>
                  <p>A &quot;main&quot; branch will be created automatically as your default branch.</p>
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !form.formState.isValid}
                className="h-11 gap-2 flex-1 sm:flex-none"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Layers className="size-4" />
                    Create Space
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
