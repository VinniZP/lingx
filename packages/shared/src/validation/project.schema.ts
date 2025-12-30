import { z } from 'zod';
import {
  nameSchema,
  slugSchema,
  descriptionSchema,
  languageCodeSchema,
} from './common.schema.js';

/**
 * Project creation input
 */
export const createProjectSchema = z
  .object({
    name: nameSchema,
    slug: slugSchema,
    description: descriptionSchema.optional(),
    languageCodes: z
      .array(languageCodeSchema)
      .min(1, 'Select at least one language'),
    defaultLanguage: languageCodeSchema,
  })
  .refine((data) => data.languageCodes.includes(data.defaultLanguage), {
    message: 'Default language must be included in language codes',
    path: ['defaultLanguage'],
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Project update input (all fields optional)
 */
export const updateProjectSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    languageCodes: z.array(languageCodeSchema).min(1).optional(),
    defaultLanguage: languageCodeSchema.optional(),
  })
  .refine(
    (data) => {
      // If both are provided, validate the constraint
      if (data.languageCodes && data.defaultLanguage) {
        return data.languageCodes.includes(data.defaultLanguage);
      }
      return true;
    },
    {
      message: 'Default language must be included in language codes',
      path: ['defaultLanguage'],
    }
  );

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
