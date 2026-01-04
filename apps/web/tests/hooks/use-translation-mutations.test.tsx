import { useTranslationMutations } from '@/app/workbench/[projectId]/[branchId]/_hooks/use-translation-mutations';
import type { TranslationKey } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock translation API
const mockUpdateKeyTranslations = vi.fn();
const mockSetApprovalStatus = vi.fn();
const mockBatchApprove = vi.fn();
const mockBulkDeleteKeys = vi.fn();

vi.mock('@/lib/api', () => ({
  translationApi: {
    updateKeyTranslations: (...args: unknown[]) => mockUpdateKeyTranslations(...args),
    setApprovalStatus: (...args: unknown[]) => mockSetApprovalStatus(...args),
    batchApprove: (...args: unknown[]) => mockBatchApprove(...args),
    bulkDeleteKeys: (...args: unknown[]) => mockBulkDeleteKeys(...args),
  },
}));

// Mock ICU validation
const mockValidateICUSyntax = vi.fn();
vi.mock('@/lib/api/quality', () => ({
  validateICUSyntax: (...args: unknown[]) => mockValidateICUSyntax(...args),
}));

// Mock translations
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

// Mock translation key
const createMockKey = (id: string): TranslationKey => ({
  id,
  name: `key-${id}`,
  namespace: null,
  description: null,
  branchId: 'branch-1',
  translations: [
    { id: `trans-${id}-en`, language: 'en', value: 'Hello', status: 'PENDING' },
    { id: `trans-${id}-de`, language: 'de', value: 'Hallo', status: 'PENDING' },
  ],
  tags: [],
});

describe('useTranslationMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateKeyTranslations.mockResolvedValue({});
    mockValidateICUSyntax.mockResolvedValue({ valid: true });
    mockBatchApprove.mockResolvedValue({});
    mockBulkDeleteKeys.mockResolvedValue({ deleted: 1 });
    mockSetApprovalStatus.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('getTranslationValue', () => {
    it('should return original value when no edits', () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      const mockKey = createMockKey('1');
      const value = result.current.getTranslationValue(mockKey, 'en');

      expect(value).toBe('Hello');
    });

    it('should return edited value when translation is being edited', () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      const mockKey = createMockKey('1');

      act(() => {
        result.current.handleTranslationChange('1', 'en', 'Hello World');
      });

      const value = result.current.getTranslationValue(mockKey, 'en');
      expect(value).toBe('Hello World');
    });

    it('should return empty string when no translation exists', () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      const mockKey: TranslationKey = {
        ...createMockKey('1'),
        translations: [],
      };

      const value = result.current.getTranslationValue(mockKey, 'en');
      expect(value).toBe('');
    });
  });

  describe('handleTranslationChange - editing state', () => {
    it('should track editing translations', () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleTranslationChange('1', 'en', 'New value');
      });

      expect(result.current.editingTranslations['1']?.['en']).toBe('New value');
    });

    it('should track multiple languages independently', () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleTranslationChange('1', 'en', 'English');
        result.current.handleTranslationChange('1', 'de', 'German');
      });

      expect(result.current.editingTranslations['1']?.['en']).toBe('English');
      expect(result.current.editingTranslations['1']?.['de']).toBe('German');
    });

    it('should track multiple keys independently', () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleTranslationChange('1', 'en', 'Key 1 value');
        result.current.handleTranslationChange('2', 'en', 'Key 2 value');
      });

      expect(result.current.editingTranslations['1']?.['en']).toBe('Key 1 value');
      expect(result.current.editingTranslations['2']?.['en']).toBe('Key 2 value');
    });
  });

  describe('handleApprove', () => {
    it('should call approval mutation', async () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleApprove('trans-1', 'APPROVED');
      });

      expect(mockSetApprovalStatus).toHaveBeenCalledWith('trans-1', 'APPROVED');
    });

    it('should track approving state', async () => {
      let resolveApproval: () => void;
      mockSetApprovalStatus.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveApproval = () => resolve({});
          })
      );

      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      // Start approval
      act(() => {
        result.current.handleApprove('trans-1', 'APPROVED');
      });

      // Should be in approving state
      await waitFor(() => {
        expect(result.current.approvingTranslations.has('trans-1')).toBe(true);
      });

      // Complete approval
      await act(async () => {
        resolveApproval!();
      });

      // Should no longer be approving
      await waitFor(() => {
        expect(result.current.approvingTranslations.has('trans-1')).toBe(false);
      });
    });
  });

  describe('handleBatchApprove', () => {
    it('should skip when no keys selected', async () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.handleBatchApprove('APPROVED', new Set(), [], onSuccess);
      });

      expect(mockBatchApprove).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should batch approve selected translations', async () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      const mockKey = createMockKey('1');
      const selectedKeys = new Set(['1']);
      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.handleBatchApprove('APPROVED', selectedKeys, [mockKey], onSuccess);
      });

      expect(mockBatchApprove).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should chunk large batch operations (100 items per chunk)', async () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      // Create 150 mock keys with 2 translations each = 300 translations
      // Should be chunked into 3 batches (100, 100, 100)
      const manyKeys: TranslationKey[] = Array.from({ length: 150 }, (_, i) =>
        createMockKey(String(i))
      );
      const selectedKeys = new Set(manyKeys.map((k) => k.id));
      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.handleBatchApprove('APPROVED', selectedKeys, manyKeys, onSuccess);
      });

      // Should have called batchApprove 3 times (300 translations / 100 per chunk)
      expect(mockBatchApprove).toHaveBeenCalledTimes(3);
    });

    it('should track batch approving state', async () => {
      let resolveApproval: () => void;
      mockBatchApprove.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveApproval = () => resolve({});
          })
      );

      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      const mockKey = createMockKey('1');
      const selectedKeys = new Set(['1']);

      // Start batch approval
      act(() => {
        result.current.handleBatchApprove('APPROVED', selectedKeys, [mockKey], vi.fn());
      });

      // Should be in batch approving state
      await waitFor(() => {
        expect(result.current.isBatchApproving).toBe(true);
      });

      // Complete
      await act(async () => {
        resolveApproval!();
      });

      await waitFor(() => {
        expect(result.current.isBatchApproving).toBe(false);
      });
    });
  });

  describe('handleBulkDelete', () => {
    it('should skip when no keys selected', async () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.handleBulkDelete(new Set(), onSuccess);
      });

      expect(mockBulkDeleteKeys).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should delete selected keys', async () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      const selectedKeys = new Set(['1', '2', '3']);
      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.handleBulkDelete(selectedKeys, onSuccess);
      });

      expect(mockBulkDeleteKeys).toHaveBeenCalledWith('branch-1', ['1', '2', '3']);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should track deleting state', async () => {
      let resolveDelete: () => void;
      mockBulkDeleteKeys.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDelete = () => resolve({ deleted: 1 });
          })
      );

      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      // Start delete
      act(() => {
        result.current.handleBulkDelete(new Set(['1']), vi.fn());
      });

      // Should be in deleting state
      await waitFor(() => {
        expect(result.current.isBulkDeleting).toBe(true);
      });

      // Complete
      await act(async () => {
        resolveDelete!();
      });

      await waitFor(() => {
        expect(result.current.isBulkDeleting).toBe(false);
      });
    });
  });

  describe('setTranslationValue', () => {
    it('should set translation value directly', () => {
      const { result } = renderHook(() => useTranslationMutations({ branchId: 'branch-1' }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTranslationValue('1', 'en', 'Direct set');
      });

      expect(result.current.editingTranslations['1']?.['en']).toBe('Direct set');
    });
  });
});
