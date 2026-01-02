'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Pencil,
  Plus,
  Loader2,
  Hash,
  Check,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GlossaryEntry, GlossaryTag } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { entryFormSchema, PART_OF_SPEECH_OPTIONS, type EntryFormData } from './constants';
import { useCallback, useEffect } from 'react';

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
      sourceLanguage: languages.find(l => l.isDefault)?.code || '',
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
          tagIds: editingEntry.tags.map(t => t.id),
          translations: editingEntry.translations.map(t => ({
            targetLanguage: t.targetLanguage,
            targetTerm: t.targetTerm,
            notes: t.notes || '',
          })),
        });
      } else {
        form.reset({
          sourceTerm: '',
          sourceLanguage: languages.find(l => l.isDefault)?.code || '',
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

  const handleSubmit = useCallback(async (data: EntryFormData) => {
    await onSubmit(data);
  }, [onSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Premium Header with Gradient */}
        <div className="relative px-7 pt-7 pb-5 border-b border-border/40 bg-linear-to-br from-primary/[0.04] via-transparent to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/[0.06] to-transparent rounded-bl-full" />

          <div className="relative flex items-start gap-4">
            <div className={cn(
              "size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
              editingEntry
                ? "bg-linear-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/20"
                : "bg-linear-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20"
            )}>
              {editingEntry ? (
                <Pencil className="size-5 text-amber-500" />
              ) : (
                <BookOpen className="size-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {editingEntry ? t('dialog.editTerm') : t('dialog.addNewTerm')}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {editingEntry
                  ? t('dialog.editDescription')
                  : t('dialog.addDescription')}
              </DialogDescription>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-7 py-6 space-y-6">
            {/* Primary Fields Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="size-1.5 rounded-full bg-primary" />
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
                          className="h-11 bg-muted/30 border-border/60 focus:bg-background"
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
                          <SelectTrigger className="h-11 bg-muted/30 border-border/60">
                            <SelectValue placeholder={t('dialog.selectLanguage')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
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
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                          <SelectTrigger className="h-11 bg-muted/30 border-border/60">
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
                      <FormLabel className="text-sm font-medium">
                        {t('dialog.domain')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                          <Input
                            placeholder={t('dialog.domainPlaceholder')}
                            className="h-11 pl-10 bg-muted/30 border-border/60 focus:bg-background"
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
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                        className="resize-none min-h-[80px] bg-muted/30 border-border/60 focus:bg-background"
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
                        className="resize-none min-h-[80px] bg-muted/30 border-border/60 focus:bg-background"
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
                <FormItem className="flex items-center justify-between rounded-xl border border-border/50 bg-linear-to-r from-muted/40 via-muted/20 to-transparent p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-muted/60 flex items-center justify-center">
                      <span className="text-sm font-semibold text-muted-foreground">Aa</span>
                    </div>
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium cursor-pointer">
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
                    <div className="flex items-center justify-between mb-3">
                      <FormLabel className="text-sm font-medium">
                        {t('dialog.tags')}
                      </FormLabel>
                      <span className="text-xs text-muted-foreground">
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
                                field.onChange(field.value.filter(id => id !== tag.id));
                              } else {
                                field.onChange([...field.value, tag.id]);
                              }
                            }}
                            className={cn(
                              "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                              isSelected
                                ? "bg-primary/15 text-primary border-2 border-primary/30 shadow-sm"
                                : "bg-muted/40 text-muted-foreground border-2 border-transparent hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            {tag.color && (
                              <div
                                className="size-3 rounded-full shadow-sm"
                                style={{
                                  backgroundColor: tag.color,
                                  boxShadow: isSelected ? `0 0 0 2px var(--background), 0 0 0 3px ${tag.color}50` : undefined
                                }}
                              />
                            )}
                            {tag.name}
                            {isSelected && <Check className="size-3.5 ml-0.5" />}
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
        <div className="px-7 py-5 border-t border-border/40 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
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
              className="h-10 px-5 gap-2"
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
