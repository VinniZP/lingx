import { useKeySelection } from '@/app/workbench/[projectId]/[branchId]/_hooks/use-key-selection';
import type { TranslationKey } from '@/lib/api';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// Mock translation keys
const createMockKey = (id: string): TranslationKey => ({
  id,
  name: `key-${id}`,
  namespace: null,
  description: null,
  branchId: 'branch-1',
  translations: [],
  tags: [],
});

const mockKeys: TranslationKey[] = [createMockKey('1'), createMockKey('2'), createMockKey('3')];

describe('useKeySelection', () => {
  describe('initial state', () => {
    it('should start with no selected keys', () => {
      const { result } = renderHook(() => useKeySelection({ keys: mockKeys }));

      expect(result.current.selectedKeys.size).toBe(0);
      expect(result.current.hasSelection).toBe(false);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('handleSelectionChange', () => {
    it('should add key to selection when selected=true', () => {
      const { result } = renderHook(() => useKeySelection({ keys: mockKeys }));

      act(() => {
        result.current.handleSelectionChange('1', true);
      });

      expect(result.current.selectedKeys.has('1')).toBe(true);
      expect(result.current.selectedKeys.size).toBe(1);
      expect(result.current.hasSelection).toBe(true);
    });

    it('should remove key from selection when selected=false', () => {
      const { result } = renderHook(() => useKeySelection({ keys: mockKeys }));

      act(() => {
        result.current.handleSelectionChange('1', true);
        result.current.handleSelectionChange('2', true);
      });

      expect(result.current.selectedKeys.size).toBe(2);

      act(() => {
        result.current.handleSelectionChange('1', false);
      });

      expect(result.current.selectedKeys.has('1')).toBe(false);
      expect(result.current.selectedKeys.has('2')).toBe(true);
      expect(result.current.selectedKeys.size).toBe(1);
    });

    it('should handle adding same key twice (idempotent)', () => {
      const { result } = renderHook(() => useKeySelection({ keys: mockKeys }));

      act(() => {
        result.current.handleSelectionChange('1', true);
        result.current.handleSelectionChange('1', true);
      });

      expect(result.current.selectedKeys.size).toBe(1);
    });
  });

  describe('handleSelectAll', () => {
    it('should select all keys when checked=true', () => {
      const { result } = renderHook(() => useKeySelection({ keys: mockKeys }));

      act(() => {
        result.current.handleSelectAll(true);
      });

      expect(result.current.selectedKeys.size).toBe(3);
      expect(result.current.isAllSelected).toBe(true);
      mockKeys.forEach((key) => {
        expect(result.current.selectedKeys.has(key.id)).toBe(true);
      });
    });

    it('should deselect all keys when checked=false', () => {
      const { result } = renderHook(() => useKeySelection({ keys: mockKeys }));

      act(() => {
        result.current.handleSelectAll(true);
      });

      expect(result.current.selectedKeys.size).toBe(3);

      act(() => {
        result.current.handleSelectAll(false);
      });

      expect(result.current.selectedKeys.size).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected keys', () => {
      const { result } = renderHook(() => useKeySelection({ keys: mockKeys }));

      act(() => {
        result.current.handleSelectionChange('1', true);
        result.current.handleSelectionChange('2', true);
      });

      expect(result.current.selectedKeys.size).toBe(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedKeys.size).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('isAllSelected', () => {
    it('should be true only when all keys are selected', () => {
      const { result } = renderHook(() => useKeySelection({ keys: mockKeys }));

      expect(result.current.isAllSelected).toBe(false);

      act(() => {
        result.current.handleSelectionChange('1', true);
        result.current.handleSelectionChange('2', true);
      });

      expect(result.current.isAllSelected).toBe(false);

      act(() => {
        result.current.handleSelectionChange('3', true);
      });

      expect(result.current.isAllSelected).toBe(true);
    });

    it('should be false with empty keys array', () => {
      const { result } = renderHook(() => useKeySelection({ keys: [] }));

      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('selection persistence across filter changes', () => {
    it('should maintain selection when keys prop changes', () => {
      const { result, rerender } = renderHook(({ keys }) => useKeySelection({ keys }), {
        initialProps: { keys: mockKeys },
      });

      act(() => {
        result.current.handleSelectionChange('1', true);
        result.current.handleSelectionChange('2', true);
      });

      // Simulate filter change (keys prop changes)
      const filteredKeys = [mockKeys[0], mockKeys[2]]; // keys 1 and 3
      rerender({ keys: filteredKeys });

      // Selection state should persist
      expect(result.current.selectedKeys.has('1')).toBe(true);
      expect(result.current.selectedKeys.has('2')).toBe(true);
      expect(result.current.selectedKeys.size).toBe(2);
    });
  });
});
