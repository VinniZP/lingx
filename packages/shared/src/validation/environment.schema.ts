import { z } from 'zod';
import { nameSchema, slugSchema } from './common.schema.js';

/**
 * Environment creation input
 */
export const createEnvironmentSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  branchId: z.string().min(1, 'Branch is required'),
});

export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;

/**
 * Environment update input (all fields optional)
 */
export const updateEnvironmentSchema = z.object({
  name: nameSchema.optional(),
});

export type UpdateEnvironmentInput = z.infer<typeof updateEnvironmentSchema>;

/**
 * Switch environment branch input
 */
export const switchBranchSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
});

export type SwitchBranchInput = z.infer<typeof switchBranchSchema>;
