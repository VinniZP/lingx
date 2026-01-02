import { z } from 'zod';

export const providerConfigSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().min(1, 'Model is required'),
  isActive: z.boolean(),
});

export type ProviderConfigFormData = z.infer<typeof providerConfigSchema>;

export const contextConfigSchema = z.object({
  includeGlossary: z.boolean(),
  glossaryLimit: z.number().min(1).max(50),
  includeTM: z.boolean(),
  tmLimit: z.number().min(1).max(20),
  tmMinSimilarity: z.number().min(0).max(1),
  includeRelatedKeys: z.boolean(),
  relatedKeysLimit: z.number().min(1).max(20),
  includeDescription: z.boolean(),
  customInstructions: z.string().max(2000).nullable(),
});

export type ContextConfigFormData = z.infer<typeof contextConfigSchema>;
