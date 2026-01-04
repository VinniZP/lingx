import { tKey } from '@lingx/sdk-nextjs';
import {
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardCopy,
  Copy,
  Keyboard,
  Languages,
  Sparkles,
  Trash2,
  Type,
  XCircle,
} from 'lucide-react';
import type { ActionCommand, CommandContext } from './types';

/**
 * Handlers for command execution.
 * These are passed from the workbench page.
 */
export interface CommandHandlers {
  // Translation actions
  onFetchAI?: (keyId: string, lang: string) => void;
  onFetchAIAll?: (keyId: string) => void;
  onFetchMT?: (keyId: string, lang: string) => void;
  onFetchMTAll?: (keyId: string) => void;
  onCopySource?: (keyId: string, lang: string) => void;

  // Approval actions
  onApprove?: (translationId: string) => void;
  onApproveAll?: (keyId: string) => void;
  onReject?: (translationId: string) => void;
  onRejectAll?: (keyId: string) => void;

  // Navigation actions
  onSelectKey?: (keyId: string) => void;
  onNextKey?: () => void;
  onPrevKey?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onFocusSource?: () => void;

  // Utility actions
  onCopyKeyName?: (keyName: string) => void;
  onDeleteKey?: (keyId: string) => void;
  onShowShortcuts?: () => void;
  onEvaluateQuality?: (keyId: string) => void;

  // Context getters
  getCurrentTranslationId?: (lang: string) => string | undefined;
  getKeyName?: (keyId: string) => string | undefined;
}

/**
 * Get translation-related commands
 */
function getTranslationCommands(ctx: CommandContext, handlers: CommandHandlers): ActionCommand[] {
  const commands: ActionCommand[] = [];
  const { selectedKeyId, focusedLanguage } = ctx;

  if (!selectedKeyId) return commands;

  // AI Translate focused language
  if (ctx.hasAI && focusedLanguage && handlers.onFetchAI) {
    const handler = handlers.onFetchAI;
    commands.push({
      id: 'ai-translate-language',
      category: 'translation',
      labelKey: tKey('workbench.commandPalette.actions.aiTranslateLanguage'),
      icon: Sparkles,
      shortcut: '⌘I',
      action: () => handler(selectedKeyId, focusedLanguage),
    });
  }

  // AI Translate all languages
  if (ctx.hasAI && handlers.onFetchAIAll) {
    const handler = handlers.onFetchAIAll;
    commands.push({
      id: 'ai-translate-all',
      category: 'translation',
      labelKey: tKey('workbench.commandPalette.actions.aiTranslateAll'),
      icon: Sparkles,
      action: () => handler(selectedKeyId),
    });
  }

  // MT Translate focused language
  if (ctx.hasMT && focusedLanguage && handlers.onFetchMT) {
    const handler = handlers.onFetchMT;
    commands.push({
      id: 'mt-translate-language',
      category: 'translation',
      labelKey: tKey('workbench.commandPalette.actions.mtTranslateLanguage'),
      icon: Languages,
      shortcut: '⌘M',
      action: () => handler(selectedKeyId, focusedLanguage),
    });
  }

  // MT Translate all languages
  if (ctx.hasMT && handlers.onFetchMTAll) {
    const handler = handlers.onFetchMTAll;
    commands.push({
      id: 'mt-translate-all',
      category: 'translation',
      labelKey: tKey('workbench.commandPalette.actions.mtTranslateAll'),
      icon: Languages,
      action: () => handler(selectedKeyId),
    });
  }

  // Copy source to target
  if (focusedLanguage && handlers.onCopySource) {
    const handler = handlers.onCopySource;
    commands.push({
      id: 'copy-source',
      category: 'translation',
      labelKey: tKey('workbench.commandPalette.actions.copySource'),
      icon: Copy,
      action: () => handler(selectedKeyId, focusedLanguage),
    });
  }

  return commands;
}

/**
 * Get approval-related commands
 */
function getApprovalCommands(ctx: CommandContext, handlers: CommandHandlers): ActionCommand[] {
  const commands: ActionCommand[] = [];
  const { selectedKeyId, focusedLanguage } = ctx;

  if (!selectedKeyId) return commands;

  const translationId = focusedLanguage
    ? handlers.getCurrentTranslationId?.(focusedLanguage)
    : undefined;

  // Approve focused language
  if (translationId && handlers.onApprove) {
    const handler = handlers.onApprove;
    commands.push({
      id: 'approve-language',
      category: 'approval',
      labelKey: tKey('workbench.commandPalette.actions.approveLanguage'),
      icon: CheckCircle,
      shortcut: '⌘⏎',
      action: () => handler(translationId),
    });
  }

  // Approve all languages
  if (ctx.hasTranslations && handlers.onApproveAll) {
    const handler = handlers.onApproveAll;
    commands.push({
      id: 'approve-all',
      category: 'approval',
      labelKey: tKey('workbench.commandPalette.actions.approveAll'),
      icon: CheckCircle,
      action: () => handler(selectedKeyId),
    });
  }

  // Reject focused language
  if (translationId && handlers.onReject) {
    const handler = handlers.onReject;
    commands.push({
      id: 'reject-language',
      category: 'approval',
      labelKey: tKey('workbench.commandPalette.actions.rejectLanguage'),
      icon: XCircle,
      shortcut: '⌘⌫',
      action: () => handler(translationId),
    });
  }

  // Reject all languages
  if (ctx.hasTranslations && handlers.onRejectAll) {
    const handler = handlers.onRejectAll;
    commands.push({
      id: 'reject-all',
      category: 'approval',
      labelKey: tKey('workbench.commandPalette.actions.rejectAll'),
      icon: XCircle,
      action: () => handler(selectedKeyId),
    });
  }

  return commands;
}

/**
 * Get navigation-related commands
 */
function getNavigationCommands(ctx: CommandContext, handlers: CommandHandlers): ActionCommand[] {
  const commands: ActionCommand[] = [];

  // Go to next key
  if (handlers.onNextKey) {
    commands.push({
      id: 'next-key',
      category: 'navigation',
      labelKey: tKey('workbench.commandPalette.actions.nextKey'),
      icon: ChevronDown,
      shortcut: '⌘↓',
      action: handlers.onNextKey,
    });
  }

  // Go to previous key
  if (handlers.onPrevKey) {
    commands.push({
      id: 'prev-key',
      category: 'navigation',
      labelKey: tKey('workbench.commandPalette.actions.prevKey'),
      icon: ChevronUp,
      shortcut: '⌘↑',
      action: handlers.onPrevKey,
    });
  }

  // Expand all languages (only when key selected)
  if (ctx.selectedKeyId && handlers.onExpandAll) {
    commands.push({
      id: 'expand-all',
      category: 'navigation',
      labelKey: tKey('workbench.commandPalette.actions.expandAll'),
      icon: ChevronsUpDown,
      action: handlers.onExpandAll,
    });
  }

  // Collapse all languages (only when has expanded)
  if (ctx.selectedKeyId && ctx.expandedLanguages.size > 0 && handlers.onCollapseAll) {
    commands.push({
      id: 'collapse-all',
      category: 'navigation',
      labelKey: tKey('workbench.commandPalette.actions.collapseAll'),
      icon: ChevronsDownUp,
      shortcut: 'Esc',
      action: handlers.onCollapseAll,
    });
  }

  // Focus source field
  if (ctx.selectedKeyId && handlers.onFocusSource) {
    commands.push({
      id: 'focus-source',
      category: 'navigation',
      labelKey: tKey('workbench.commandPalette.actions.focusSource'),
      icon: Type,
      action: handlers.onFocusSource,
    });
  }

  return commands;
}

/**
 * Get utility commands
 */
function getUtilityCommands(ctx: CommandContext, handlers: CommandHandlers): ActionCommand[] {
  const commands: ActionCommand[] = [];
  const { selectedKeyId } = ctx;

  // Copy key name
  if (selectedKeyId && handlers.onCopyKeyName) {
    const keyName = handlers.getKeyName?.(selectedKeyId);
    if (keyName) {
      const handler = handlers.onCopyKeyName;
      commands.push({
        id: 'copy-key-name',
        category: 'utility',
        labelKey: tKey('workbench.commandPalette.actions.copyKeyName'),
        icon: ClipboardCopy,
        action: () => handler(keyName),
      });
    }
  }

  // Delete key
  if (selectedKeyId && handlers.onDeleteKey) {
    const handler = handlers.onDeleteKey;
    commands.push({
      id: 'delete-key',
      category: 'utility',
      labelKey: tKey('workbench.commandPalette.actions.deleteKey'),
      icon: Trash2,
      action: () => handler(selectedKeyId),
    });
  }

  // Show keyboard shortcuts
  if (handlers.onShowShortcuts) {
    commands.push({
      id: 'show-shortcuts',
      category: 'utility',
      labelKey: tKey('workbench.commandPalette.actions.showShortcuts'),
      icon: Keyboard,
      shortcut: '?',
      action: handlers.onShowShortcuts,
    });
  }

  // Evaluate quality
  if (selectedKeyId && handlers.onEvaluateQuality) {
    const handler = handlers.onEvaluateQuality;
    commands.push({
      id: 'evaluate-quality',
      category: 'utility',
      labelKey: tKey('workbench.commandPalette.actions.evaluateQuality'),
      icon: BarChart3,
      action: () => handler(selectedKeyId),
    });
  }

  return commands;
}

/**
 * Get commands grouped by category
 */
export function getGroupedQuickActions(
  ctx: CommandContext,
  handlers: CommandHandlers
): Record<string, ActionCommand[]> {
  const translation = getTranslationCommands(ctx, handlers);
  const approval = getApprovalCommands(ctx, handlers);
  const navigation = getNavigationCommands(ctx, handlers);
  const utility = getUtilityCommands(ctx, handlers);

  const groups: Record<string, ActionCommand[]> = {};

  if (translation.length > 0) groups.translation = translation;
  if (approval.length > 0) groups.approval = approval;
  if (navigation.length > 0) groups.navigation = navigation;
  if (utility.length > 0) groups.utility = utility;

  return groups;
}
