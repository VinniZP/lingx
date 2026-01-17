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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { TAG_COLORS, tagFormSchema, type TagFormData } from './constants';

interface GlossaryTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (data: TagFormData) => Promise<void>;
}

export function GlossaryTagDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: GlossaryTagDialogProps) {
  const { t } = useTranslation('glossary');

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    mode: 'onTouched',
    defaultValues: { name: '', color: TAG_COLORS[0] },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ name: '', color: TAG_COLORS[0] });
    }
  }, [open, form]);

  const handleSubmit = useCallback(
    async (data: TagFormData) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('tagDialog.title')}</DialogTitle>
          <DialogDescription>{t('tagDialog.description')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('tagDialog.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.color')}</FormLabel>
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={cn(
                          'size-9 rounded-xl transition-all duration-200',
                          field.value === color ? 'scale-110' : 'hover:scale-110'
                        )}
                        style={{
                          backgroundColor: color,
                          boxShadow:
                            field.value === color
                              ? `0 0 0 2px var(--background), 0 0 0 4px ${color}`
                              : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {t('tagDialog.createTag')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
