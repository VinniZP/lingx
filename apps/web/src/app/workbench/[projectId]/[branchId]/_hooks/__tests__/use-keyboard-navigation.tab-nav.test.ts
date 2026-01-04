import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardNavigation } from '../use-keyboard-navigation';

/**
 * Unit tests for Tab/Shift+Tab language field navigation in useKeyboardNavigation hook.
 *
 * Tests the Tab cycle: source -> target languages in order -> wrap to source
 * Tests auto-expansion of collapsed language rows
 * Tests focus management for textarea refs
 */

// Helper to create mock ProjectLanguage
const createLanguage = (code: string, name: string, isDefault = false): ProjectLanguage => ({
  id: `lang-${code}`,
  code,
  name,
  isDefault,
});

// Helper to create mock TranslationKey
const createKey = (id: string, name: string): TranslationKey => ({
  id,
  name,
  namespace: null,
  branchId: 'branch-1',
  translations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('useKeyboardNavigation - Tab/Shift+Tab Navigation', () => {
  // Default test configuration
  const defaultLanguage = createLanguage('en', 'English', true);
  const targetLanguages: ProjectLanguage[] = [
    createLanguage('de', 'German'),
    createLanguage('fr', 'French'),
    createLanguage('es', 'Spanish'),
  ];
  const allLanguages = [defaultLanguage, ...targetLanguages];

  const mockKeys = [createKey('key-1', 'test.key.one'), createKey('key-2', 'test.key.two')];

  // Mocks
  let onSelectKey: ReturnType<typeof vi.fn>;
  let onPageChange: ReturnType<typeof vi.fn>;
  let onExpandLanguage: ReturnType<typeof vi.fn>;
  let onCollapseAllLanguages: ReturnType<typeof vi.fn>;

  // Mock refs
  let mockSourceTextarea: HTMLTextAreaElement;
  let mockLanguageTextareas: Map<string, HTMLTextAreaElement>;

  beforeEach(() => {
    // Reset mocks
    onSelectKey = vi.fn();
    onPageChange = vi.fn();
    onExpandLanguage = vi.fn();
    onCollapseAllLanguages = vi.fn();

    // Create mock textareas
    mockSourceTextarea = document.createElement('textarea');
    mockSourceTextarea.focus = vi.fn();

    mockLanguageTextareas = new Map();
    targetLanguages.forEach((lang) => {
      const textarea = document.createElement('textarea');
      textarea.focus = vi.fn();
      mockLanguageTextareas.set(lang.code, textarea);
    });

    // Mock requestAnimationFrame to execute callback immediately
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(performance.now());
      return 0;
    });

    // Use fake timers for setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Helper to create default hook options
  const createHookOptions = (
    overrides: Partial<Parameters<typeof useKeyboardNavigation>[0]> = {}
  ) => ({
    keys: mockKeys,
    selectedKeyId: 'key-1',
    onSelectKey,
    page: 1,
    totalPages: 1,
    onPageChange,
    languages: allLanguages,
    defaultLanguage,
    expandedLanguages: new Set<string>(),
    onExpandLanguage,
    onCollapseAllLanguages,
    enabled: true,
    ...overrides,
  });

  // Helper to dispatch keyboard event
  const dispatchTabKey = (shiftKey = false, target?: HTMLElement) => {
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey,
      bubbles: true,
      cancelable: true,
    });

    // Set target property for input detection
    if (target) {
      Object.defineProperty(event, 'target', { value: target, writable: false });
    }

    window.dispatchEvent(event);
  };

  describe('Tab forward navigation', () => {
    it('Tab from source moves to first target language', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // Register language textareas
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      // Set hook refs
      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus source first
      act(() => {
        result.current.focusSource();
      });

      expect(result.current.focusMode).toBe('source');

      // Press Tab from source textarea context
      act(() => {
        dispatchTabKey(false, mockSourceTextarea);
      });

      // Should move to first target language (German)
      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedLanguage).toBe('de');
      expect(mockLanguageTextareas.get('de')?.focus).toHaveBeenCalled();
    });

    it('Tab moves through languages in order (de -> fr -> es)', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // Register language textareas
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      // Focus first target language
      act(() => {
        result.current.focusLanguage('de');
      });

      expect(result.current.focusedLanguage).toBe('de');
      expect(result.current.focusMode).toBe('language');

      // Tab to next language (French)
      act(() => {
        dispatchTabKey(false, mockLanguageTextareas.get('de')!);
      });

      expect(result.current.focusedLanguage).toBe('fr');
      expect(result.current.focusMode).toBe('language');

      // Tab to next language (Spanish)
      act(() => {
        dispatchTabKey(false, mockLanguageTextareas.get('fr')!);
      });

      expect(result.current.focusedLanguage).toBe('es');
      expect(result.current.focusMode).toBe('language');
    });

    it('Tab from last language wraps to source', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // Register refs
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus last target language
      act(() => {
        result.current.focusLanguage('es');
      });

      expect(result.current.focusedLanguage).toBe('es');
      expect(result.current.focusMode).toBe('language');

      // Tab should wrap to source
      act(() => {
        dispatchTabKey(false, mockLanguageTextareas.get('es')!);
      });

      expect(result.current.focusMode).toBe('source');
      expect(result.current.focusedLanguage).toBeNull();
    });
  });

  describe('Shift+Tab backward navigation', () => {
    it('Shift+Tab moves backwards through languages', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // Register language textareas
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      // Focus Spanish (last target language)
      act(() => {
        result.current.focusLanguage('es');
      });

      // Shift+Tab to French
      act(() => {
        dispatchTabKey(true, mockLanguageTextareas.get('es')!);
      });

      expect(result.current.focusedLanguage).toBe('fr');

      // Shift+Tab to German
      act(() => {
        dispatchTabKey(true, mockLanguageTextareas.get('fr')!);
      });

      expect(result.current.focusedLanguage).toBe('de');
    });

    it('Shift+Tab from first target language moves to source', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // Register refs
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus first target language (German)
      act(() => {
        result.current.focusLanguage('de');
      });

      expect(result.current.focusedLanguage).toBe('de');
      expect(result.current.focusMode).toBe('language');

      // Shift+Tab should go to source
      act(() => {
        dispatchTabKey(true, mockLanguageTextareas.get('de')!);
      });

      expect(result.current.focusMode).toBe('source');
      expect(result.current.focusedLanguage).toBeNull();
    });

    it('Shift+Tab from source wraps to last language', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // Register refs
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus source
      act(() => {
        result.current.focusSource();
      });

      expect(result.current.focusMode).toBe('source');

      // Shift+Tab should wrap to last language (Spanish)
      act(() => {
        dispatchTabKey(true, mockSourceTextarea);
      });

      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedLanguage).toBe('es');
    });
  });

  describe('Auto-expand collapsed rows', () => {
    it('Tab auto-expands collapsed language rows and calls onExpandLanguage', () => {
      // Start with no expanded languages
      const expandedLanguages = new Set<string>();

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createHookOptions({
            expandedLanguages,
          })
        )
      );

      // Register refs
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus source
      act(() => {
        result.current.focusSource();
      });

      // Tab to first target (German) - should trigger expand
      act(() => {
        dispatchTabKey(false, mockSourceTextarea);
      });

      // onExpandLanguage should be called for 'de'
      expect(onExpandLanguage).toHaveBeenCalledWith('de', true);
      expect(result.current.focusedLanguage).toBe('de');
    });

    it('Tab does not call onExpandLanguage if language already expanded', () => {
      // Start with German already expanded
      const expandedLanguages = new Set<string>(['de']);

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createHookOptions({
            expandedLanguages,
          })
        )
      );

      // Register refs
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus source
      act(() => {
        result.current.focusSource();
      });

      // Tab to first target (German) - should NOT trigger expand
      act(() => {
        dispatchTabKey(false, mockSourceTextarea);
      });

      // onExpandLanguage should NOT be called
      expect(onExpandLanguage).not.toHaveBeenCalled();
      expect(result.current.focusedLanguage).toBe('de');
    });
  });

  describe('Textarea focus management', () => {
    it('Tab sets focusedLanguage correctly through navigation', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // Register language textareas
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus source
      act(() => {
        result.current.focusSource();
      });

      expect(result.current.focusMode).toBe('source');

      // Tab to German
      act(() => {
        dispatchTabKey(false, mockSourceTextarea);
      });

      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedLanguage).toBe('de');

      // Tab to French
      act(() => {
        dispatchTabKey(false, mockLanguageTextareas.get('de')!);
      });

      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedLanguage).toBe('fr');
    });

    it('registerLanguageTextarea correctly tracks refs', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      const testTextarea = document.createElement('textarea');
      testTextarea.focus = vi.fn();

      // Register a new language textarea
      act(() => {
        result.current.registerLanguageTextarea('ja', testTextarea);
      });

      // The ref should be stored in languageTextareaRefs
      expect(result.current.languageTextareaRefs.current.get('ja')).toBe(testTextarea);

      // Unregister by passing null
      act(() => {
        result.current.registerLanguageTextarea('ja', null);
      });

      expect(result.current.languageTextareaRefs.current.get('ja')).toBeUndefined();
    });
  });

  describe('Source field position in Tab cycle', () => {
    it('Source field is first in the Tab cycle (before target languages)', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // Register refs
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus source
      act(() => {
        result.current.focusSource();
      });

      expect(result.current.focusMode).toBe('source');

      // Full Tab cycle: source -> de -> fr -> es -> source
      const expectedOrder = ['de', 'fr', 'es', null]; // null = back to source
      const expectedModes: Array<'source' | 'language'> = [
        'language',
        'language',
        'language',
        'source',
      ];

      let currentTarget: HTMLElement = mockSourceTextarea;

      expectedOrder.forEach((expectedLang, index) => {
        act(() => {
          dispatchTabKey(false, currentTarget);
        });

        if (expectedLang === null) {
          expect(result.current.focusMode).toBe('source');
          expect(result.current.focusedLanguage).toBeNull();
        } else {
          expect(result.current.focusMode).toBe(expectedModes[index]);
          expect(result.current.focusedLanguage).toBe(expectedLang);
          currentTarget = mockLanguageTextareas.get(expectedLang)!;
        }
      });
    });

    it('orderedLanguageCodes places source language first', () => {
      // This test verifies the internal order by checking navigation behavior
      const { result } = renderHook(() => useKeyboardNavigation(createHookOptions()));

      // When navigating backward from first target, should go to source
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus first target language
      act(() => {
        result.current.focusLanguage('de');
      });

      // Shift+Tab should go to source (not wrap to last)
      act(() => {
        dispatchTabKey(true, mockLanguageTextareas.get('de')!);
      });

      expect(result.current.focusMode).toBe('source');
      expect(result.current.focusedLanguage).toBeNull();
    });
  });

  describe('No key selected', () => {
    it('Tab does nothing when no key is selected', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createHookOptions({
            selectedKeyId: null,
          })
        )
      );

      // Register refs
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      const initialFocusMode = result.current.focusMode;
      const initialFocusedLanguage = result.current.focusedLanguage;

      // Press Tab
      act(() => {
        dispatchTabKey(false, mockSourceTextarea);
      });

      // State should remain unchanged
      expect(result.current.focusMode).toBe(initialFocusMode);
      expect(result.current.focusedLanguage).toBe(initialFocusedLanguage);
    });
  });

  describe('Empty languages array', () => {
    it('Tab navigation works with only source language', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createHookOptions({
            languages: [defaultLanguage],
          })
        )
      );

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Focus source
      act(() => {
        result.current.focusSource();
      });

      expect(result.current.focusMode).toBe('source');

      // Tab should wrap back to source (no targets to navigate to)
      act(() => {
        dispatchTabKey(false, mockSourceTextarea);
      });

      expect(result.current.focusMode).toBe('source');
    });
  });

  describe('Hook disabled state', () => {
    it('Tab navigation does not work when enabled is false', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createHookOptions({
            enabled: false,
          })
        )
      );

      // Register refs
      act(() => {
        targetLanguages.forEach((lang) => {
          result.current.registerLanguageTextarea(lang.code, mockLanguageTextareas.get(lang.code)!);
        });
      });

      (result.current.sourceTextareaRef as { current: HTMLTextAreaElement | null }).current =
        mockSourceTextarea;

      // Manually set focus mode to source (simulating UI interaction)
      act(() => {
        result.current.setFocusMode('source');
      });

      const initialState = result.current.focusMode;

      // Press Tab - should not trigger navigation because hook is disabled
      act(() => {
        dispatchTabKey(false, mockSourceTextarea);
      });

      // Focus mode should remain unchanged
      expect(result.current.focusMode).toBe(initialState);
    });
  });
});
