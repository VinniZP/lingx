import { describe, expect, it, vi } from 'vitest';
import { getGroupedQuickActions, type CommandHandlers } from '../command-registry';
import type { CommandContext } from '../types';

// Helper to create a default command context
function createContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    selectedKeyId: null,
    focusedLanguage: null,
    expandedLanguages: new Set(),
    hasTranslations: false,
    hasMT: false,
    hasAI: false,
    defaultLanguageCode: 'en',
    ...overrides,
  };
}

// Helper to create mock handlers
function createHandlers(overrides: Partial<CommandHandlers> = {}): CommandHandlers {
  return {
    onFetchAI: vi.fn(),
    onFetchAIAll: vi.fn(),
    onFetchMT: vi.fn(),
    onFetchMTAll: vi.fn(),
    onCopySource: vi.fn(),
    onApprove: vi.fn(),
    onApproveAll: vi.fn(),
    onReject: vi.fn(),
    onRejectAll: vi.fn(),
    onSelectKey: vi.fn(),
    onNextKey: vi.fn(),
    onPrevKey: vi.fn(),
    onExpandAll: vi.fn(),
    onCollapseAll: vi.fn(),
    onFocusSource: vi.fn(),
    onCopyKeyName: vi.fn(),
    onDeleteKey: vi.fn(),
    onShowShortcuts: vi.fn(),
    onEvaluateQuality: vi.fn(),
    getCurrentTranslationId: vi.fn(),
    getKeyName: vi.fn(),
    ...overrides,
  };
}

describe('command-registry', () => {
  describe('getGroupedQuickActions', () => {
    describe('when no key is selected', () => {
      it('should return empty groups for translation commands', () => {
        const ctx = createContext({ selectedKeyId: null });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation).toBeUndefined();
      });

      it('should return empty groups for approval commands', () => {
        const ctx = createContext({ selectedKeyId: null });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.approval).toBeUndefined();
      });

      it('should still include navigation commands', () => {
        const ctx = createContext({ selectedKeyId: null });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.navigation).toBeDefined();
        expect(groups.navigation?.some((c) => c.id === 'next-key')).toBe(true);
        expect(groups.navigation?.some((c) => c.id === 'prev-key')).toBe(true);
      });

      it('should still include keyboard shortcuts utility command', () => {
        const ctx = createContext({ selectedKeyId: null });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.utility).toBeDefined();
        expect(groups.utility?.some((c) => c.id === 'show-shortcuts')).toBe(true);
      });
    });

    describe('translation commands', () => {
      it('should include AI translate when hasAI is true and key is selected', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasAI: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation).toBeDefined();
        expect(groups.translation?.some((c) => c.id === 'ai-translate-language')).toBe(true);
      });

      it('should include AI translate all when hasAI is true', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          hasAI: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation?.some((c) => c.id === 'ai-translate-all')).toBe(true);
      });

      it('should exclude AI commands when hasAI is false', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasAI: false,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation?.some((c) => c.id === 'ai-translate-language')).toBeFalsy();
        expect(groups.translation?.some((c) => c.id === 'ai-translate-all')).toBeFalsy();
      });

      it('should include MT translate when hasMT is true and key is selected', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasMT: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation).toBeDefined();
        expect(groups.translation?.some((c) => c.id === 'mt-translate-language')).toBe(true);
      });

      it('should include MT translate all when hasMT is true', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          hasMT: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation?.some((c) => c.id === 'mt-translate-all')).toBe(true);
      });

      it('should exclude MT commands when hasMT is false', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasMT: false,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation?.some((c) => c.id === 'mt-translate-language')).toBeFalsy();
        expect(groups.translation?.some((c) => c.id === 'mt-translate-all')).toBeFalsy();
      });

      it('should include copy source when focused language is set', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation?.some((c) => c.id === 'copy-source')).toBe(true);
      });

      it('should exclude copy source when no focused language', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: null,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.translation?.some((c) => c.id === 'copy-source')).toBeFalsy();
      });

      it('should not include language-specific commands without focused language', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: null,
          hasAI: true,
          hasMT: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        // Language-specific commands should not be present
        expect(groups.translation?.some((c) => c.id === 'ai-translate-language')).toBeFalsy();
        expect(groups.translation?.some((c) => c.id === 'mt-translate-language')).toBeFalsy();
        // But "all" commands should still be present
        expect(groups.translation?.some((c) => c.id === 'ai-translate-all')).toBe(true);
        expect(groups.translation?.some((c) => c.id === 'mt-translate-all')).toBe(true);
      });
    });

    describe('approval commands', () => {
      it('should include approve/reject language when translation exists', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasTranslations: true,
        });
        const handlers = createHandlers({
          getCurrentTranslationId: vi.fn().mockReturnValue('trans-1'),
        });

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.approval).toBeDefined();
        expect(groups.approval?.some((c) => c.id === 'approve-language')).toBe(true);
        expect(groups.approval?.some((c) => c.id === 'reject-language')).toBe(true);
      });

      it('should include approve/reject all when hasTranslations is true', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          hasTranslations: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.approval?.some((c) => c.id === 'approve-all')).toBe(true);
        expect(groups.approval?.some((c) => c.id === 'reject-all')).toBe(true);
      });

      it('should exclude approve/reject all when hasTranslations is false', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          hasTranslations: false,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.approval?.some((c) => c.id === 'approve-all')).toBeFalsy();
        expect(groups.approval?.some((c) => c.id === 'reject-all')).toBeFalsy();
      });

      it('should exclude language-specific approval when no translation ID', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasTranslations: true,
        });
        const handlers = createHandlers({
          getCurrentTranslationId: vi.fn().mockReturnValue(undefined),
        });

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.approval?.some((c) => c.id === 'approve-language')).toBeFalsy();
        expect(groups.approval?.some((c) => c.id === 'reject-language')).toBeFalsy();
      });
    });

    describe('navigation commands', () => {
      it('should include next/prev key commands', () => {
        const ctx = createContext();
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.navigation).toBeDefined();
        expect(groups.navigation?.some((c) => c.id === 'next-key')).toBe(true);
        expect(groups.navigation?.some((c) => c.id === 'prev-key')).toBe(true);
      });

      it('should include expand all when key is selected', () => {
        const ctx = createContext({ selectedKeyId: 'key-1' });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.navigation?.some((c) => c.id === 'expand-all')).toBe(true);
      });

      it('should exclude expand all when no key is selected', () => {
        const ctx = createContext({ selectedKeyId: null });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.navigation?.some((c) => c.id === 'expand-all')).toBeFalsy();
      });

      it('should include collapse all when has expanded languages', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          expandedLanguages: new Set(['de', 'fr']),
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.navigation?.some((c) => c.id === 'collapse-all')).toBe(true);
      });

      it('should exclude collapse all when no expanded languages', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          expandedLanguages: new Set(),
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.navigation?.some((c) => c.id === 'collapse-all')).toBeFalsy();
      });

      it('should include focus source when key is selected', () => {
        const ctx = createContext({ selectedKeyId: 'key-1' });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.navigation?.some((c) => c.id === 'focus-source')).toBe(true);
      });
    });

    describe('utility commands', () => {
      it('should include copy key name when key is selected and name is available', () => {
        const ctx = createContext({ selectedKeyId: 'key-1' });
        const handlers = createHandlers({
          getKeyName: vi.fn().mockReturnValue('greeting'),
        });

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.utility?.some((c) => c.id === 'copy-key-name')).toBe(true);
      });

      it('should exclude copy key name when getKeyName returns undefined', () => {
        const ctx = createContext({ selectedKeyId: 'key-1' });
        const handlers = createHandlers({
          getKeyName: vi.fn().mockReturnValue(undefined),
        });

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.utility?.some((c) => c.id === 'copy-key-name')).toBeFalsy();
      });

      it('should include delete key when key is selected', () => {
        const ctx = createContext({ selectedKeyId: 'key-1' });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.utility?.some((c) => c.id === 'delete-key')).toBe(true);
      });

      it('should always include show shortcuts', () => {
        const ctx = createContext();
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.utility?.some((c) => c.id === 'show-shortcuts')).toBe(true);
      });

      it('should include evaluate quality when key is selected', () => {
        const ctx = createContext({ selectedKeyId: 'key-1' });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        expect(groups.utility?.some((c) => c.id === 'evaluate-quality')).toBe(true);
      });
    });

    describe('command actions', () => {
      it('should call onFetchAI with correct parameters when AI translate is executed', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasAI: true,
        });
        const onFetchAI = vi.fn();
        const handlers = createHandlers({ onFetchAI });

        const groups = getGroupedQuickActions(ctx, handlers);
        const aiCommand = groups.translation?.find((c) => c.id === 'ai-translate-language');

        aiCommand?.action();

        expect(onFetchAI).toHaveBeenCalledWith('key-1', 'de');
      });

      it('should call onFetchMT with correct parameters when MT translate is executed', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'fr',
          hasMT: true,
        });
        const onFetchMT = vi.fn();
        const handlers = createHandlers({ onFetchMT });

        const groups = getGroupedQuickActions(ctx, handlers);
        const mtCommand = groups.translation?.find((c) => c.id === 'mt-translate-language');

        mtCommand?.action();

        expect(onFetchMT).toHaveBeenCalledWith('key-1', 'fr');
      });

      it('should call onApprove with translation ID when approve is executed', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasTranslations: true,
        });
        const onApprove = vi.fn();
        const handlers = createHandlers({
          onApprove,
          getCurrentTranslationId: vi.fn().mockReturnValue('trans-123'),
        });

        const groups = getGroupedQuickActions(ctx, handlers);
        const approveCommand = groups.approval?.find((c) => c.id === 'approve-language');

        approveCommand?.action();

        expect(onApprove).toHaveBeenCalledWith('trans-123');
      });

      it('should call onCopyKeyName with key name when copy key name is executed', () => {
        const ctx = createContext({ selectedKeyId: 'key-1' });
        const onCopyKeyName = vi.fn();
        const handlers = createHandlers({
          onCopyKeyName,
          getKeyName: vi.fn().mockReturnValue('my.translation.key'),
        });

        const groups = getGroupedQuickActions(ctx, handlers);
        const copyCommand = groups.utility?.find((c) => c.id === 'copy-key-name');

        copyCommand?.action();

        expect(onCopyKeyName).toHaveBeenCalledWith('my.translation.key');
      });

      it('should call onDeleteKey with key ID when delete key is executed', () => {
        const ctx = createContext({ selectedKeyId: 'key-to-delete' });
        const onDeleteKey = vi.fn();
        const handlers = createHandlers({ onDeleteKey });

        const groups = getGroupedQuickActions(ctx, handlers);
        const deleteCommand = groups.utility?.find((c) => c.id === 'delete-key');

        deleteCommand?.action();

        expect(onDeleteKey).toHaveBeenCalledWith('key-to-delete');
      });
    });

    describe('missing handlers', () => {
      it('should not include commands when handler is missing', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          hasAI: true,
          hasMT: true,
        });
        const handlers: CommandHandlers = {
          // No handlers provided
        };

        const groups = getGroupedQuickActions(ctx, handlers);

        // Should have no translation commands without handlers
        expect(groups.translation).toBeUndefined();
      });

      it('should not include navigation commands when handlers are missing', () => {
        const ctx = createContext();
        const handlers: CommandHandlers = {
          // No handlers provided
        };

        const groups = getGroupedQuickActions(ctx, handlers);

        // Navigation group should be undefined or empty when no handlers
        expect(groups.navigation).toBeUndefined();
      });
    });

    describe('command properties', () => {
      it('should have correct shortcut for AI translate', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasAI: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);
        const aiCommand = groups.translation?.find((c) => c.id === 'ai-translate-language');

        expect(aiCommand?.shortcut).toBe('⌘I');
      });

      it('should have correct shortcut for MT translate', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasMT: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);
        const mtCommand = groups.translation?.find((c) => c.id === 'mt-translate-language');

        expect(mtCommand?.shortcut).toBe('⌘M');
      });

      it('should have correct category for all translation commands', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasAI: true,
          hasMT: true,
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        groups.translation?.forEach((cmd) => {
          expect(cmd.category).toBe('translation');
        });
      });

      it('should have correct category for all approval commands', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          focusedLanguage: 'de',
          hasTranslations: true,
        });
        const handlers = createHandlers({
          getCurrentTranslationId: vi.fn().mockReturnValue('trans-1'),
        });

        const groups = getGroupedQuickActions(ctx, handlers);

        groups.approval?.forEach((cmd) => {
          expect(cmd.category).toBe('approval');
        });
      });

      it('should have correct category for all navigation commands', () => {
        const ctx = createContext({
          selectedKeyId: 'key-1',
          expandedLanguages: new Set(['de']),
        });
        const handlers = createHandlers();

        const groups = getGroupedQuickActions(ctx, handlers);

        groups.navigation?.forEach((cmd) => {
          expect(cmd.category).toBe('navigation');
        });
      });

      it('should have correct category for all utility commands', () => {
        const ctx = createContext({ selectedKeyId: 'key-1' });
        const handlers = createHandlers({
          getKeyName: vi.fn().mockReturnValue('key-name'),
        });

        const groups = getGroupedQuickActions(ctx, handlers);

        groups.utility?.forEach((cmd) => {
          expect(cmd.category).toBe('utility');
        });
      });
    });
  });
});
