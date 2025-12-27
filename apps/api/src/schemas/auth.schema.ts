/**
 * Authentication API Schemas
 *
 * JSON Schema definitions for authentication endpoints.
 * Used by Fastify for request validation and response serialization.
 */

export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      name: { type: 'string' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  },
};

export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  },
};

export const meSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  },
};

export const createApiKeySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      expiresAt: { type: 'string', format: 'date-time' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        key: { type: 'string' }, // Full key returned only once
        apiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            keyPrefix: { type: 'string' },
            createdAt: { type: 'string' },
            expiresAt: { type: 'string' },
          },
        },
      },
    },
  },
};

export const listApiKeysSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        apiKeys: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              keyPrefix: { type: 'string' },
              createdAt: { type: 'string' },
              lastUsedAt: { type: 'string' },
              expiresAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
