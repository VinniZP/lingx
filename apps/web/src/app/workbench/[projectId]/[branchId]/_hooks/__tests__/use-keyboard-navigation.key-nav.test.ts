import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardNavigation } from '../use-keyboard-navigation';

// Helper to create mock TranslationKey
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

// Helper to create mock ProjectLanguage
function createMockLanguage(code: string, name: string, isDefault = false): ProjectLanguage {
  return {
    id: `lang-${code}`,
    code,
    name,
    isDefault,
  };
}

// Default mock options for the hook
function createDefaultOptions(
  overrides: Partial<Parameters<typeof useKeyboardNavigation>[0]> = {}
) {
  return {
    keys: [
      createMockKey('key-1', 'greeting'),
      createMockKey('key-2', 'farewell'),
      createMockKey('key-3', 'welcome'),
    ],
    selectedKeyId: null,
    onSelectKey: vi.fn(),
    page: 1,
    totalPages: 3,
    onPageChange: vi.fn(),
    languages: [
      createMockLanguage('en', 'English', true),
      createMockLanguage('de', 'German'),
      createMockLanguage('fr', 'French'),
    ],
    defaultLanguage: createMockLanguage('en', 'English', true),
    expandedLanguages: new Set<string>(),
    onExpandLanguage: vi.fn(),
    onCollapseAllLanguages: vi.fn(),
    enabled: true,
    ...overrides,
  };
}

// Helper to simulate keyboard events
function simulateKeyDown(key: string, options: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
  return event;
}

describe('useKeyboardNavigation - Key Navigation (Ctrl+Up/Down)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Ctrl+ArrowUp navigation', () => {
    it('should call onSelectKey with previous key id when pressing Ctrl+ArrowUp', () => {
      const onSelectKey = vi.fn();
      const keys = [
        createMockKey('key-1', 'greeting'),
        createMockKey('key-2', 'farewell'),
        createMockKey('key-3', 'welcome'),
      ];

      renderHook((props) => useKeyboardNavigation(props), {
        initialProps: createDefaultOptions({
          keys,
          selectedKeyId: 'key-2', // Start at second key (index 1)
          onSelectKey,
        }),
      });

      act(() => {
        simulateKeyDown('ArrowUp', { ctrlKey: true });
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-1');
    });

    it('should call onSelectKey with previous key id when pressing Cmd+ArrowUp on Mac', () => {
      const onSelectKey = vi.fn();
      const keys = [
        createMockKey('key-1', 'greeting'),
        createMockKey('key-2', 'farewell'),
        createMockKey('key-3', 'welcome'),
      ];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-2', // Start at second key (index 1)
            onSelectKey,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowUp', { metaKey: true });
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-1');
    });

    it('should navigate through multiple keys with successive Ctrl+ArrowUp', () => {
      const onSelectKey = vi.fn();
      const keys = [
        createMockKey('key-1', 'greeting'),
        createMockKey('key-2', 'farewell'),
        createMockKey('key-3', 'welcome'),
      ];

      const { rerender } = renderHook((props) => useKeyboardNavigation(props), {
        initialProps: createDefaultOptions({
          keys,
          selectedKeyId: 'key-3', // Start at last key (index 2)
          onSelectKey,
        }),
      });

      // First navigation: key-3 -> key-2
      act(() => {
        simulateKeyDown('ArrowUp', { ctrlKey: true });
      });
      expect(onSelectKey).toHaveBeenCalledWith('key-2');

      // Simulate state update
      rerender(
        createDefaultOptions({
          keys,
          selectedKeyId: 'key-2',
          onSelectKey,
        })
      );

      // Second navigation: key-2 -> key-1
      act(() => {
        simulateKeyDown('ArrowUp', { ctrlKey: true });
      });
      expect(onSelectKey).toHaveBeenCalledWith('key-1');
    });
  });

  describe('Ctrl+ArrowDown navigation', () => {
    it('should call onSelectKey with next key id when pressing Ctrl+ArrowDown', () => {
      const onSelectKey = vi.fn();
      const keys = [
        createMockKey('key-1', 'greeting'),
        createMockKey('key-2', 'farewell'),
        createMockKey('key-3', 'welcome'),
      ];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-1', // Start at first key (index 0)
            onSelectKey,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowDown', { ctrlKey: true });
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-2');
    });

    it('should call onSelectKey with next key id when pressing Cmd+ArrowDown on Mac', () => {
      const onSelectKey = vi.fn();
      const keys = [
        createMockKey('key-1', 'greeting'),
        createMockKey('key-2', 'farewell'),
        createMockKey('key-3', 'welcome'),
      ];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-1',
            onSelectKey,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowDown', { metaKey: true });
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-2');
    });

    it('should navigate through multiple keys with successive Ctrl+ArrowDown', () => {
      const onSelectKey = vi.fn();
      const keys = [
        createMockKey('key-1', 'greeting'),
        createMockKey('key-2', 'farewell'),
        createMockKey('key-3', 'welcome'),
      ];

      const { rerender } = renderHook((props) => useKeyboardNavigation(props), {
        initialProps: createDefaultOptions({
          keys,
          selectedKeyId: 'key-1', // Start at first key
          onSelectKey,
        }),
      });

      // First navigation: key-1 -> key-2
      act(() => {
        simulateKeyDown('ArrowDown', { ctrlKey: true });
      });
      expect(onSelectKey).toHaveBeenCalledWith('key-2');

      // Simulate state update
      rerender(
        createDefaultOptions({
          keys,
          selectedKeyId: 'key-2',
          onSelectKey,
        })
      );

      // Second navigation: key-2 -> key-3
      act(() => {
        simulateKeyDown('ArrowDown', { ctrlKey: true });
      });
      expect(onSelectKey).toHaveBeenCalledWith('key-3');
    });
  });

  describe('Page boundary navigation', () => {
    it('should trigger page change to previous page when at first key and pressing Ctrl+ArrowUp', () => {
      const onSelectKey = vi.fn();
      const onPageChange = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-1', // First key on current page
            onSelectKey,
            page: 2, // Not first page
            totalPages: 3,
            onPageChange,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowUp', { ctrlKey: true });
      });

      expect(onPageChange).toHaveBeenCalledWith(1); // Go to previous page
      expect(onSelectKey).not.toHaveBeenCalled(); // Key selection happens after page loads
    });

    it('should trigger page change to next page when at last key and pressing Ctrl+ArrowDown', () => {
      const onSelectKey = vi.fn();
      const onPageChange = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-2', // Last key on current page
            onSelectKey,
            page: 2, // Not last page
            totalPages: 3,
            onPageChange,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowDown', { ctrlKey: true });
      });

      expect(onPageChange).toHaveBeenCalledWith(3); // Go to next page
      expect(onSelectKey).not.toHaveBeenCalled(); // Key selection happens after page loads
    });

    it('should NOT trigger page change when at first key on first page', () => {
      const onSelectKey = vi.fn();
      const onPageChange = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-1', // First key
            onSelectKey,
            page: 1, // First page
            totalPages: 3,
            onPageChange,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowUp', { ctrlKey: true });
      });

      expect(onPageChange).not.toHaveBeenCalled();
      expect(onSelectKey).not.toHaveBeenCalled();
    });

    it('should NOT trigger page change when at last key on last page', () => {
      const onSelectKey = vi.fn();
      const onPageChange = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-2', // Last key
            onSelectKey,
            page: 3, // Last page
            totalPages: 3,
            onPageChange,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowDown', { ctrlKey: true });
      });

      expect(onPageChange).not.toHaveBeenCalled();
      expect(onSelectKey).not.toHaveBeenCalled();
    });
  });

  describe('Pending navigation after page change', () => {
    it('should select first key after page change from previous page (navigating down)', async () => {
      const onSelectKey = vi.fn();
      const onPageChange = vi.fn();

      // Start with page 1 keys
      const page1Keys = [
        createMockKey('page1-key-1', 'first'),
        createMockKey('page1-key-2', 'second'),
      ];

      const { rerender } = renderHook((props) => useKeyboardNavigation(props), {
        initialProps: createDefaultOptions({
          keys: page1Keys,
          selectedKeyId: 'page1-key-2', // Last key on page 1
          onSelectKey,
          page: 1,
          totalPages: 2,
          onPageChange,
        }),
      });

      // Navigate down (will go to next page)
      act(() => {
        simulateKeyDown('ArrowDown', { ctrlKey: true });
      });

      expect(onPageChange).toHaveBeenCalledWith(2);

      // Simulate page 2 loading with new keys
      const page2Keys = [
        createMockKey('page2-key-1', 'third'),
        createMockKey('page2-key-2', 'fourth'),
      ];

      act(() => {
        rerender(
          createDefaultOptions({
            keys: page2Keys,
            selectedKeyId: null, // Selection cleared during page load
            onSelectKey,
            page: 2,
            totalPages: 2,
            onPageChange,
          })
        );
      });

      // After new keys load, first key should be selected
      expect(onSelectKey).toHaveBeenCalledWith('page2-key-1');
    });

    it('should select last key after page change from next page (navigating up)', async () => {
      const onSelectKey = vi.fn();
      const onPageChange = vi.fn();

      // Start with page 2 keys
      const page2Keys = [
        createMockKey('page2-key-1', 'third'),
        createMockKey('page2-key-2', 'fourth'),
      ];

      const { rerender } = renderHook((props) => useKeyboardNavigation(props), {
        initialProps: createDefaultOptions({
          keys: page2Keys,
          selectedKeyId: 'page2-key-1', // First key on page 2
          onSelectKey,
          page: 2,
          totalPages: 2,
          onPageChange,
        }),
      });

      // Navigate up (will go to previous page)
      act(() => {
        simulateKeyDown('ArrowUp', { ctrlKey: true });
      });

      expect(onPageChange).toHaveBeenCalledWith(1);

      // Simulate page 1 loading with new keys
      const page1Keys = [
        createMockKey('page1-key-1', 'first'),
        createMockKey('page1-key-2', 'second'),
      ];

      act(() => {
        rerender(
          createDefaultOptions({
            keys: page1Keys,
            selectedKeyId: null, // Selection cleared during page load
            onSelectKey,
            page: 1,
            totalPages: 2,
            onPageChange,
          })
        );
      });

      // After new keys load, last key should be selected
      expect(onSelectKey).toHaveBeenCalledWith('page1-key-2');
    });
  });

  describe('focusKey imperative method', () => {
    it('should call onSelectKey with the key id at the given index', () => {
      const onSelectKey = vi.fn();
      const keys = [
        createMockKey('key-1', 'greeting'),
        createMockKey('key-2', 'farewell'),
        createMockKey('key-3', 'welcome'),
      ];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: null,
            onSelectKey,
          })
        )
      );

      act(() => {
        result.current.focusKey(1);
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-2');
    });

    it('should scroll element into view when focusKey is called', () => {
      const onSelectKey = vi.fn();
      const scrollIntoViewMock = vi.fn();
      const mockElement = { scrollIntoView: scrollIntoViewMock } as unknown as Element;

      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: null,
            onSelectKey,
          })
        )
      );

      // Mock the container ref querySelector
      const querySelectorMock = vi.fn().mockReturnValue(mockElement);
      Object.defineProperty(result.current.keyListContainerRef, 'current', {
        value: { querySelector: querySelectorMock },
        writable: true,
      });

      act(() => {
        result.current.focusKey(1);
      });

      expect(querySelectorMock).toHaveBeenCalledWith('[data-key-index="1"]');
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        block: 'nearest',
        behavior: 'smooth',
      });
    });

    it('should not call onSelectKey for invalid index (negative)', () => {
      const onSelectKey = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: null,
            onSelectKey,
          })
        )
      );

      act(() => {
        result.current.focusKey(-1);
      });

      expect(onSelectKey).not.toHaveBeenCalled();
    });

    it('should not call onSelectKey for invalid index (out of bounds)', () => {
      const onSelectKey = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: null,
            onSelectKey,
          })
        )
      );

      act(() => {
        result.current.focusKey(10);
      });

      expect(onSelectKey).not.toHaveBeenCalled();
    });

    it('should set focus mode to source after focusing a key', () => {
      const onSelectKey = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: null,
            onSelectKey,
          })
        )
      );

      act(() => {
        result.current.focusKey(0);
        vi.advanceTimersByTime(100);
      });

      expect(result.current.focusMode).toBe('source');
    });
  });

  describe('Navigation with no key selected', () => {
    it('should select first key when pressing Ctrl+ArrowDown with no selection', () => {
      const onSelectKey = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: null, // No key selected
            onSelectKey,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowDown', { ctrlKey: true });
      });

      // With focusedKeyIndex = null, currentIndex = -1, so -1 + 1 = 0
      expect(onSelectKey).toHaveBeenCalledWith('key-1');
    });

    it('should not navigate when pressing Ctrl+ArrowUp with no selection', () => {
      const onSelectKey = vi.fn();
      const onPageChange = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: null, // No key selected
            onSelectKey,
            page: 1,
            totalPages: 1,
            onPageChange,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowUp', { ctrlKey: true });
      });

      // With focusedKeyIndex = null, currentIndex = -1, -1 > 0 is false
      // and page = 1 > 1 is false, so nothing happens
      expect(onSelectKey).not.toHaveBeenCalled();
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Navigation when disabled', () => {
    it('should not navigate when enabled is false', () => {
      const onSelectKey = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-1',
            onSelectKey,
            enabled: false,
          })
        )
      );

      act(() => {
        simulateKeyDown('ArrowDown', { ctrlKey: true });
      });

      expect(onSelectKey).not.toHaveBeenCalled();
    });
  });

  describe('focusedKeyIndex derived state', () => {
    it('should derive focusedKeyIndex from selectedKeyId', () => {
      const keys = [
        createMockKey('key-1', 'greeting'),
        createMockKey('key-2', 'farewell'),
        createMockKey('key-3', 'welcome'),
      ];

      const { result, rerender } = renderHook((props) => useKeyboardNavigation(props), {
        initialProps: createDefaultOptions({
          keys,
          selectedKeyId: 'key-2',
        }),
      });

      expect(result.current.focusedKeyIndex).toBe(1);

      // Change selected key
      rerender(
        createDefaultOptions({
          keys,
          selectedKeyId: 'key-3',
        })
      );

      expect(result.current.focusedKeyIndex).toBe(2);
    });

    it('should return null when selectedKeyId is null', () => {
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: null,
          })
        )
      );

      expect(result.current.focusedKeyIndex).toBeNull();
    });

    it('should return null when selectedKeyId does not match any key', () => {
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'non-existent-key',
          })
        )
      );

      expect(result.current.focusedKeyIndex).toBeNull();
    });
  });

  describe('isKeyFocused helper', () => {
    it('should return true when index matches focusedKeyIndex', () => {
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-2',
          })
        )
      );

      expect(result.current.isKeyFocused(1)).toBe(true);
      expect(result.current.isKeyFocused(0)).toBe(false);
    });
  });
});
