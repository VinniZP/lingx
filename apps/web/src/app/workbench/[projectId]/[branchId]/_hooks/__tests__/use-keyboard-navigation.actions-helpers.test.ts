import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardNavigation } from '../use-keyboard-navigation';

/**
 * Unit tests for useKeyboardNavigation hook
 * Tests quick action handlers (Ctrl+Enter, Ctrl+Backspace, Ctrl+M, Ctrl+I) and helper functions
 */

// Mock data
const createMockKey = (id: string, name: string): TranslationKey => ({
  id,
  name,
  namespace: null,
  branchId: 'branch-1',
  translations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createMockLanguage = (code: string, name: string, isDefault = false): ProjectLanguage => ({
  id: `lang-${code}`,
  code,
  name,
  isDefault,
});

const mockKeys = [
  createMockKey('key-1', 'common.greeting'),
  createMockKey('key-2', 'common.farewell'),
  createMockKey('key-3', 'common.thanks'),
];

const mockLanguages = [
  createMockLanguage('en', 'English', true),
  createMockLanguage('de', 'German'),
  createMockLanguage('fr', 'French'),
];

const defaultLanguage = mockLanguages[0];

// Default options for the hook
const createDefaultOptions = (overrides = {}) => ({
  keys: mockKeys,
  selectedKeyId: 'key-1',
  onSelectKey: vi.fn(),
  page: 1,
  totalPages: 3,
  onPageChange: vi.fn(),
  languages: mockLanguages,
  defaultLanguage,
  expandedLanguages: new Set<string>(),
  onExpandLanguage: vi.fn(),
  onCollapseAllLanguages: vi.fn(),
  onApprove: vi.fn(),
  getCurrentTranslationId: vi.fn(),
  getSuggestionCount: vi.fn().mockReturnValue(0),
  onApplySuggestion: vi.fn(),
  onFetchMT: vi.fn(),
  onFetchAI: vi.fn(),
  hasMT: true,
  hasAI: true,
  enabled: true,
  ...overrides,
});

// Helper to dispatch keyboard events
const dispatchKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
};

describe('useKeyboardNavigation', () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    cleanup = () => {};
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Quick Actions', () => {
    describe('Ctrl+Enter (Approve)', () => {
      it('should call onApprove with translation id and APPROVED status when in language mode', async () => {
        const onApprove = vi.fn();
        const getCurrentTranslationId = vi.fn().mockReturnValue('trans-123');

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove,
              getCurrentTranslationId,
            })
          )
        );

        // Set focus to language mode
        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        // Dispatch Ctrl+Enter
        act(() => {
          dispatchKeyboardEvent('Enter', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(getCurrentTranslationId).toHaveBeenCalledWith('de');
          expect(onApprove).toHaveBeenCalledWith('trans-123', 'APPROVED');
        });
      });

      it('should call onApprove with Cmd+Enter on Mac', async () => {
        const onApprove = vi.fn();
        const getCurrentTranslationId = vi.fn().mockReturnValue('trans-456');

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove,
              getCurrentTranslationId,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('fr');
        });

        act(() => {
          dispatchKeyboardEvent('Enter', { metaKey: true });
        });

        await waitFor(() => {
          expect(onApprove).toHaveBeenCalledWith('trans-456', 'APPROVED');
        });
      });

      it('should not call onApprove when not in language mode', async () => {
        const onApprove = vi.fn();
        const getCurrentTranslationId = vi.fn().mockReturnValue('trans-123');

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove,
              getCurrentTranslationId,
            })
          )
        );

        // Focus mode is 'keys' by default
        expect(result.current.focusMode).toBe('keys');

        act(() => {
          dispatchKeyboardEvent('Enter', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onApprove).not.toHaveBeenCalled();
        });
      });

      it('should not call onApprove when in source mode', async () => {
        const onApprove = vi.fn();
        const getCurrentTranslationId = vi.fn().mockReturnValue('trans-123');

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove,
              getCurrentTranslationId,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('source');
        });

        act(() => {
          dispatchKeyboardEvent('Enter', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onApprove).not.toHaveBeenCalled();
        });
      });

      it('should not call onApprove when getCurrentTranslationId returns undefined', async () => {
        const onApprove = vi.fn();
        const getCurrentTranslationId = vi.fn().mockReturnValue(undefined);

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove,
              getCurrentTranslationId,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('Enter', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(getCurrentTranslationId).toHaveBeenCalledWith('de');
          expect(onApprove).not.toHaveBeenCalled();
        });
      });

      it('should not call onApprove when onApprove is not provided', async () => {
        const getCurrentTranslationId = vi.fn().mockReturnValue('trans-123');

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove: undefined,
              getCurrentTranslationId,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('Enter', { ctrlKey: true });
        });

        // Should not throw, just do nothing
        await waitFor(() => {
          expect(getCurrentTranslationId).not.toHaveBeenCalled();
        });
      });
    });

    describe('Ctrl+Backspace (Reject)', () => {
      it('should call onApprove with translation id and REJECTED status when in language mode', async () => {
        const onApprove = vi.fn();
        const getCurrentTranslationId = vi.fn().mockReturnValue('trans-123');

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove,
              getCurrentTranslationId,
            })
          )
        );

        // Set focus to language mode
        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        // Dispatch Ctrl+Backspace
        act(() => {
          dispatchKeyboardEvent('Backspace', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(getCurrentTranslationId).toHaveBeenCalledWith('de');
          expect(onApprove).toHaveBeenCalledWith('trans-123', 'REJECTED');
        });
      });

      it('should call onApprove with REJECTED via Cmd+Backspace on Mac', async () => {
        const onApprove = vi.fn();
        const getCurrentTranslationId = vi.fn().mockReturnValue('trans-456');

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove,
              getCurrentTranslationId,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('fr');
        });

        act(() => {
          dispatchKeyboardEvent('Backspace', { metaKey: true });
        });

        await waitFor(() => {
          expect(onApprove).toHaveBeenCalledWith('trans-456', 'REJECTED');
        });
      });

      it('should not call reject when not in language mode', async () => {
        const onApprove = vi.fn();
        const getCurrentTranslationId = vi.fn().mockReturnValue('trans-123');

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onApprove,
              getCurrentTranslationId,
            })
          )
        );

        // Focus mode is 'keys' by default
        expect(result.current.focusMode).toBe('keys');

        act(() => {
          dispatchKeyboardEvent('Backspace', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onApprove).not.toHaveBeenCalled();
        });
      });
    });

    describe('Ctrl+M (Machine Translation)', () => {
      it('should call onFetchMT with focused language when in language mode', async () => {
        const onFetchMT = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchMT,
              hasMT: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('m', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchMT).toHaveBeenCalledWith('de');
        });
      });

      it('should call onFetchMT with Cmd+M on Mac', async () => {
        const onFetchMT = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchMT,
              hasMT: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('fr');
        });

        act(() => {
          dispatchKeyboardEvent('m', { metaKey: true });
        });

        await waitFor(() => {
          expect(onFetchMT).toHaveBeenCalledWith('fr');
        });
      });

      it('should not call onFetchMT when hasMT is false', async () => {
        const onFetchMT = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchMT,
              hasMT: false,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('m', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchMT).not.toHaveBeenCalled();
        });
      });

      it('should not call onFetchMT when not in language mode', async () => {
        const onFetchMT = vi.fn();

        renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchMT,
              hasMT: true,
            })
          )
        );

        // Focus mode is 'keys' by default
        act(() => {
          dispatchKeyboardEvent('m', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchMT).not.toHaveBeenCalled();
        });
      });

      it('should not call onFetchMT when in source mode', async () => {
        const onFetchMT = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchMT,
              hasMT: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('source');
        });

        act(() => {
          dispatchKeyboardEvent('m', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchMT).not.toHaveBeenCalled();
        });
      });

      it('should not call onFetchMT when onFetchMT is not provided', async () => {
        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchMT: undefined,
              hasMT: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('m', { ctrlKey: true });
        });

        // Should not throw
        expect(true).toBe(true);
      });
    });

    describe('Ctrl+I (AI Translation)', () => {
      it('should call onFetchAI with focused language when in language mode', async () => {
        const onFetchAI = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchAI,
              hasAI: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('i', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchAI).toHaveBeenCalledWith('de');
        });
      });

      it('should call onFetchAI with Cmd+I on Mac', async () => {
        const onFetchAI = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchAI,
              hasAI: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('fr');
        });

        act(() => {
          dispatchKeyboardEvent('i', { metaKey: true });
        });

        await waitFor(() => {
          expect(onFetchAI).toHaveBeenCalledWith('fr');
        });
      });

      it('should not call onFetchAI when hasAI is false', async () => {
        const onFetchAI = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchAI,
              hasAI: false,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('i', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchAI).not.toHaveBeenCalled();
        });
      });

      it('should not call onFetchAI when not in language mode', async () => {
        const onFetchAI = vi.fn();

        renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchAI,
              hasAI: true,
            })
          )
        );

        // Focus mode is 'keys' by default
        act(() => {
          dispatchKeyboardEvent('i', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchAI).not.toHaveBeenCalled();
        });
      });

      it('should not call onFetchAI when in source mode', async () => {
        const onFetchAI = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchAI,
              hasAI: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('source');
        });

        act(() => {
          dispatchKeyboardEvent('i', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchAI).not.toHaveBeenCalled();
        });
      });

      it('should not call onFetchAI when in suggestion mode', async () => {
        const onFetchAI = vi.fn();

        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchAI,
              hasAI: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('suggestion');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('i', { ctrlKey: true });
        });

        await waitFor(() => {
          expect(onFetchAI).not.toHaveBeenCalled();
        });
      });

      it('should not call onFetchAI when onFetchAI is not provided', async () => {
        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              onFetchAI: undefined,
              hasAI: true,
            })
          )
        );

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        act(() => {
          dispatchKeyboardEvent('i', { ctrlKey: true });
        });

        // Should not throw
        expect(true).toBe(true);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('isKeyFocused', () => {
      it('should return true when index matches focusedKeyIndex', () => {
        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              selectedKeyId: 'key-1', // First key, index 0
            })
          )
        );

        expect(result.current.isKeyFocused(0)).toBe(true);
        expect(result.current.isKeyFocused(1)).toBe(false);
        expect(result.current.isKeyFocused(2)).toBe(false);
      });

      it('should return false for all indices when no key is selected', () => {
        const { result } = renderHook(() =>
          useKeyboardNavigation(
            createDefaultOptions({
              selectedKeyId: null,
            })
          )
        );

        expect(result.current.isKeyFocused(0)).toBe(false);
        expect(result.current.isKeyFocused(1)).toBe(false);
        expect(result.current.isKeyFocused(2)).toBe(false);
      });

      it('should update when selectedKeyId changes', () => {
        const { result, rerender } = renderHook((props) => useKeyboardNavigation(props), {
          initialProps: createDefaultOptions({ selectedKeyId: 'key-1' }),
        });

        expect(result.current.isKeyFocused(0)).toBe(true);
        expect(result.current.isKeyFocused(1)).toBe(false);

        rerender(createDefaultOptions({ selectedKeyId: 'key-2' }));

        expect(result.current.isKeyFocused(0)).toBe(false);
        expect(result.current.isKeyFocused(1)).toBe(true);
      });
    });

    describe('isLanguageFocused', () => {
      it('should return true when lang matches and focusMode is language', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        expect(result.current.isLanguageFocused('de')).toBe(true);
        expect(result.current.isLanguageFocused('fr')).toBe(false);
        expect(result.current.isLanguageFocused('en')).toBe(false);
      });

      it('should return true when lang matches and focusMode is suggestion', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('suggestion');
          result.current.setFocusedLanguage('fr');
        });

        expect(result.current.isLanguageFocused('fr')).toBe(true);
        expect(result.current.isLanguageFocused('de')).toBe(false);
      });

      it('should return false when focusMode is keys', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusedLanguage('de');
          // focusMode remains 'keys'
        });

        expect(result.current.isLanguageFocused('de')).toBe(false);
      });

      it('should return false when focusMode is source', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('source');
          result.current.setFocusedLanguage('de');
        });

        expect(result.current.isLanguageFocused('de')).toBe(false);
      });

      it('should return false when lang does not match', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage('de');
        });

        expect(result.current.isLanguageFocused('fr')).toBe(false);
        expect(result.current.isLanguageFocused('en')).toBe(false);
      });

      it('should return false when focusedLanguage is null', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedLanguage(null);
        });

        expect(result.current.isLanguageFocused('de')).toBe(false);
        expect(result.current.isLanguageFocused('fr')).toBe(false);
      });
    });

    describe('isSuggestionFocused', () => {
      it('should return true when in suggestion mode and index matches', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('suggestion');
          result.current.setFocusedSuggestionIndex(2);
        });

        expect(result.current.isSuggestionFocused(2)).toBe(true);
        expect(result.current.isSuggestionFocused(0)).toBe(false);
        expect(result.current.isSuggestionFocused(1)).toBe(false);
      });

      it('should return false when not in suggestion mode', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('language');
          result.current.setFocusedSuggestionIndex(2);
        });

        expect(result.current.isSuggestionFocused(2)).toBe(false);
      });

      it('should return false when in keys mode', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusedSuggestionIndex(0);
          // focusMode remains 'keys'
        });

        expect(result.current.isSuggestionFocused(0)).toBe(false);
      });

      it('should return false when focusedSuggestionIndex is null', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('suggestion');
          result.current.setFocusedSuggestionIndex(null);
        });

        expect(result.current.isSuggestionFocused(0)).toBe(false);
        expect(result.current.isSuggestionFocused(1)).toBe(false);
      });

      it('should return false when index does not match', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('suggestion');
          result.current.setFocusedSuggestionIndex(1);
        });

        expect(result.current.isSuggestionFocused(0)).toBe(false);
        expect(result.current.isSuggestionFocused(2)).toBe(false);
        expect(result.current.isSuggestionFocused(3)).toBe(false);
      });
    });

    describe('registerLanguageTextarea', () => {
      it('should add ref to the map when ref is provided', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        const mockTextarea = document.createElement('textarea') as HTMLTextAreaElement;

        act(() => {
          result.current.registerLanguageTextarea('de', mockTextarea);
        });

        expect(result.current.languageTextareaRefs.current.get('de')).toBe(mockTextarea);
      });

      it('should remove ref from the map when ref is null', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        const mockTextarea = document.createElement('textarea') as HTMLTextAreaElement;

        // First add the ref
        act(() => {
          result.current.registerLanguageTextarea('de', mockTextarea);
        });

        expect(result.current.languageTextareaRefs.current.has('de')).toBe(true);

        // Then remove it
        act(() => {
          result.current.registerLanguageTextarea('de', null);
        });

        expect(result.current.languageTextareaRefs.current.has('de')).toBe(false);
      });

      it('should handle multiple languages independently', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        const mockTextareaDe = document.createElement('textarea') as HTMLTextAreaElement;
        const mockTextareaFr = document.createElement('textarea') as HTMLTextAreaElement;

        act(() => {
          result.current.registerLanguageTextarea('de', mockTextareaDe);
          result.current.registerLanguageTextarea('fr', mockTextareaFr);
        });

        expect(result.current.languageTextareaRefs.current.get('de')).toBe(mockTextareaDe);
        expect(result.current.languageTextareaRefs.current.get('fr')).toBe(mockTextareaFr);

        // Remove only one
        act(() => {
          result.current.registerLanguageTextarea('de', null);
        });

        expect(result.current.languageTextareaRefs.current.has('de')).toBe(false);
        expect(result.current.languageTextareaRefs.current.get('fr')).toBe(mockTextareaFr);
      });

      it('should update existing ref when called with same language', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        const mockTextarea1 = document.createElement('textarea') as HTMLTextAreaElement;
        const mockTextarea2 = document.createElement('textarea') as HTMLTextAreaElement;

        act(() => {
          result.current.registerLanguageTextarea('de', mockTextarea1);
        });

        expect(result.current.languageTextareaRefs.current.get('de')).toBe(mockTextarea1);

        act(() => {
          result.current.registerLanguageTextarea('de', mockTextarea2);
        });

        expect(result.current.languageTextareaRefs.current.get('de')).toBe(mockTextarea2);
      });
    });
  });
});
