/**
 * Environment API Schemas
 *
 * JSON Schema definitions for environment endpoints.
 * Used by Fastify for request validation and response serialization.
 */

export const createEnvironmentSchema = {
  body: {
    type: 'object',
    required: ['name', 'slug', 'branchId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      slug: {
        type: 'string',
        minLength: 1,
        maxLength: 50,
        pattern: '^[a-z0-9-]+$',
      },
      branchId: { type: 'string' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        projectId: { type: 'string' },
        branchId: { type: 'string' },
        branch: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            spaceId: { type: 'string' },
            space: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const updateEnvironmentSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
};

export const switchBranchSchema = {
  body: {
    type: 'object',
    required: ['branchId'],
    properties: {
      branchId: { type: 'string' },
    },
  },
};

export const environmentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    projectId: { type: 'string' },
    branchId: { type: 'string' },
    branch: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        spaceId: { type: 'string' },
        space: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
      },
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

export const environmentListSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        environments: {
          type: 'array',
          items: environmentResponseSchema,
        },
      },
    },
  },
};
