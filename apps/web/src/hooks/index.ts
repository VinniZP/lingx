/**
 * Custom hooks barrel export.
 * Import hooks from this file for cleaner imports.
 */
export { useDashboardStats, formatDashboardStats } from './use-dashboard-stats';
export { useProjects } from './use-projects';
export { useIsMobile } from './use-mobile';
export {
  useUserActivities,
  useProjectActivities,
  useActivityChanges,
  type Activity,
  type ActivityChange,
} from './use-activity';
export {
  useTranslationMemorySearch,
  useRecordTMUsage,
  useTMStats,
  useTMReindex,
  type TMMatch,
  type TMSearchParams,
} from './use-translation-memory';
export {
  useSuggestions,
  useKeySuggestions,
  type UnifiedSuggestion,
} from './use-suggestions';
export { useKeyboardNavigation } from './use-keyboard-navigation';
export {
  useGlossarySearch,
  useGlossaryList,
  useGlossaryEntry,
  useCreateGlossaryEntry,
  useUpdateGlossaryEntry,
  useDeleteGlossaryEntry,
  useAddGlossaryTranslation,
  useUpdateGlossaryTranslation,
  useDeleteGlossaryTranslation,
  useRecordGlossaryUsage,
  useGlossaryTags,
  useCreateGlossaryTag,
  useUpdateGlossaryTag,
  useDeleteGlossaryTag,
  useGlossaryStats,
  useGlossaryImport,
  useGlossaryExport,
  useGlossarySync,
  useGlossarySyncStatus,
  useDeleteGlossarySync,
  glossaryKeys,
  type GlossaryEntry,
  type GlossaryMatch,
  type GlossarySearchParams,
  type GlossaryListParams,
  type GlossaryStats,
  type GlossaryTag,
  type CreateGlossaryEntryInput,
  type UpdateGlossaryEntryInput,
} from './use-glossary';
export {
  useRelatedKeys,
  useAllRelatedKeys,
  useAIContext,
  useKeyContextStats,
  useAnalyzeRelationships,
  type RelatedKey,
  type RelatedKeysResponse,
  type AIContextResponse,
  type KeyContextStats,
  type RelationshipType,
} from './use-related-keys';
export {
  useAIConfigs,
  useSaveAIConfig,
  useDeleteAIConfig,
  useAIContextConfig,
  useUpdateAIContextConfig,
  useTestAIConnection,
  useAISupportedModels,
  useAITranslate,
  useAIUsage,
  getAIProviderDisplayName,
  getModelDisplayName,
  formatTokenCount,
  formatAICost,
  aiQueryKeys,
  type AIProvider,
  type AIConfig,
  type AIContextConfig,
  type AITranslateResult,
  type AIUsageStats,
} from './use-ai-translation';
