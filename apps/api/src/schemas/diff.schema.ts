/**
 * Branch Diff API Schemas
 *
 * JSON Schema definitions for branch diff endpoint.
 * Per Design Doc: BranchDiffResponse schema for AC-WEB-014
 */

const translationMapSchema = {
  type: 'object',
  additionalProperties: { type: 'string' },
};

const branchInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
};

const diffEntrySchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    translations: translationMapSchema,
  },
};

const modifiedEntrySchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    source: translationMapSchema,
    target: translationMapSchema,
  },
};

const conflictEntrySchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    source: translationMapSchema,
    target: translationMapSchema,
  },
};

export const branchDiffResponseSchema = {
  type: 'object',
  properties: {
    source: branchInfoSchema,
    target: branchInfoSchema,
    added: {
      type: 'array',
      items: diffEntrySchema,
    },
    modified: {
      type: 'array',
      items: modifiedEntrySchema,
    },
    deleted: {
      type: 'array',
      items: diffEntrySchema,
    },
    conflicts: {
      type: 'array',
      items: conflictEntrySchema,
    },
  },
};

export const branchDiffParamsSchema = {
  type: 'object',
  required: ['id', 'targetId'],
  properties: {
    id: { type: 'string' },
    targetId: { type: 'string' },
  },
};

export const branchDiffSchema = {
  params: branchDiffParamsSchema,
  response: {
    200: branchDiffResponseSchema,
  },
};
