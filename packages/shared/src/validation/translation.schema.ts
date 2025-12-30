import { z } from 'zod';

/**
 * Translation key name schema - allows dots, underscores, hyphens
 */
export const keyNameSchema = z
  .string()
  .min(1, 'Key name is required')
  .max(500, 'Key name must be less than 500 characters');

/**
 * Key description schema
 */
export const keyDescriptionSchema = z
  .string()
  .max(1000, 'Description must be less than 1000 characters');

/**
 * Translation key creation input
 */
export const createKeySchema = z.object({
  name: keyNameSchema,
  description: keyDescriptionSchema.optional(),
});

export type CreateKeyInput = z.infer<typeof createKeySchema>;

/**
 * Translation key update input
 */
export const updateKeySchema = z.object({
  name: keyNameSchema.optional(),
  description: keyDescriptionSchema.optional(),
});

export type UpdateKeyInput = z.infer<typeof updateKeySchema>;

/**
 * Update translations for a key (language code -> value)
 */
export const updateTranslationsSchema = z.object({
  translations: z.record(z.string(), z.string()),
});

export type UpdateTranslationsInput = z.infer<typeof updateTranslationsSchema>;

/**
 * Set a single translation value
 */
export const setTranslationSchema = z.object({
  value: z.string(),
});

export type SetTranslationInput = z.infer<typeof setTranslationSchema>;

/**
 * Bulk delete keys
 */
export const bulkDeleteKeysSchema = z.object({
  keyIds: z.array(z.string()).min(1, 'Select at least one key'),
});

export type BulkDeleteKeysInput = z.infer<typeof bulkDeleteKeysSchema>;

/**
 * Bulk update translations (key name -> language code -> value)
 */
export const bulkUpdateTranslationsSchema = z.object({
  translations: z.record(z.string(), z.record(z.string(), z.string())),
});

export type BulkUpdateTranslationsInput = z.infer<
  typeof bulkUpdateTranslationsSchema
>;
