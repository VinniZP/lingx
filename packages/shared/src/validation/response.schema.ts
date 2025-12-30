import { z } from 'zod';

// ============================================
// Common Response Schemas
// ============================================

/** User object in responses */
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

/** Message response */
export const messageResponseSchema = z.object({
  message: z.string(),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;

// ============================================
// Auth Response Schemas
// ============================================

/** Register/Login response */
export const authResponseSchema = z.object({
  user: userResponseSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/** API key creation response (includes full key) */
export const createApiKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  keyPrefix: z.string(),
  createdAt: z.string(),
});

export type CreateApiKeyResponse = z.infer<typeof createApiKeyResponseSchema>;

/** API key list item */
export const apiKeyItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  revoked: z.boolean(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export type ApiKeyItem = z.infer<typeof apiKeyItemSchema>;

/** API key list response */
export const apiKeyListResponseSchema = z.object({
  apiKeys: z.array(apiKeyItemSchema),
});

export type ApiKeyListResponse = z.infer<typeof apiKeyListResponseSchema>;

// ============================================
// Project Response Schemas
// ============================================

/** Language in project response */
export const projectLanguageSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
});

export type ProjectLanguage = z.infer<typeof projectLanguageSchema>;

/** Project response */
export const projectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  defaultLanguage: z.string(),
  languages: z.array(projectLanguageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;

/** Project with stats (for list) */
export const projectStatsEmbeddedSchema = z.object({
  totalKeys: z.number(),
  translatedKeys: z.number(),
  completionRate: z.number(),
});

export type ProjectStatsEmbedded = z.infer<typeof projectStatsEmbeddedSchema>;

export const projectWithStatsSchema = projectResponseSchema.extend({
  stats: projectStatsEmbeddedSchema,
});

export type ProjectWithStats = z.infer<typeof projectWithStatsSchema>;

/** Project list response */
export const projectListResponseSchema = z.object({
  projects: z.array(projectWithStatsSchema),
});

export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;

/** Project stats detail response (for /projects/:id/stats) */
export const projectStatsDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  spaces: z.number(),
  totalKeys: z.number(),
  translationsByLanguage: z.record(z.string(), z.object({
    translated: z.number(),
    total: z.number(),
    percentage: z.number(),
  })),
});

export type ProjectStatsDetail = z.infer<typeof projectStatsDetailSchema>;

/** Branch tree node */
export const branchTreeNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isDefault: z.boolean(),
  keyCount: z.number(),
});

export type BranchTreeNode = z.infer<typeof branchTreeNodeSchema>;

/** Space tree node */
export const spaceTreeNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  branches: z.array(branchTreeNodeSchema),
});

export type SpaceTreeNode = z.infer<typeof spaceTreeNodeSchema>;

/** Project tree response (for sidebar navigation) */
export const projectTreeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  spaces: z.array(spaceTreeNodeSchema),
});

export type ProjectTreeResponse = z.infer<typeof projectTreeResponseSchema>;

// ============================================
// Space Response Schemas
// ============================================

/** Space response */
export const spaceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  projectId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SpaceResponse = z.infer<typeof spaceResponseSchema>;

/** Branch in space response */
export const branchInSpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type BranchInSpace = z.infer<typeof branchInSpaceSchema>;

/** Space with branches response */
export const spaceWithBranchesSchema = spaceResponseSchema.extend({
  branches: z.array(branchInSpaceSchema),
});

export type SpaceWithBranches = z.infer<typeof spaceWithBranchesSchema>;

/** Space list response */
export const spaceListResponseSchema = z.object({
  spaces: z.array(spaceResponseSchema),
});

export type SpaceListResponse = z.infer<typeof spaceListResponseSchema>;

/** Space stats response */
export const spaceStatsResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  branches: z.number(),
  totalKeys: z.number(),
  translationsByLanguage: z.record(z.string(), z.object({
    translated: z.number(),
    total: z.number(),
    percentage: z.number(),
  })),
});

export type SpaceStatsResponse = z.infer<typeof spaceStatsResponseSchema>;

// ============================================
// Branch Response Schemas
// ============================================

/** Branch response */
export const branchResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  spaceId: z.string().optional(),
  sourceBranchId: z.string().nullable().optional(),
  keyCount: z.number().optional(),
});

export type BranchResponse = z.infer<typeof branchResponseSchema>;

/** Branch with space details */
export const branchWithSpaceSchema = branchResponseSchema.extend({
  space: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    projectId: z.string(),
  }),
});

export type BranchWithSpace = z.infer<typeof branchWithSpaceSchema>;

/** Branch list response */
export const branchListResponseSchema = z.object({
  branches: z.array(branchResponseSchema),
});

export type BranchListResponse = z.infer<typeof branchListResponseSchema>;

/** Translation map (language code -> value) */
export const translationMapSchema = z.record(z.string(), z.string());

export type TranslationMap = z.infer<typeof translationMapSchema>;

/** Branch info for diff/merge */
export const diffBranchInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type DiffBranchInfo = z.infer<typeof diffBranchInfoSchema>;

/** Diff entry (for added/deleted keys) */
export const diffEntrySchema = z.object({
  key: z.string(),
  translations: translationMapSchema,
});

export type DiffEntry = z.infer<typeof diffEntrySchema>;

/** Modified entry (for changed keys) */
export const modifiedEntrySchema = z.object({
  key: z.string(),
  source: translationMapSchema,
  target: translationMapSchema,
});

export type ModifiedEntry = z.infer<typeof modifiedEntrySchema>;

/** Conflict entry */
export const conflictEntrySchema = z.object({
  key: z.string(),
  source: translationMapSchema,
  target: translationMapSchema,
});

export type ConflictEntry = z.infer<typeof conflictEntrySchema>;

/** Branch diff response */
export const branchDiffResponseSchema = z.object({
  source: diffBranchInfoSchema,
  target: diffBranchInfoSchema,
  added: z.array(diffEntrySchema),
  modified: z.array(modifiedEntrySchema),
  deleted: z.array(diffEntrySchema),
  conflicts: z.array(conflictEntrySchema),
});

export type BranchDiffResponse = z.infer<typeof branchDiffResponseSchema>;

/** Merge request body */
export const mergeRequestSchema = z.object({
  targetBranchId: z.string(),
  resolutions: z.array(z.object({
    key: z.string(),
    resolution: z.union([
      z.enum(['source', 'target']),
      z.record(z.string(), z.string()),
    ]),
  })).optional(),
});

export type MergeRequest = z.infer<typeof mergeRequestSchema>;

/** Merge response */
export const mergeResponseSchema = z.object({
  success: z.boolean(),
  merged: z.number(),
  conflicts: z.array(conflictEntrySchema).optional(),
});

export type MergeResponse = z.infer<typeof mergeResponseSchema>;

// ============================================
// Environment Response Schemas
// ============================================

/** Environment branch reference */
export const environmentBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  spaceId: z.string(),
  space: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
});

export type EnvironmentBranch = z.infer<typeof environmentBranchSchema>;

/** Environment response */
export const environmentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  projectId: z.string(),
  branchId: z.string(),
  branch: environmentBranchSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EnvironmentResponse = z.infer<typeof environmentResponseSchema>;

/** Environment list response */
export const environmentListResponseSchema = z.object({
  environments: z.array(environmentResponseSchema),
});

export type EnvironmentListResponse = z.infer<typeof environmentListResponseSchema>;

// ============================================
// Translation Response Schemas
// ============================================

/** Translation value */
export const translationValueSchema = z.object({
  id: z.string(),
  language: z.string(),
  value: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TranslationValue = z.infer<typeof translationValueSchema>;

/** Translation key response */
export const translationKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  branchId: z.string(),
  translations: z.array(translationValueSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TranslationKeyResponse = z.infer<typeof translationKeyResponseSchema>;

/** Translation key list response */
export const keyListResponseSchema = z.object({
  keys: z.array(translationKeyResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type KeyListResponse = z.infer<typeof keyListResponseSchema>;

/** Bulk delete response */
export const bulkDeleteResponseSchema = z.object({
  deleted: z.number(),
});

export type BulkDeleteResponse = z.infer<typeof bulkDeleteResponseSchema>;

// ============================================
// Dashboard Response Schemas
// ============================================

export const dashboardStatsResponseSchema = z.object({
  totalProjects: z.number(),
  totalKeys: z.number(),
  totalLanguages: z.number(),
  completionRate: z.number(),
  translatedKeys: z.number(),
  totalTranslations: z.number(),
});

export type DashboardStatsResponse = z.infer<typeof dashboardStatsResponseSchema>;

// ============================================
// Activity Response Schemas
// ============================================

export const activityChangeSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  keyName: z.string().optional(),
  language: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  createdAt: z.string(),
});

export type ActivityChange = z.infer<typeof activityChangeSchema>;

/** Activity metadata (varies by activity type) */
export const activityMetadataSchema = z.object({
  languages: z.array(z.string()).optional(),
  branchName: z.string().optional(),
  branchId: z.string().optional(),
  sourceBranchName: z.string().optional(),
  sourceBranchId: z.string().optional(),
  targetBranchName: z.string().optional(),
  targetBranchId: z.string().optional(),
  fileName: z.string().optional(),
  format: z.string().optional(),
  keyCount: z.number().optional(),
  environmentName: z.string().optional(),
  environmentId: z.string().optional(),
  oldBranchName: z.string().optional(),
  oldBranchId: z.string().optional(),
  newBranchName: z.string().optional(),
  newBranchId: z.string().optional(),
  changedFields: z.array(z.string()).optional(),
  conflictsResolved: z.number().optional(),
  hasMore: z.boolean().optional(),
  preview: z.array(z.object({
    keyId: z.string(),
    keyName: z.string(),
    language: z.string().optional(),
    oldValue: z.string().optional(),
    newValue: z.string().optional(),
  })).optional(),
});

export type ActivityMetadata = z.infer<typeof activityMetadataSchema>;

export const activitySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string().optional(),
  branchId: z.string().nullable(),
  branchName: z.string().optional(),
  userId: z.string(),
  userName: z.string(),
  type: z.string(),
  count: z.number(),
  metadata: activityMetadataSchema,
  createdAt: z.string(),
});

export type Activity = z.infer<typeof activitySchema>;

export const activityListResponseSchema = z.object({
  activities: z.array(activitySchema),
  nextCursor: z.string().optional(),
});

export type ActivityListResponse = z.infer<typeof activityListResponseSchema>;

export const activityChangesResponseSchema = z.object({
  changes: z.array(activityChangeSchema),
  nextCursor: z.string().optional(),
  total: z.number(),
});

export type ActivityChangesResponse = z.infer<typeof activityChangesResponseSchema>;

// ============================================
// SDK Response Schemas
// ============================================

/** SDK translations response (for CLI pull/push) */
export const sdkTranslationsResponseSchema = z.object({
  language: z.string(),
  translations: z.record(z.string(), z.string()),
  availableLanguages: z.array(z.string()),
});

export type SdkTranslationsResponse = z.infer<typeof sdkTranslationsResponseSchema>;

/** CLI pull response - translations by language */
export const cliTranslationsResponseSchema = z.object({
  translations: z.record(z.string(), z.record(z.string(), z.string())),
  languages: z.array(z.string()),
});

export type CliTranslationsResponse = z.infer<typeof cliTranslationsResponseSchema>;
