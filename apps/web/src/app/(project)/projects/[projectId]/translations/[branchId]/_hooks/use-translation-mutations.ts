'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lingx/sdk-nextjs';
import { translationApi, TranslationKey, ApiError } from '@/lib/api';
import { toast } from 'sonner';

interface UseTranslationMutationsOptions {
  branchId: string;
}

export function useTranslationMutations({ branchId }: UseTranslationMutationsOptions) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // State for tracking save/approval status
  const [editingTranslations, setEditingTranslations] = useState<
    Record<string, Record<string, string>>
  >({});
  const [savingKeys, setSavingKeys] = useState<Map<string, Set<string>>>(new Map());
  const [savedKeys, setSavedKeys] = useState<Map<string, Set<string>>>(new Map());
  const [approvingTranslations, setApprovingTranslations] = useState<Set<string>>(new Set());
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // Auto-save refs
  const saveTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingSavesRef = useRef<Map<string, string>>(new Map());

  // Update translation mutation
  const updateTranslationMutation = useMutation({
    mutationFn: ({
      keyId,
      translations,
    }: {
      keyId: string;
      translations: Record<string, string>;
    }) => translationApi.updateKeyTranslations(keyId, translations),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      const langs = Object.keys(variables.translations);
      setSavedKeys((prev) => {
        const next = new Map(prev);
        const existing = next.get(variables.keyId) || new Set();
        langs.forEach((l) => existing.add(l));
        next.set(variables.keyId, existing);
        return next;
      });
      setSavingKeys((prev) => {
        const next = new Map(prev);
        const existing = next.get(variables.keyId);
        if (existing) {
          langs.forEach((l) => existing.delete(l));
          if (existing.size === 0) next.delete(variables.keyId);
        }
        return next;
      });
      setTimeout(() => {
        setSavedKeys((prev) => {
          const next = new Map(prev);
          next.delete(variables.keyId);
          return next;
        });
      }, 2000);
    },
    onError: (error: ApiError, variables) => {
      toast.error(t('translations.toasts.failedToSave'), { description: error.message });
      setSavingKeys((prev) => {
        const next = new Map(prev);
        next.delete(variables.keyId);
        return next;
      });
    },
  });

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: ({
      translationId,
      status,
    }: {
      translationId: string;
      status: 'APPROVED' | 'REJECTED';
    }) => translationApi.setApprovalStatus(translationId, status),
    onMutate: ({ translationId }) => {
      setApprovingTranslations((prev) => new Set(prev).add(translationId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
    },
    onError: (error: ApiError) => {
      toast.error(t('translations.toasts.failedToApprove'), { description: error.message });
    },
    onSettled: (_, __, { translationId }) => {
      setApprovingTranslations((prev) => {
        const next = new Set(prev);
        next.delete(translationId);
        return next;
      });
    },
  });

  // Get translation value (including pending edits)
  const getTranslationValue = useCallback((key: TranslationKey, lang: string): string => {
    if (editingTranslations[key.id]?.[lang] !== undefined) {
      return editingTranslations[key.id][lang];
    }
    return key.translations.find((t) => t.language === lang)?.value || '';
  }, [editingTranslations]);

  // Handle translation change with auto-save
  const handleTranslationChange = useCallback((keyId: string, lang: string, value: string) => {
    const saveKey = `${keyId}-${lang}`;
    pendingSavesRef.current.set(saveKey, value);

    setEditingTranslations((prev) => ({
      ...prev,
      [keyId]: { ...prev[keyId], [lang]: value },
    }));

    const existingTimeout = saveTimeoutRefs.current.get(saveKey);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(async () => {
      const valueToSave = pendingSavesRef.current.get(saveKey);
      if (valueToSave === undefined) return;

      setSavingKeys((prev) => {
        const next = new Map(prev);
        const existing = next.get(keyId) || new Set();
        existing.add(lang);
        next.set(keyId, existing);
        return next;
      });

      try {
        await updateTranslationMutation.mutateAsync({
          keyId,
          translations: { [lang]: valueToSave },
        });
        pendingSavesRef.current.delete(saveKey);
        setEditingTranslations((prev) => {
          const newState = { ...prev };
          if (newState[keyId]) {
            delete newState[keyId][lang];
            if (Object.keys(newState[keyId]).length === 0) delete newState[keyId];
          }
          return newState;
        });
      } catch {}

      saveTimeoutRefs.current.delete(saveKey);
    }, 1500);

    saveTimeoutRefs.current.set(saveKey, timeout);
  }, [updateTranslationMutation]);

  // Handle approval
  const handleApprove = useCallback(async (translationId: string, status: 'APPROVED' | 'REJECTED') => {
    await approvalMutation.mutateAsync({ translationId, status });
  }, [approvalMutation]);

  // Handle batch approval
  const handleBatchApprove = useCallback(async (
    status: 'APPROVED' | 'REJECTED',
    selectedKeys: Set<string>,
    keys: TranslationKey[],
    onSuccess: () => void
  ) => {
    if (selectedKeys.size === 0) return;

    const translationIds: string[] = [];
    for (const keyId of selectedKeys) {
      const key = keys.find((k) => k.id === keyId);
      if (key) {
        for (const translation of key.translations) {
          if (translation.value && translation.status !== status) {
            translationIds.push(translation.id);
          }
        }
      }
    }

    if (translationIds.length === 0) {
      toast.info(t('translations.toasts.noTranslationsToUpdate'));
      return;
    }

    setIsBatchApproving(true);
    try {
      const BATCH_SIZE = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < translationIds.length; i += BATCH_SIZE) {
        chunks.push(translationIds.slice(i, i + BATCH_SIZE));
      }
      await Promise.all(chunks.map((chunk) => translationApi.batchApprove(branchId, chunk, status)));
      toast.success(t('translations.toasts.translationsUpdated', {
        count: translationIds.length,
        status: status.toLowerCase()
      }));
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      onSuccess();
    } catch (error) {
      toast.error(t('translations.toasts.failedToUpdateTranslations'), {
        description: (error as ApiError).message
      });
    } finally {
      setIsBatchApproving(false);
    }
  }, [branchId, queryClient, t]);

  // Batch approve for command palette
  const batchApproveTranslations = useCallback(async (
    translationIds: string[],
    status: 'APPROVED' | 'REJECTED'
  ) => {
    if (translationIds.length === 0) return;
    try {
      await translationApi.batchApprove(branchId, translationIds, status);
      if (status === 'APPROVED') {
        toast.success(t('translations.toasts.translationsApproved', { count: translationIds.length }));
      } else {
        toast.success(t('translations.toasts.translationsRejected', { count: translationIds.length }));
      }
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
    } catch (error) {
      if (status === 'APPROVED') {
        toast.error(t('translations.toasts.failedToApproveTranslations'), { description: (error as ApiError).message });
      } else {
        toast.error(t('translations.toasts.failedToRejectTranslations'), { description: (error as ApiError).message });
      }
    }
  }, [branchId, queryClient, t]);

  // Set editing translation directly (for copy from source)
  const setTranslationValue = useCallback((keyId: string, lang: string, value: string) => {
    setEditingTranslations((prev) => ({
      ...prev,
      [keyId]: {
        ...prev[keyId],
        [lang]: value,
      },
    }));
  }, []);

  return {
    // State
    editingTranslations,
    savingKeys,
    savedKeys,
    approvingTranslations,
    isBatchApproving,
    // Handlers
    getTranslationValue,
    handleTranslationChange,
    handleApprove,
    handleBatchApprove,
    batchApproveTranslations,
    setTranslationValue,
  };
}
