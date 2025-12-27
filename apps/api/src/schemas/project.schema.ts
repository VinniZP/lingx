/**
 * Project API Schemas
 *
 * JSON Schema definitions for project endpoints.
 * Used by Fastify for request validation and response serialization.
 */

export const createProjectSchema = {
  body: {
    type: 'object',
    required: ['name', 'slug', 'languageCodes', 'defaultLanguage'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      slug: {
        type: 'string',
        minLength: 2,
        maxLength: 50,
        pattern: '^[a-z0-9-]+$',
      },
      description: { type: 'string', maxLength: 500 },
      languageCodes: {
        type: 'array',
        items: { type: 'string', minLength: 2, maxLength: 5 },
        minItems: 1,
      },
      defaultLanguage: { type: 'string', minLength: 2, maxLength: 5 },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string', nullable: true },
        defaultLanguage: { type: 'string' },
        languages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              code: { type: 'string' },
              name: { type: 'string' },
              isDefault: { type: 'boolean' },
            },
          },
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const updateProjectSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      languageCodes: {
        type: 'array',
        items: { type: 'string', minLength: 2, maxLength: 5 },
        minItems: 1,
      },
      defaultLanguage: { type: 'string', minLength: 2, maxLength: 5 },
    },
  },
};

export const projectResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    defaultLanguage: { type: 'string' },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' },
          isDefault: { type: 'boolean' },
        },
      },
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

export const projectStatsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    spaces: { type: 'number' },
    totalKeys: { type: 'number' },
    translationsByLanguage: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          translated: { type: 'number' },
          total: { type: 'number' },
          percentage: { type: 'number' },
        },
      },
    },
  },
};

export const projectListSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          items: projectResponseSchema,
        },
      },
    },
  },
};
