/**
 * Space API Schemas
 *
 * JSON Schema definitions for space endpoints.
 * Used by Fastify for request validation and response serialization.
 */

export const createSpaceSchema = {
  body: {
    type: 'object',
    required: ['name', 'slug'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      slug: {
        type: 'string',
        minLength: 2,
        maxLength: 50,
        pattern: '^[a-z0-9-]+$',
      },
      description: { type: 'string', maxLength: 500 },
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
        projectId: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const updateSpaceSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
    },
  },
};

export const spaceResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    projectId: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

export const branchSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    isDefault: { type: 'boolean' },
    createdAt: { type: 'string' },
  },
};

export const spaceWithBranchesSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    projectId: { type: 'string' },
    branches: {
      type: 'array',
      items: branchSchema,
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

export const spaceStatsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    branches: { type: 'number' },
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

export const spaceListSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        spaces: {
          type: 'array',
          items: spaceResponseSchema,
        },
      },
    },
  },
};
