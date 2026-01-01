'use client';

import { useState, useCallback } from 'react';
import type { TranslationKey } from '@/lib/api';

interface UseKeySelectionOptions {
  keys: TranslationKey[];
}

/**
 * Manages key selection state and handlers.
 * Provides selection, toggle, and batch operations.
 */
export function useKeySelection({ keys }: UseKeySelectionOptions) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const handleSelectionChange = useCallback((keyId: string, selected: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(keyId);
      } else {
        next.delete(keyId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(keys.map((k) => k.id)));
    } else {
      setSelectedKeys(new Set());
    }
  }, [keys]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const isAllSelected = selectedKeys.size === keys.length && keys.length > 0;
  const hasSelection = selectedKeys.size > 0;

  return {
    selectedKeys,
    handleSelectionChange,
    handleSelectAll,
    clearSelection,
    isAllSelected,
    hasSelection,
  };
}
