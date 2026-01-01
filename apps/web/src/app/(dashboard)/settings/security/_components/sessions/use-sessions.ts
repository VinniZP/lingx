'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { securityApi } from '@/lib/api';
import { toast } from 'sonner';

export const SESSION_QUERY_KEYS = {
  sessions: ['sessions'],
} as const;

export function useSessions() {
  const query = useQuery({
    queryKey: SESSION_QUERY_KEYS.sessions,
    queryFn: () => securityApi.getSessions(),
    refetchInterval: 60000,
  });

  const sessions = query.data?.sessions || [];
  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return {
    ...query,
    sessions,
    currentSession,
    otherSessions,
  };
}

export function useRevokeSession(options?: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: securityApi.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.sessions });
      toast.success(t('security.activeSessions.sessionRevoked'));
      options?.onSuccess?.();
    },
    onError: () => {
      toast.error(t('security.activeSessions.sessionRevokeFailed'));
    },
  });
}

export function useRevokeAllSessions(options?: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: securityApi.revokeAllOtherSessions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.sessions });
      toast.success(data.message);
      options?.onSuccess?.();
    },
    onError: () => {
      toast.error(t('security.activeSessions.sessionsRevokeFailed'));
    },
  });
}
