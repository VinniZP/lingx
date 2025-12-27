/**
 * Branch API Schemas
 *
 * JSON Schema definitions for branch endpoints.
 * Used by Fastify for request validation and response serialization.
 */

export const createBranchSchema = {
  body: {
    type: 'object',
    required: ['name', 'fromBranchId'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9-_]+$',
      },
      fromBranchId: { type: 'string' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        spaceId: { type: 'string' },
        sourceBranchId: { type: 'string', nullable: true },
        isDefault: { type: 'boolean' },
        keyCount: { type: 'number' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const branchResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    spaceId: { type: 'string' },
    sourceBranchId: { type: 'string', nullable: true },
    isDefault: { type: 'boolean' },
    keyCount: { type: 'number' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

export const branchListSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        branches: {
          type: 'array',
          items: branchResponseSchema,
        },
      },
    },
  },
};

export const branchDetailSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    spaceId: { type: 'string' },
    sourceBranchId: { type: 'string', nullable: true },
    isDefault: { type: 'boolean' },
    keyCount: { type: 'number' },
    space: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        projectId: { type: 'string' },
      },
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};
