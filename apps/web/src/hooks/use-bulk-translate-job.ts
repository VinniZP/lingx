'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@lingx/sdk-nextjs';
import {
  translationApi,
  jobsApi,
  isBulkTranslateAsync,
  type JobProgress,
  type BulkTranslateSyncResult,
  type ApiError,
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SSEEvent {
  type: 'connected' | 'progress' | 'completed' | 'failed';
  jobId: string;
  data?: JobProgress | BulkTranslateSyncResult | { error: string };
}

interface UseBulkTranslateJobOptions {
  branchId: string;
  onComplete?: (result: BulkTranslateSyncResult) => void;
  onError?: (error: Error) => void;
}

interface UseBulkTranslateJobReturn {
  start: (keyIds: string[], provider: 'MT' | 'AI') => void;
  cancel: () => void;
  jobId: string | null;
  progress: JobProgress | null;
  isRunning: boolean;
  isComplete: boolean;
  result: BulkTranslateSyncResult | null;
  error: string | null;
}

export function useBulkTranslateJob({
  branchId,
  onComplete,
  onError,
}: UseBulkTranslateJobOptions): UseBulkTranslateJobReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<BulkTranslateSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up SSE connection
  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setJobId(null);
    setProgress(null);
    setIsRunning(false);
    setIsComplete(false);
    setResult(null);
    setError(null);
    closeSSE();
  }, [closeSSE]);

  // Subscribe to SSE for job progress
  const subscribeToJob = useCallback((id: string) => {
    closeSSE();

    const eventSource = new EventSource(`${API_URL}/api/jobs/${id}/events`, {
      withCredentials: true,
    });
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);

        switch (data.type) {
          case 'connected':
          case 'progress':
            setProgress(data.data as JobProgress);
            break;

          case 'completed':
            const completedResult = data.data as BulkTranslateSyncResult | null;
            setIsComplete(true);
            setIsRunning(false);
            closeSSE();

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['keys', branchId] });

            if (completedResult) {
              setResult(completedResult);
              // Show success toast
              if (completedResult.translated > 0) {
                toast.success(t('translations.toasts.translationsGenerated', { count: completedResult.translated }));
              } else {
                toast.info(t('translations.toasts.noEmptyTranslations'));
              }
              onComplete?.(completedResult);
            } else {
              toast.success(t('translations.bulkTranslate.complete'));
            }
            break;

          case 'failed':
            const failedData = data.data as { error: string } | null;
            const errorMsg = failedData?.error || 'Translation failed';
            setError(errorMsg);
            setIsRunning(false);
            closeSSE();

            toast.error(t('translations.toasts.failedToTranslate'), {
              description: errorMsg,
            });

            onError?.(new Error(errorMsg));
            break;
        }
      } catch (e) {
        console.error('[SSE] Failed to parse event:', e);
      }
    };

    eventSource.onerror = () => {
      // SSE connection error - try to get final status
      closeSSE();

      // Poll for final status
      jobsApi.getStatus(id).then((status) => {
        if (status.status === 'completed' && status.result) {
          setResult(status.result);
          setIsComplete(true);
          setIsRunning(false);
          queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
          onComplete?.(status.result);
        } else if (status.status === 'failed') {
          setError(status.failedReason || 'Job failed');
          setIsRunning(false);
          onError?.(new Error(status.failedReason || 'Job failed'));
        }
      }).catch(() => {
        // Ignore errors when polling final status
      });
    };
  }, [branchId, closeSSE, onComplete, onError, queryClient, t]);

  // Start mutation
  const startMutation = useMutation({
    mutationFn: async ({ keyIds, provider }: { keyIds: string[]; provider: 'MT' | 'AI' }) => {
      reset();
      setIsRunning(true);

      const response = await translationApi.bulkTranslate(branchId, keyIds, provider);

      if (isBulkTranslateAsync(response)) {
        // Async - subscribe to SSE
        setJobId(response.jobId);
        subscribeToJob(response.jobId);
        return { async: true, jobId: response.jobId };
      } else {
        // Sync - got immediate result
        setResult(response);
        setIsComplete(true);
        setIsRunning(false);

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['keys', branchId] });

        // Show toast
        if (response.translated > 0) {
          toast.success(t('translations.toasts.translationsGenerated', { count: response.translated }));
        } else {
          toast.info(t('translations.toasts.noEmptyTranslations'));
        }

        onComplete?.(response);
        return { async: false, result: response };
      }
    },
    onError: (err: ApiError) => {
      setIsRunning(false);
      setError(err.message);
      toast.error(t('translations.toasts.failedToTranslate'), {
        description: err.message,
      });
      onError?.(err);
    },
  });

  // Cancel job
  const cancel = useCallback(async () => {
    if (jobId) {
      try {
        await jobsApi.cancel(jobId);
        toast.info(t('translations.toasts.jobCancelled'));
      } catch {
        // Ignore cancel errors
      }
    }
    reset();
  }, [jobId, reset, t]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      closeSSE();
    };
  }, [closeSSE]);

  return {
    start: (keyIds: string[], provider: 'MT' | 'AI') => startMutation.mutate({ keyIds, provider }),
    cancel,
    jobId,
    progress,
    isRunning,
    isComplete,
    result,
    error,
  };
}
