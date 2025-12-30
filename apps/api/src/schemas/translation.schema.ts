/**
 * Translation API Schemas
 *
 * JSON Schema definitions for translation endpoints.
 * Used by Fastify for request validation and response serialization.
 */

export const translationResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    language: { type: 'string' },
    value: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

export const keyWithTranslationsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    branchId: { type: 'string' },
    translations: {
      type: 'array',
      items: translationResponseSchema,
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

export const createKeySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 500 },
      description: { type: 'string', maxLength: 1000 },
    },
  },
  response: {
    201: keyWithTranslationsSchema,
  },
};

export const updateKeySchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 500 },
      description: { type: 'string', maxLength: 1000 },
    },
  },
  response: {
    200: keyWithTranslationsSchema,
  },
};

export const keyListSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: keyWithTranslationsSchema,
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  },
};

export const updateTranslationsSchema = {
  body: {
    type: 'object',
    required: ['translations'],
    properties: {
      translations: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    },
  },
  response: {
    200: keyWithTranslationsSchema,
  },
};

export const setTranslationSchema = {
  body: {
    type: 'object',
    required: ['value'],
    properties: {
      value: { type: 'string' },
    },
  },
  response: {
    200: translationResponseSchema,
  },
};

export const bulkDeleteSchema = {
  body: {
    type: 'object',
    required: ['keyIds'],
    properties: {
      keyIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        deleted: { type: 'number' },
      },
    },
  },
};

export const branchTranslationsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        translations: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
        languages: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};

export const bulkUpdateTranslationsSchema = {
  body: {
    type: 'object',
    required: ['translations'],
    properties: {
      translations: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        updated: { type: 'number' },
        created: { type: 'number' },
      },
    },
  },
};
