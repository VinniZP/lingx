/**
 * Custom hooks barrel export.
 * Import hooks from this file for cleaner imports.
 */
export {
  useActivityChanges,
  useProjectActivities,
  useUserActivities,
  type Activity,
  type ActivityChange,
} from './use-activity';
export {
  aiQueryKeys,
  formatAICost,
  formatTokenCount,
  getAIProviderDisplayName,
  getModelDisplayName,
  useAIConfigs,
  useAIContextConfig,
  useAISupportedModels,
  useAITranslate,
  useAIUsage,
  useDeleteAIConfig,
  useSaveAIConfig,
  useTestAIConnection,
  useUpdateAIContextConfig,
  type AIConfig,
  type AIContextConfig,
  type AIProvider,
  type AITranslateResult,
  type AIUsageStats,
} from './use-ai-translation';
export { useDashboardStats } from './use-dashboard-stats';
export {
  glossaryKeys,
  useCreateGlossaryEntry,
  useCreateGlossaryTag,
  useDeleteGlossaryEntry,
  useDeleteGlossaryTag,
  useGlossaryExport,
  useGlossaryImport,
  useGlossaryList,
  useGlossarySearch,
  useGlossaryStats,
  useGlossaryTags,
  useRecordGlossaryUsage,
  useUpdateGlossaryEntry,
  type CreateGlossaryEntryInput,
  type GlossaryEntry,
  type GlossaryListParams,
  type GlossaryMatch,
  type GlossarySearchParams,
  type GlossaryStats,
  type GlossaryTag,
  type UpdateGlossaryEntryInput,
} from './use-glossary';
export { useLocalStorage } from './use-local-storage';
export { useIsMobile } from './use-mobile';
export { usePlatform, type PlatformInfo } from './use-platform';
export { useProjects } from './use-projects';
export {
  useRelatedKeys,
  type AIContextResponse,
  type KeyContextStats,
  type RelatedKey,
  type RelatedKeysResponse,
  type RelationshipType,
} from './use-related-keys';
export { useKeySuggestions, type UnifiedSuggestion } from './use-suggestions';
export { useRecordTMUsage, type TMMatch, type TMSearchParams } from './use-translation-memory';
