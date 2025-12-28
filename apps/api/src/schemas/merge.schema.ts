/**
 * Branch Merge API Schemas
 *
 * JSON Schema definitions for branch merge endpoint.
 * Per Design Doc: MergeRequest and MergeResponse schemas for AC-WEB-015
 */

const translationMapSchema = {
  type: 'object',
  additionalProperties: { type: 'string' },
};

const conflictEntrySchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    source: translationMapSchema,
    target: translationMapSchema,
  },
};

export const mergeRequestBodySchema = {
  type: 'object',
  required: ['targetBranchId'],
  properties: {
    targetBranchId: { type: 'string' },
    resolutions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['key', 'resolution'],
        properties: {
          key: { type: 'string' },
          resolution: {
            oneOf: [
              { type: 'string', enum: ['source', 'target'] },
              {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
            ],
          },
        },
      },
    },
  },
};

export const mergeResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    merged: { type: 'number' },
    conflicts: {
      type: 'array',
      items: conflictEntrySchema,
    },
  },
};

export const mergeParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
};

export const mergeEndpointSchema = {
  params: mergeParamsSchema,
  body: mergeRequestBodySchema,
  response: {
    200: mergeResponseSchema,
  },
};
