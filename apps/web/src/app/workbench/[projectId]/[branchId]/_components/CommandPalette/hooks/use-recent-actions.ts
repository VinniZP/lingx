'use client';

import { useLocalStorage } from '@/hooks/use-local-storage';
import { useCallback } from 'react';
import type { RecentAction } from '../types';

const STORAGE_KEY_PREFIX = 'workbench-recent-actions-';
const MAX_RECENT_ACTIONS = 5;

/**
 * Hook for managing recent command palette actions.
 * Stores recent actions in localStorage per-project.
 */
export function useRecentActions(projectId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
  const [recentActions, setRecentActions] = useLocalStorage<RecentAction[]>(storageKey, []);

  const addRecentAction = useCallback(
    (action: Omit<RecentAction, 'id' | 'timestamp'>) => {
      setRecentActions((prev) => {
        const newAction: RecentAction = {
          ...action,
          id: `${action.commandId}-${action.keyId}-${Date.now()}`,
          timestamp: Date.now(),
        };

        // Remove duplicate (same command + key combination)
        const filtered = prev.filter(
          (a) => !(a.commandId === action.commandId && a.keyId === action.keyId)
        );

        // Add new action at the beginning, limit to max
        return [newAction, ...filtered].slice(0, MAX_RECENT_ACTIONS);
      });
    },
    [setRecentActions]
  );

  return {
    recentActions,
    addRecentAction,
  };
}
