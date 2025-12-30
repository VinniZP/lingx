import { z } from 'zod';
import { nameSchema, slugSchema, descriptionSchema } from './common.schema.js';

/**
 * Space creation input
 */
export const createSpaceSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.optional(),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;

/**
 * Space update input (all fields optional)
 */
export const updateSpaceSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
});

export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
