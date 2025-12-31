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
