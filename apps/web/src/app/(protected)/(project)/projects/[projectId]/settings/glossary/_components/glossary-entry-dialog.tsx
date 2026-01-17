'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import type { GlossaryEntry, GlossaryTag } from '@/lib/api';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectLanguage } from '@lingx/shared';
import { BookOpen, Check, Hash, Loader2, Pencil, Plus, Sparkles } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { entryFormSchema, PART_OF_SPEECH_OPTIONS, type EntryFormData } from './constants';

interface GlossaryEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEntry: GlossaryEntry | null;
  languages: ProjectLanguage[];
  tags: GlossaryTag[];
  isSubmitting: boolean;
  onSubmit: (data: EntryFormData) => Promise<void>;
}

export function GlossaryEntryDialog({
  open,
  onOpenChange,
  editingEntry,
  languages,
  tags,
  isSubmitting,
  onSubmit,
}: GlossaryEntryDialogProps) {
  const { t, td } = useTranslation('glossary');

  const form = useForm<EntryFormData>({
    resolver: zodResolver(entryFormSchema),
    mode: 'onTouched',
    defaultValues: {
      sourceTerm: '',
      sourceLanguage: languages.find((l) => l.isDefault)?.code || '',
      context: '',
      notes: '',
      partOfSpeech: '__none__',
      caseSensitive: false,
      domain: '',
      tagIds: [],
      translations: [],
    },
  });

  // Reset form when dialog opens/closes or editing entry changes
  useEffect(() => {
    if (open) {
      if (editingEntry) {
        form.reset({
          sourceTerm: editingEntry.sourceTerm,
          sourceLanguage: editingEntry.sourceLanguage,
          context: editingEntry.context || '',
          notes: editingEntry.notes || '',
          partOfSpeech: editingEntry.partOfSpeech || '__none__',
          caseSensitive: editingEntry.caseSensitive,
          domain: editingEntry.domain || '',
          tagIds: editingEntry.tags.map((t) => t.id),
          translations: editingEntry.translations.map((t) => ({
            targetLanguage: t.targetLanguage,
            targetTerm: t.targetTerm,
            notes: t.notes || '',
          })),
        });
      } else {
        form.reset({
          sourceTerm: '',
          sourceLanguage: languages.find((l) => l.isDefault)?.code || '',
          context: '',
          notes: '',
          partOfSpeech: '__none__',
          caseSensitive: false,
          domain: '',
          tagIds: [],
          translations: [],
        });
      }
    }
  }, [open, editingEntry, form, languages]);

  const handleSubmit = useCallback(
    async (data: EntryFormData) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[640px]">
        {/* Premium Header with Gradient */}
        <div className="border-border/40 from-primary/[0.04] relative border-b bg-linear-to-br via-transparent to-transparent px-7 pt-7 pb-5">
          <div className="from-primary/[0.06] absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl to-transparent" />

          <div className="relative flex items-start gap-4">
            <div
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm',
                editingEntry
                  ? 'border border-amber-500/20 bg-linear-to-br from-amber-500/20 via-amber-500/10 to-transparent'
                  : 'from-primary/20 via-primary/10 border-primary/20 border bg-linear-to-br to-transparent'
              )}
            >
              {editingEntry ? (
                <Pencil className="size-5 text-amber-500" />
              ) : (
                <BookOpen className="text-primary size-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {editingEntry ? t('dialog.editTerm') : t('dialog.addNewTerm')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1 text-sm">
                {editingEntry ? t('dialog.editDescription') : t('dialog.addDescription')}
              </DialogDescription>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 px-7 py-6">
            {/* Primary Fields Section */}
            <div className="space-y-4">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <div className="bg-primary size-1.5 rounded-full" />
                {t('dialog.termInformation')}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sourceTerm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        {t('dialog.sourceTerm')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('dialog.sourceTermPlaceholder')}
                          className="bg-muted/30 border-border/60 focus:bg-background h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sourceLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        {t('dialog.sourceLanguage')}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!!editingEntry}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-muted/30 border-border/60 h-11">
                            <SelectValue placeholder={t('dialog.selectLanguage')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                                  {lang.code}
                                </span>
                                {lang.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Classification Section */}
            <div className="space-y-4">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <div className="size-1.5 rounded-full bg-amber-500" />
                {t('dialog.classification')}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="partOfSpeech"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        {t('dialog.partOfSpeech')}
                      </FormLabel>
                      <Select value={field.value || '__none__'} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-muted/30 border-border/60 h-11">
                            <SelectValue placeholder={t('dialog.selectType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">
                              {t('dialog.noneSpecified')}
                            </span>
                          </SelectItem>
                          {PART_OF_SPEECH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {td(opt.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('dialog.domain')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="text-muted-foreground/50 absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                          <Input
                            placeholder={t('dialog.domainPlaceholder')}
                            className="bg-muted/30 border-border/60 focus:bg-background h-11 pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Context & Notes Section */}
            <div className="space-y-4">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <div className="size-1.5 rounded-full bg-blue-500" />
                {t('dialog.additionalDetails')}
              </div>

              <FormField
                control={form.control}
                name="context"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t('dialog.usageContext')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('dialog.contextPlaceholder')}
                        className="bg-muted/30 border-border/60 focus:bg-background min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t('dialog.translatorNotes')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('dialog.notesPlaceholder')}
                        className="bg-muted/30 border-border/60 focus:bg-background min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Settings Section */}
            <FormField
              control={form.control}
              name="caseSensitive"
              render={({ field }) => (
                <FormItem className="border-border/50 from-muted/40 via-muted/20 flex items-center justify-between rounded-xl border bg-linear-to-r to-transparent p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted/60 flex size-9 items-center justify-center rounded-lg">
                      <span className="text-muted-foreground text-sm font-semibold">Aa</span>
                    </div>
                    <div className="space-y-0.5">
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        {t('dialog.caseSensitive')}
                      </FormLabel>
                      <FormDescription className="text-xs">
                        {t('dialog.caseSensitiveDescription')}
                      </FormDescription>
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Tags Section */}
            {tags.length > 0 && (
              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-3 flex items-center justify-between">
                      <FormLabel className="text-sm font-medium">{t('dialog.tags')}</FormLabel>
                      <span className="text-muted-foreground text-xs">
                        {t('dialog.tagsSelected', { count: field.value.length })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isSelected = field.value.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                field.onChange(field.value.filter((id) => id !== tag.id));
                              } else {
                                field.onChange([...field.value, tag.id]);
                              }
                            }}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200',
                              isSelected
                                ? 'bg-primary/15 text-primary border-primary/30 border-2 shadow-sm'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground border-2 border-transparent'
                            )}
                          >
                            {tag.color && (
                              <div
                                className="size-3 rounded-full shadow-sm"
                                style={{
                                  backgroundColor: tag.color,
                                  boxShadow: isSelected
                                    ? `0 0 0 2px var(--background), 0 0 0 3px ${tag.color}50`
                                    : undefined,
                                }}
                              />
                            )}
                            {tag.name}
                            {isSelected && <Check className="ml-0.5 size-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>

        {/* Premium Footer */}
        <div className="border-border/40 bg-muted/20 flex items-center justify-between border-t px-7 py-5">
          <div className="text-muted-foreground text-xs">
            {editingEntry ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                {t('dialog.changesApplyToAll')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-3.5" />
                {t('dialog.termAvailableForMatching')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-4"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting}
              className="h-10 gap-2 px-5"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editingEntry ? (
                <Check className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {editingEntry ? t('dialog.saveChanges') : t('dialog.addTerm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
