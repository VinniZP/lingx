import type { PartOfSpeech } from '@/lib/api';
import { tKey, type TNsKey } from '@lingx/sdk-nextjs';
import { z } from 'zod';

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
  translations: z.array(
    z.object({
      targetLanguage: z.string(),
      targetTerm: z.string(),
      notes: z.string().optional(),
    })
  ),
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
  labelKey: TNsKey<'glossary'>;
}

// Part of speech options with tKey for static extraction
export const PART_OF_SPEECH_OPTIONS: PartOfSpeechOption[] = [
  { value: 'NOUN', labelKey: tKey('partOfSpeech.noun', 'glossary') },
  { value: 'VERB', labelKey: tKey('partOfSpeech.verb', 'glossary') },
  { value: 'ADJECTIVE', labelKey: tKey('partOfSpeech.adjective', 'glossary') },
  { value: 'ADVERB', labelKey: tKey('partOfSpeech.adverb', 'glossary') },
  { value: 'PRONOUN', labelKey: tKey('partOfSpeech.pronoun', 'glossary') },
  { value: 'PREPOSITION', labelKey: tKey('partOfSpeech.preposition', 'glossary') },
  { value: 'CONJUNCTION', labelKey: tKey('partOfSpeech.conjunction', 'glossary') },
  { value: 'INTERJECTION', labelKey: tKey('partOfSpeech.interjection', 'glossary') },
  { value: 'DETERMINER', labelKey: tKey('partOfSpeech.determiner', 'glossary') },
  { value: 'OTHER', labelKey: tKey('partOfSpeech.other', 'glossary') },
];

// Tag colors - refined palette
export const TAG_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#EC4899',
];
