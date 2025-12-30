import { z } from 'zod';

/**
 * Branch name validation - allows alphanumeric, hyphens, and underscores
 */
export const branchNameSchema = z
  .string()
  .min(1, 'Branch name is required')
  .max(100, 'Branch name must be less than 100 characters')
  .regex(
    /^[a-zA-Z0-9-_]+$/,
    'Branch name can only contain letters, numbers, hyphens, and underscores'
  );

/**
 * Branch creation input
 */
export const createBranchSchema = z.object({
  name: branchNameSchema,
  fromBranchId: z.string().min(1, 'Source branch is required'),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
