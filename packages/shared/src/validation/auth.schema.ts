import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema } from './common.schema.js';

/**
 * User registration input
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional().or(z.literal('')),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * User login input
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * API key creation input
 */
export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
