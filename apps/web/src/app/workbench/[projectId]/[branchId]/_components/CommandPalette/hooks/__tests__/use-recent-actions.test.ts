import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecentActions } from '../use-recent-actions';

describe('useRecentActions', () => {
  // Store original localStorage
  let originalLocalStorage: Storage;
  let mockLocalStorage: Record<string, string>;

  // Create mock localStorage
  const createMockLocalStorage = () => {
    mockLocalStorage = {};
    return {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    };
  };

  beforeEach(() => {
    // Store original
    originalLocalStorage = window.localStorage;

    // Setup mock localStorage
    const mock = createMockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mock,
      writable: true,
      configurable: true,
    });

    // Mock Date.now for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1704067200000); // Jan 1, 2024
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });

    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty array when no data in localStorage', () => {
      const { result } = renderHook(() => useRecentActions('project-1'));

      expect(result.current.recentActions).toEqual([]);
    });

    it('should load existing actions from localStorage', () => {
      const existingActions = [
        {
          id: 'action-1',
          commandId: 'navigate-to-key',
          keyId: 'key-1',
          keyName: 'greeting',
          timestamp: 1704067100000,
        },
      ];
      mockLocalStorage['workbench-recent-actions-project-1'] = JSON.stringify(existingActions);

      const { result } = renderHook(() => useRecentActions('project-1'));

      expect(result.current.recentActions).toEqual(existingActions);
    });

    it('should use project-specific storage key', () => {
      const actionsProject1 = [
        { id: 'a1', commandId: 'cmd1', keyId: 'k1', keyName: 'key1', timestamp: 1000 },
      ];
      const actionsProject2 = [
        { id: 'a2', commandId: 'cmd2', keyId: 'k2', keyName: 'key2', timestamp: 2000 },
      ];
      mockLocalStorage['workbench-recent-actions-project-1'] = JSON.stringify(actionsProject1);
      mockLocalStorage['workbench-recent-actions-project-2'] = JSON.stringify(actionsProject2);

      const { result: result1 } = renderHook(() => useRecentActions('project-1'));
      const { result: result2 } = renderHook(() => useRecentActions('project-2'));

      expect(result1.current.recentActions[0].keyId).toBe('k1');
      expect(result2.current.recentActions[0].keyId).toBe('k2');
    });
  });

  describe('addRecentAction', () => {
    it('should add new action to the beginning of the list', () => {
      const { result } = renderHook(() => useRecentActions('project-1'));

      act(() => {
        result.current.addRecentAction({
          commandId: 'navigate-to-key',
          keyId: 'key-1',
          keyName: 'greeting',
        });
      });

      expect(result.current.recentActions).toHaveLength(1);
      expect(result.current.recentActions[0].keyId).toBe('key-1');
      expect(result.current.recentActions[0].keyName).toBe('greeting');
      expect(result.current.recentActions[0].commandId).toBe('navigate-to-key');
      expect(result.current.recentActions[0].timestamp).toBe(1704067200000);
    });

    it('should generate unique id for each action', () => {
      const { result } = renderHook(() => useRecentActions('project-1'));

      act(() => {
        result.current.addRecentAction({
          commandId: 'navigate-to-key',
          keyId: 'key-1',
          keyName: 'greeting',
        });
      });

      expect(result.current.recentActions[0].id).toContain('navigate-to-key-key-1-');
    });

    it('should remove duplicate command+key combinations', () => {
      const { result } = renderHook(() => useRecentActions('project-1'));

      act(() => {
        result.current.addRecentAction({
          commandId: 'navigate-to-key',
          keyId: 'key-1',
          keyName: 'greeting',
        });
      });

      // Advance time
      vi.spyOn(Date, 'now').mockReturnValue(1704067300000);

      act(() => {
        result.current.addRecentAction({
          commandId: 'navigate-to-key',
          keyId: 'key-1',
          keyName: 'greeting', // Same command and key
        });
      });

      // Should only have one entry (duplicates removed)
      expect(result.current.recentActions).toHaveLength(1);
      // Should have the newer timestamp
      expect(result.current.recentActions[0].timestamp).toBe(1704067300000);
    });

    it('should limit to MAX_RECENT_ACTIONS (5)', () => {
      const { result } = renderHook(() => useRecentActions('project-1'));

      // Add 6 actions
      for (let i = 1; i <= 6; i++) {
        vi.spyOn(Date, 'now').mockReturnValue(1704067200000 + i * 1000);
        act(() => {
          result.current.addRecentAction({
            commandId: 'navigate-to-key',
            keyId: `key-${i}`,
            keyName: `key${i}`,
          });
        });
      }

      // Should only keep 5 most recent
      expect(result.current.recentActions).toHaveLength(5);
      // Most recent should be first
      expect(result.current.recentActions[0].keyId).toBe('key-6');
      // Oldest (key-1) should have been removed
      expect(result.current.recentActions.find((a) => a.keyId === 'key-1')).toBeUndefined();
    });

    it('should persist to localStorage', () => {
      const { result } = renderHook(() => useRecentActions('project-1'));

      act(() => {
        result.current.addRecentAction({
          commandId: 'navigate-to-key',
          keyId: 'key-1',
          keyName: 'greeting',
        });
      });

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'workbench-recent-actions-project-1',
        expect.any(String)
      );
    });

    it('should include optional language field', () => {
      const { result } = renderHook(() => useRecentActions('project-1'));

      act(() => {
        result.current.addRecentAction({
          commandId: 'translate-key',
          keyId: 'key-1',
          keyName: 'greeting',
          language: 'de',
        });
      });

      expect(result.current.recentActions[0].language).toBe('de');
    });
  });

  describe('edge cases', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['workbench-recent-actions-project-1'] = 'invalid-json{';

      // Should not throw, returns empty array (default from useLocalStorage)
      const { result } = renderHook(() => useRecentActions('project-1'));

      expect(result.current.recentActions).toEqual([]);
    });

    it('should handle project id with special characters', () => {
      const { result } = renderHook(() => useRecentActions('project-with-special_chars.123'));

      act(() => {
        result.current.addRecentAction({
          commandId: 'cmd',
          keyId: 'key-1',
          keyName: 'key1',
        });
      });

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'workbench-recent-actions-project-with-special_chars.123',
        expect.any(String)
      );
    });
  });
});
