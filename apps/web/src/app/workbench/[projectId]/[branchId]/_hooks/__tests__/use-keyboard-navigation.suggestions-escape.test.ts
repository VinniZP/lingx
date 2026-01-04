/**
 * useKeyboardNavigation - Suggestion Navigation and Escape Behavior Tests
 *
 * Tests for:
 * - Suggestion navigation with ArrowDown/ArrowUp
 * - Entering/exiting suggestion mode
 * - Applying suggestions with Enter
 * - isSuggestionFocused helper
 * - Progressive Escape behavior
 */

import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardNavigation } from '../use-keyboard-navigation';

// ============================================
// Test Data Factories
// ============================================

function createMockKey(id: string, name: string): TranslationKey {
  return {
    id,
    name,
    namespace: null,
    description: null,
    branchId: 'branch-1',
    translations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createMockLanguage(code: string, name: string, isDefault = false): ProjectLanguage {
  return {
    id: `lang-${code}`,
    code,
    name,
    isDefault,
  };
}

// ============================================
// Mock Setup
// ============================================

interface MockOptions {
  keys?: TranslationKey[];
  selectedKeyId?: string | null;
  languages?: ProjectLanguage[];
  expandedLanguages?: Set<string>;
  getSuggestionCount?: (lang: string) => number;
  onApplySuggestion?: (lang: string, index: number) => void;
  onCollapseAllLanguages?: () => void;
  onSelectKey?: (keyId: string | null) => void;
  onExpandLanguage?: (lang: string, expanded: boolean) => void;
  enabled?: boolean;
}

function createDefaultMocks() {
  return {
    keys: [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')],
    selectedKeyId: 'key-1',
    languages: [
      createMockLanguage('en', 'English', true),
      createMockLanguage('de', 'German'),
      createMockLanguage('fr', 'French'),
    ],
    expandedLanguages: new Set<string>(),
    page: 1,
    totalPages: 1,
    onPageChange: vi.fn(),
    onSelectKey: vi.fn(),
    onExpandLanguage: vi.fn(),
    onCollapseAllLanguages: vi.fn(),
    getSuggestionCount: vi.fn().mockReturnValue(3),
    onApplySuggestion: vi.fn(),
    enabled: true,
  };
}

function renderKeyboardNavigation(options: MockOptions = {}) {
  const mocks = createDefaultMocks();
  const merged = { ...mocks, ...options };

  // Default language is the one with isDefault: true
  const defaultLanguage = merged.languages.find((l) => l.isDefault) ?? merged.languages[0];

  return {
    ...renderHook(() =>
      useKeyboardNavigation({
        ...merged,
        defaultLanguage,
      })
    ),
    mocks: merged,
  };
}

// ============================================
// Helper: Simulate KeyboardEvent
// ============================================

function createKeyboardEvent(
  key: string,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    target?: Partial<HTMLElement>;
  } = {}
): KeyboardEvent {
  const target = options.target ?? { tagName: 'DIV' };
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
  });

  // Override readonly target property
  Object.defineProperty(event, 'target', {
    value: target,
    writable: false,
  });

  return event;
}

function dispatchKeyEvent(key: string, options = {}) {
  const event = createKeyboardEvent(key, options);
  window.dispatchEvent(event);
}

// ============================================
// SUGGESTION NAVIGATION TESTS
// ============================================

describe('useKeyboardNavigation - Suggestion Navigation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Entering suggestion mode', () => {
    it('ArrowDown in language mode with suggestions enters suggestion mode', () => {
      const { result, mocks } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      // First, set focus to language mode
      act(() => {
        result.current.setFocusMode('language');
        result.current.setFocusedLanguage('de');
      });

      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedLanguage).toBe('de');
      expect(result.current.focusedSuggestionIndex).toBeNull();

      // Simulate ArrowDown from a textarea at end of content with no selection
      act(() => {
        const event = createKeyboardEvent('ArrowDown', {
          target: {
            tagName: 'TEXTAREA',
            selectionStart: 0,
            selectionEnd: 0, // No text selected
            value: '',
          } as unknown as HTMLElement,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusMode).toBe('suggestion');
      expect(result.current.focusedSuggestionIndex).toBe(0);
      expect(mocks.getSuggestionCount).toHaveBeenCalledWith('de');
    });

    it('ArrowDown does NOT enter suggestion mode when no suggestions available', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(0),
      });

      // Set focus to language mode
      act(() => {
        result.current.setFocusMode('language');
        result.current.setFocusedLanguage('de');
      });

      // Simulate ArrowDown from a textarea at end with no selection
      act(() => {
        const event = createKeyboardEvent('ArrowDown', {
          target: {
            tagName: 'TEXTAREA',
            selectionStart: 0,
            selectionEnd: 0,
            value: '',
          } as unknown as HTMLElement,
        });
        window.dispatchEvent(event);
      });

      // Should stay in language mode since no suggestions
      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedSuggestionIndex).toBeNull();
    });

    it('ArrowDown does NOT enter suggestion mode when text is selected', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      // Set focus to language mode
      act(() => {
        result.current.setFocusMode('language');
        result.current.setFocusedLanguage('de');
      });

      // Simulate ArrowDown from a textarea with selected text (cursor at end but text selected)
      act(() => {
        const event = createKeyboardEvent('ArrowDown', {
          target: {
            tagName: 'TEXTAREA',
            selectionStart: 5, // Selection starts at position 5
            selectionEnd: 11, // Selection ends at position 11 (text is selected)
            value: 'Hello World',
          } as unknown as HTMLElement,
        });
        window.dispatchEvent(event);
      });

      // Should stay in language mode - user might be extending selection
      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedSuggestionIndex).toBeNull();
    });

    it('ArrowDown does NOT enter suggestion mode when cursor is not at end', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      // Set focus to language mode
      act(() => {
        result.current.setFocusMode('language');
        result.current.setFocusedLanguage('de');
      });

      // Simulate ArrowDown from a textarea with cursor in the middle
      act(() => {
        const event = createKeyboardEvent('ArrowDown', {
          target: {
            tagName: 'TEXTAREA',
            selectionStart: 5,
            selectionEnd: 5, // No selection, but not at end
            value: 'Hello World',
          } as unknown as HTMLElement,
        });
        window.dispatchEvent(event);
      });

      // Should stay in language mode - cursor not at end
      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedSuggestionIndex).toBeNull();
    });
  });

  describe('Navigating within suggestions', () => {
    it('ArrowDown increments focusedSuggestionIndex', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      // Enter suggestion mode at index 0
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(0);
      });

      expect(result.current.focusedSuggestionIndex).toBe(0);

      // Navigate down
      act(() => {
        dispatchKeyEvent('ArrowDown');
      });

      expect(result.current.focusedSuggestionIndex).toBe(1);

      // Navigate down again
      act(() => {
        dispatchKeyEvent('ArrowDown');
      });

      expect(result.current.focusedSuggestionIndex).toBe(2);
    });

    it('ArrowUp decrements focusedSuggestionIndex', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      // Enter suggestion mode at index 2
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(2);
      });

      expect(result.current.focusedSuggestionIndex).toBe(2);

      // Navigate up
      act(() => {
        dispatchKeyEvent('ArrowUp');
      });

      expect(result.current.focusedSuggestionIndex).toBe(1);

      // Navigate up again
      act(() => {
        dispatchKeyEvent('ArrowUp');
      });

      expect(result.current.focusedSuggestionIndex).toBe(0);
    });

    it('Navigation stops at max boundary (does not exceed suggestion count)', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3), // max index is 2
      });

      // Start at last suggestion
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(2);
      });

      // Try to go beyond
      act(() => {
        dispatchKeyEvent('ArrowDown');
      });

      // Should stay at 2 (max)
      expect(result.current.focusedSuggestionIndex).toBe(2);
    });

    it('Navigation stops at min boundary (0) and exits on further ArrowUp', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      // Start at first suggestion
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(0);
      });

      // ArrowUp at 0 should exit suggestion mode
      act(() => {
        dispatchKeyEvent('ArrowUp');
      });

      // Should return to language mode
      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedSuggestionIndex).toBeNull();
      expect(result.current.focusedLanguage).toBe('de');
    });
  });

  describe('Applying suggestions', () => {
    it('Enter on focused suggestion calls onApplySuggestion with correct args', () => {
      const onApplySuggestion = vi.fn();
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
        onApplySuggestion,
      });

      // Enter suggestion mode
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(1);
      });

      // Press Enter
      act(() => {
        dispatchKeyEvent('Enter');
      });

      expect(onApplySuggestion).toHaveBeenCalledTimes(1);
      expect(onApplySuggestion).toHaveBeenCalledWith('de', 1);

      // Should return to language mode after applying
      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedSuggestionIndex).toBeNull();
    });

    it('Enter with different suggestion index calls onApplySuggestion correctly', () => {
      const onApplySuggestion = vi.fn();
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(5),
        onApplySuggestion,
      });

      // Enter suggestion mode at index 4
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('fr');
        result.current.setFocusedSuggestionIndex(4);
      });

      // Press Enter
      act(() => {
        dispatchKeyEvent('Enter');
      });

      expect(onApplySuggestion).toHaveBeenCalledWith('fr', 4);
    });
  });

  describe('isSuggestionFocused helper', () => {
    it('returns true for the currently focused suggestion index in suggestion mode', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(1);
      });

      expect(result.current.isSuggestionFocused(0)).toBe(false);
      expect(result.current.isSuggestionFocused(1)).toBe(true);
      expect(result.current.isSuggestionFocused(2)).toBe(false);
    });

    it('returns false for all indices when not in suggestion mode', () => {
      const { result } = renderKeyboardNavigation();

      act(() => {
        result.current.setFocusMode('language');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(1); // Even with index set
      });

      // Not in suggestion mode, so all should be false
      expect(result.current.isSuggestionFocused(0)).toBe(false);
      expect(result.current.isSuggestionFocused(1)).toBe(false);
      expect(result.current.isSuggestionFocused(2)).toBe(false);
    });

    it('returns false when focusedSuggestionIndex is null', () => {
      const { result } = renderKeyboardNavigation();

      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedSuggestionIndex(null);
      });

      expect(result.current.isSuggestionFocused(0)).toBe(false);
      expect(result.current.isSuggestionFocused(1)).toBe(false);
    });
  });
});

// ============================================
// ESCAPE BEHAVIOR TESTS (Progressive)
// ============================================

describe('useKeyboardNavigation - Escape Behavior (Progressive)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Escape from suggestion mode', () => {
    it('Escape from suggestion mode returns to language mode', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      // Enter suggestion mode
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(1);
      });

      expect(result.current.focusMode).toBe('suggestion');
      expect(result.current.focusedSuggestionIndex).toBe(1);

      // Press Escape
      act(() => {
        dispatchKeyEvent('Escape');
      });

      // Should return to language mode
      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedSuggestionIndex).toBeNull();
      expect(result.current.focusedLanguage).toBe('de'); // Language preserved
    });

    it('Escape from suggestion mode preserves the focused language', () => {
      const { result } = renderKeyboardNavigation({
        getSuggestionCount: vi.fn().mockReturnValue(3),
      });

      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('fr');
        result.current.setFocusedSuggestionIndex(2);
      });

      act(() => {
        dispatchKeyEvent('Escape');
      });

      expect(result.current.focusedLanguage).toBe('fr');
      expect(result.current.focusMode).toBe('language');
    });
  });

  describe('Escape from language mode with expanded rows', () => {
    it('Escape from language mode with expanded rows collapses all', () => {
      const onCollapseAllLanguages = vi.fn();
      const { result } = renderKeyboardNavigation({
        expandedLanguages: new Set(['de', 'fr']),
        onCollapseAllLanguages,
      });

      // Set language mode
      act(() => {
        result.current.setFocusMode('language');
        result.current.setFocusedLanguage('de');
      });

      expect(result.current.focusMode).toBe('language');

      // Press Escape
      act(() => {
        dispatchKeyEvent('Escape');
      });

      // Should call onCollapseAllLanguages
      expect(onCollapseAllLanguages).toHaveBeenCalledTimes(1);
      // Should move to keys mode
      expect(result.current.focusMode).toBe('keys');
      expect(result.current.focusedLanguage).toBeNull();
    });

    it('Escape from source mode with expanded rows also collapses all', () => {
      const onCollapseAllLanguages = vi.fn();
      const { result } = renderKeyboardNavigation({
        expandedLanguages: new Set(['de']),
        onCollapseAllLanguages,
      });

      // Set source mode
      act(() => {
        result.current.setFocusMode('source');
        result.current.setFocusedLanguage(null);
      });

      // Press Escape
      act(() => {
        dispatchKeyEvent('Escape');
      });

      expect(onCollapseAllLanguages).toHaveBeenCalledTimes(1);
      expect(result.current.focusMode).toBe('keys');
    });
  });

  describe('Escape from language mode with no expanded rows', () => {
    it('Escape from language mode with no expanded rows deselects key', () => {
      const onSelectKey = vi.fn();
      const { result } = renderKeyboardNavigation({
        selectedKeyId: 'key-1',
        expandedLanguages: new Set(), // Empty - no expanded rows
        onSelectKey,
      });

      // Set language mode
      act(() => {
        result.current.setFocusMode('language');
        result.current.setFocusedLanguage('de');
      });

      // Press Escape
      act(() => {
        dispatchKeyEvent('Escape');
      });

      // Should call onSelectKey(null) to deselect
      expect(onSelectKey).toHaveBeenCalledTimes(1);
      expect(onSelectKey).toHaveBeenCalledWith(null);
      expect(result.current.focusMode).toBe('keys');
    });

    it('Escape when no key is selected does nothing', () => {
      const onSelectKey = vi.fn();
      const onCollapseAllLanguages = vi.fn();
      const { result } = renderKeyboardNavigation({
        selectedKeyId: null,
        expandedLanguages: new Set(),
        onSelectKey,
        onCollapseAllLanguages,
      });

      // Set keys mode (no key selected)
      act(() => {
        result.current.setFocusMode('keys');
      });

      // Press Escape
      act(() => {
        dispatchKeyEvent('Escape');
      });

      // Nothing should happen
      expect(onSelectKey).not.toHaveBeenCalled();
      expect(onCollapseAllLanguages).not.toHaveBeenCalled();
    });
  });

  describe('Escape from keys mode', () => {
    it('Escape from keys mode with selected key deselects it when no expanded rows', () => {
      const onSelectKey = vi.fn();
      const { result } = renderKeyboardNavigation({
        selectedKeyId: 'key-1',
        expandedLanguages: new Set(),
        onSelectKey,
      });

      act(() => {
        result.current.setFocusMode('keys');
      });

      act(() => {
        dispatchKeyEvent('Escape');
      });

      // Should deselect the key since no expanded rows
      expect(onSelectKey).toHaveBeenCalledWith(null);
    });

    it('Escape from keys mode without selected key does nothing', () => {
      const onSelectKey = vi.fn();
      const onCollapseAllLanguages = vi.fn();
      const { result } = renderKeyboardNavigation({
        selectedKeyId: null,
        expandedLanguages: new Set(),
        onSelectKey,
        onCollapseAllLanguages,
      });

      act(() => {
        result.current.setFocusMode('keys');
      });

      act(() => {
        dispatchKeyEvent('Escape');
      });

      // Nothing should happen - no key to deselect, no rows to collapse
      expect(onSelectKey).not.toHaveBeenCalled();
      expect(onCollapseAllLanguages).not.toHaveBeenCalled();
    });
  });

  describe('Progressive escape sequence', () => {
    it('Full escape sequence: suggestion -> language -> collapse -> deselect', () => {
      const onCollapseAllLanguages = vi.fn();
      const onSelectKey = vi.fn();

      // Start with expanded rows and selected key
      const expandedLanguages = new Set(['de']);

      const { result, rerender } = renderHook(
        ({ expanded }) =>
          useKeyboardNavigation({
            keys: [createMockKey('key-1', 'greeting')],
            selectedKeyId: 'key-1',
            languages: [
              createMockLanguage('en', 'English', true),
              createMockLanguage('de', 'German'),
            ],
            defaultLanguage: createMockLanguage('en', 'English', true),
            expandedLanguages: expanded,
            page: 1,
            totalPages: 1,
            onPageChange: vi.fn(),
            onSelectKey,
            onExpandLanguage: vi.fn(),
            onCollapseAllLanguages,
            getSuggestionCount: vi.fn().mockReturnValue(3),
            onApplySuggestion: vi.fn(),
            enabled: true,
          }),
        { initialProps: { expanded: expandedLanguages } }
      );

      // 1. Start in suggestion mode
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(1);
      });

      expect(result.current.focusMode).toBe('suggestion');

      // 2. First Escape -> language mode
      act(() => {
        dispatchKeyEvent('Escape');
      });

      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedSuggestionIndex).toBeNull();

      // 3. Second Escape -> collapse rows (since we have expanded)
      act(() => {
        dispatchKeyEvent('Escape');
      });

      expect(onCollapseAllLanguages).toHaveBeenCalledTimes(1);
      expect(result.current.focusMode).toBe('keys');

      // 4. Simulate that rows are now collapsed by rerendering with empty expanded set
      rerender({ expanded: new Set() });

      // 5. Third Escape -> deselect key
      act(() => {
        dispatchKeyEvent('Escape');
      });

      expect(onSelectKey).toHaveBeenCalledWith(null);
    });
  });
});
