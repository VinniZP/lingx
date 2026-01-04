import type { TKey } from '@lingx/sdk-nextjs';
import type { LucideIcon } from 'lucide-react';

/**
 * Command categories for grouping in the command palette
 */
export type CommandCategory =
  | 'translation'
  | 'approval'
  | 'navigation'
  | 'utility'
  | 'search-result';

/**
 * Base interface for all commands
 */
export interface BaseCommand {
  id: string;
  category: CommandCategory;
  labelKey: TKey;
  icon: LucideIcon;
  shortcut?: string;
  keywords?: string[];
}

/**
 * Action command - executes an action when selected
 */
export interface ActionCommand extends BaseCommand {
  category: 'translation' | 'approval' | 'navigation' | 'utility';
  action: () => void;
  disabled?: boolean;
  disabledReason?: TKey;
}

/**
 * Search result command - represents a search result that navigates to a key
 */
export interface SearchResultCommand extends BaseCommand {
  category: 'search-result';
  action: () => void;
  keyId: string;
  keyName: string;
  namespace: string | null;
  matchType: 'key-name' | 'translation-content';
  matchedLanguage?: string;
  matchedContent?: string;
}

export type Command = ActionCommand | SearchResultCommand;

/**
 * Context for generating context-aware commands
 */
export interface CommandContext {
  selectedKeyId: string | null;
  focusedLanguage: string | null;
  expandedLanguages: Set<string>;
  hasTranslations: boolean;
  hasMT: boolean;
  hasAI: boolean;
  defaultLanguageCode: string | null;
}

/**
 * Recent action stored in localStorage
 */
export interface RecentAction {
  id: string;
  commandId: string;
  keyId: string;
  keyName: string;
  language?: string;
  timestamp: number;
}

/**
 * Search result before conversion to command
 */
export interface SearchResult {
  keyId: string;
  keyName: string;
  namespace: string | null;
  matchType: 'key-name' | 'translation-content';
  matchedLanguage?: string;
  matchedContent?: string;
  relevanceScore: number;
}
