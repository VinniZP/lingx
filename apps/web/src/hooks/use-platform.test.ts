import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for usePlatform hook
 * Tests platform detection, SSR safety, caching, and return values
 */
describe('usePlatform', () => {
  // Store original navigator
  let originalNavigator: Navigator;

  // Helper to create mock navigator
  const createMockNavigator = (options: {
    userAgent?: string;
    userAgentData?: { platform: string };
  }) => {
    const { userAgent = '', userAgentData } = options;

    return {
      ...window.navigator,
      userAgent,
      ...(userAgentData && { userAgentData }),
    } as Navigator;
  };

  beforeEach(async () => {
    // Store original navigator
    originalNavigator = window.navigator;

    // Reset module cache to clear the cachedIsMac
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('macOS detection', () => {
    it('should return isMac: true when userAgent contains "Mac"', async () => {
      // Setup macOS userAgent
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        }),
        writable: true,
        configurable: true,
      });

      // Import fresh module
      const { usePlatform } = await import('./use-platform');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.isMac).toBe(true);
    });

    it('should return isMac: true when userAgentData.platform is "macOS"', async () => {
      // Setup modern userAgentData
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: '',
          userAgentData: { platform: 'macOS' },
        }),
        writable: true,
        configurable: true,
      });

      // Import fresh module
      const { usePlatform } = await import('./use-platform');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.isMac).toBe(true);
    });

    it('should return correct modifier key for Mac', async () => {
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        }),
        writable: true,
        configurable: true,
      });

      const { usePlatform } = await import('./use-platform');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.modKey).toBe('⌘');
      expect(result.current.modKeyName).toBe('Command');
    });

    it('should detect iPhone/iPad/iPod as Mac-like', async () => {
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
        }),
        writable: true,
        configurable: true,
      });

      const { usePlatform } = await import('./use-platform');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.isMac).toBe(true);
    });
  });

  describe('Windows/Linux detection', () => {
    it('should return isMac: false on Windows', async () => {
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        }),
        writable: true,
        configurable: true,
      });

      const { usePlatform } = await import('./use-platform');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.isMac).toBe(false);
    });

    it('should return isMac: false on Linux', async () => {
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        }),
        writable: true,
        configurable: true,
      });

      const { usePlatform } = await import('./use-platform');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.isMac).toBe(false);
    });

    it('should return correct modifier key for Windows/Linux', async () => {
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        }),
        writable: true,
        configurable: true,
      });

      const { usePlatform } = await import('./use-platform');
      const { result } = renderHook(() => usePlatform());

      expect(result.current.modKey).toBe('Ctrl');
      expect(result.current.modKeyName).toBe('Control');
    });
  });

  describe('SSR safety', () => {
    it('should return isMac: false when navigator is undefined (SSR)', async () => {
      // Temporarily remove navigator
      const navDescriptor = Object.getOwnPropertyDescriptor(window, 'navigator');
      // @ts-expect-error - intentionally setting to undefined for SSR test
      delete window.navigator;

      try {
        const { usePlatform } = await import('./use-platform');
        const { result } = renderHook(() => usePlatform());

        // Server snapshot returns false
        expect(result.current.isMac).toBe(false);
        expect(result.current.modKey).toBe('Ctrl');
        expect(result.current.modKeyName).toBe('Control');
      } finally {
        // Restore navigator
        if (navDescriptor) {
          Object.defineProperty(window, 'navigator', navDescriptor);
        }
      }
    });
  });

  describe('Return type', () => {
    it('should return a PlatformInfo object with all required properties', async () => {
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        }),
        writable: true,
        configurable: true,
      });

      const { usePlatform } = await import('./use-platform');
      const { result } = renderHook(() => usePlatform());

      expect(result.current).toHaveProperty('isMac');
      expect(result.current).toHaveProperty('modKey');
      expect(result.current).toHaveProperty('modKeyName');
      expect(typeof result.current.isMac).toBe('boolean');
      expect(['⌘', 'Ctrl']).toContain(result.current.modKey);
      expect(['Command', 'Control']).toContain(result.current.modKeyName);
    });
  });

  describe('Caching behavior', () => {
    it('should cache the result after first detection', async () => {
      // First setup: Windows
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        }),
        writable: true,
        configurable: true,
      });

      const { usePlatform } = await import('./use-platform');
      const { result: result1 } = renderHook(() => usePlatform());

      expect(result1.current.isMac).toBe(false);

      // The cache is module-level, so changing navigator won't affect it
      // until the module is re-imported
      Object.defineProperty(window, 'navigator', {
        value: createMockNavigator({
          userAgent: 'Mozilla/5.0 (Macintosh)',
        }),
        writable: true,
        configurable: true,
      });

      // Same hook instance will still use cached value
      const { result: result2 } = renderHook(() => usePlatform());
      expect(result2.current.isMac).toBe(false); // Still false due to cache
    });
  });
});
