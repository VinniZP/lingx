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

describe('useKeyboardNavigation - Command Palette Integration', () => {
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

  describe('Cmd/Ctrl+K - Command Palette Toggle', () => {
    it('should call onOpenCommandPalette when pressing Cmd+K', () => {
      const onOpenCommandPalette = vi.fn();

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            onOpenCommandPalette,
            commandPaletteOpen: false,
          })
        )
      );

      act(() => {
        simulateKeyDown('k', { metaKey: true });
      });

      expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });

    it('should call onOpenCommandPalette when pressing Ctrl+K', () => {
      const onOpenCommandPalette = vi.fn();

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            onOpenCommandPalette,
            commandPaletteOpen: false,
          })
        )
      );

      act(() => {
        simulateKeyDown('k', { ctrlKey: true });
      });

      expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });

    it('should call onOpenCommandPalette even when command palette is already open (toggle behavior)', () => {
      const onOpenCommandPalette = vi.fn();

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            onOpenCommandPalette,
            commandPaletteOpen: true,
          })
        )
      );

      act(() => {
        simulateKeyDown('k', { metaKey: true });
      });

      expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior when Cmd+K is pressed', () => {
      const onOpenCommandPalette = vi.fn();

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            onOpenCommandPalette,
            commandPaletteOpen: false,
          })
        )
      );

      const event = simulateKeyDown('k', { metaKey: true });

      expect(event.defaultPrevented).toBe(true);
    });

    it('should not call onOpenCommandPalette when disabled', () => {
      const onOpenCommandPalette = vi.fn();

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            onOpenCommandPalette,
            commandPaletteOpen: false,
            enabled: false,
          })
        )
      );

      act(() => {
        simulateKeyDown('k', { metaKey: true });
      });

      expect(onOpenCommandPalette).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard handling when command palette is open', () => {
    it('should skip other keyboard handlers when command palette is open', () => {
      const onSelectKey = vi.fn();
      const onOpenCommandPalette = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-1',
            onSelectKey,
            onOpenCommandPalette,
            commandPaletteOpen: true, // Palette is open
          })
        )
      );

      // Try to navigate with Cmd+Down - should be ignored
      act(() => {
        simulateKeyDown('ArrowDown', { metaKey: true });
      });

      expect(onSelectKey).not.toHaveBeenCalled();
    });

    it('should still allow Cmd+K to toggle palette closed', () => {
      const onOpenCommandPalette = vi.fn();

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            onOpenCommandPalette,
            commandPaletteOpen: true, // Palette is open
          })
        )
      );

      act(() => {
        simulateKeyDown('k', { metaKey: true });
      });

      // Should still call toggle even when open
      expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });

    it('should ignore Escape when command palette is open (palette handles its own Escape)', () => {
      const onCollapseAllLanguages = vi.fn();

      renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            onCollapseAllLanguages,
            commandPaletteOpen: true,
            selectedKeyId: 'key-1',
            expandedLanguages: new Set(['de', 'fr']),
          })
        )
      );

      act(() => {
        simulateKeyDown('Escape');
      });

      // Should not collapse languages - palette handles Escape
      expect(onCollapseAllLanguages).not.toHaveBeenCalled();
    });
  });

  describe('focusKeyById imperative method', () => {
    it('should focus key when given valid keyId', () => {
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
        result.current.focusKeyById('key-2');
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-2');
    });

    it('should not call onSelectKey for non-existent keyId', () => {
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
        result.current.focusKeyById('non-existent-key');
      });

      expect(onSelectKey).not.toHaveBeenCalled();
    });

    it('should scroll element into view when focusKeyById is called', () => {
      const onSelectKey = vi.fn();
      const scrollIntoViewMock = vi.fn();
      const mockElement = { scrollIntoView: scrollIntoViewMock } as unknown as Element;

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

      // Mock the container ref querySelector
      const querySelectorMock = vi.fn().mockReturnValue(mockElement);
      Object.defineProperty(result.current.keyListContainerRef, 'current', {
        value: { querySelector: querySelectorMock },
        writable: true,
      });

      act(() => {
        result.current.focusKeyById('key-3');
      });

      // key-3 is at index 2
      expect(querySelectorMock).toHaveBeenCalledWith('[data-key-index="2"]');
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        block: 'nearest',
        behavior: 'smooth',
      });
    });

    it('should set focus mode to source after focusing a key by id', () => {
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
        result.current.focusKeyById('key-1');
        vi.advanceTimersByTime(100);
      });

      expect(result.current.focusMode).toBe('source');
    });
  });

  describe('navigateKey imperative method', () => {
    it('should navigate to next key when direction is down', () => {
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
            selectedKeyId: 'key-1',
            onSelectKey,
          })
        )
      );

      act(() => {
        result.current.navigateKey('down');
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-2');
    });

    it('should navigate to previous key when direction is up', () => {
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
            selectedKeyId: 'key-2',
            onSelectKey,
          })
        )
      );

      act(() => {
        result.current.navigateKey('up');
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-1');
    });

    it('should not navigate past first key when direction is up', () => {
      const onSelectKey = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-1',
            onSelectKey,
            page: 1,
            totalPages: 1,
          })
        )
      );

      act(() => {
        result.current.navigateKey('up');
      });

      // Should not navigate since we're at first key on first page
      expect(onSelectKey).not.toHaveBeenCalled();
    });

    it('should not navigate past last key when direction is down', () => {
      const onSelectKey = vi.fn();
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useKeyboardNavigation(
          createDefaultOptions({
            keys,
            selectedKeyId: 'key-2',
            onSelectKey,
            page: 1,
            totalPages: 1,
          })
        )
      );

      act(() => {
        result.current.navigateKey('down');
      });

      // Should not navigate since we're at last key on last page
      expect(onSelectKey).not.toHaveBeenCalled();
    });

    it('should select first key when navigating down with no selection', () => {
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
        result.current.navigateKey('down');
      });

      expect(onSelectKey).toHaveBeenCalledWith('key-1');
    });
  });
});
