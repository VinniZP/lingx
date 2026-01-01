import { z } from 'zod';
import { tKey, type TranslationKey } from '@localeflow/sdk-nextjs';
import type { PartOfSpeech } from '@/lib/api';

// Form schemas - validation messages use i18n keys for runtime translation
export const entryFormSchema = z.object({
  sourceTerm: z.string().min(1),
  sourceLanguage: z.string().min(1),
  context: z.string().optional(),
  notes: z.string().optional(),
  partOfSpeech: z.string().optional(),
  caseSensitive: z.boolean(),
  domain: z.string().optional(),
  tagIds: z.array(z.string()),
  translations: z.array(z.object({
    targetLanguage: z.string(),
    targetTerm: z.string(),
    notes: z.string().optional(),
  })),
});

export type EntryFormData = z.infer<typeof entryFormSchema>;

export const tagFormSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
});

export type TagFormData = z.infer<typeof tagFormSchema>;

// Part of speech option interface with typed translation key
export interface PartOfSpeechOption {
  value: PartOfSpeech;
  labelKey: TranslationKey;
}

// Part of speech options with tKey for static extraction
export const PART_OF_SPEECH_OPTIONS: PartOfSpeechOption[] = [
  { value: 'NOUN', labelKey: tKey('glossary.partOfSpeech.noun') },
  { value: 'VERB', labelKey: tKey('glossary.partOfSpeech.verb') },
  { value: 'ADJECTIVE', labelKey: tKey('glossary.partOfSpeech.adjective') },
  { value: 'ADVERB', labelKey: tKey('glossary.partOfSpeech.adverb') },
  { value: 'PRONOUN', labelKey: tKey('glossary.partOfSpeech.pronoun') },
  { value: 'PREPOSITION', labelKey: tKey('glossary.partOfSpeech.preposition') },
  { value: 'CONJUNCTION', labelKey: tKey('glossary.partOfSpeech.conjunction') },
  { value: 'INTERJECTION', labelKey: tKey('glossary.partOfSpeech.interjection') },
  { value: 'DETERMINER', labelKey: tKey('glossary.partOfSpeech.determiner') },
  { value: 'OTHER', labelKey: tKey('glossary.partOfSpeech.other') },
];

// Tag colors - refined palette
export const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
];
