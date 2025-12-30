/**
 * Project API contracts
 *
 * Re-exports Zod-inferred types as the single source of truth.
 */

// Re-export Zod-inferred types
export type {
  ProjectLanguage,
  ProjectResponse,
  ProjectStatsEmbedded as ProjectStats,
  ProjectWithStats,
  ProjectListResponse,
  ProjectTreeResponse,
  SpaceTreeNode,
  BranchTreeNode,
  ProjectStatsDetail,
} from '../validation/response.schema.js';
