'use client';

import { useState } from 'react';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Monitor, XCircle, LogOut, Loader2 } from 'lucide-react';
import { useSessions, useRevokeAllSessions } from './use-sessions';
import { SessionRow } from './session-row';
import { RevokeSessionDialog } from './revoke-session-dialog';
import { RevokeAllSessionsDialog } from './revoke-all-sessions-dialog';

export function SessionsList() {
  const { t } = useTranslation();
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);

  const { currentSession, otherSessions, isLoading, error } = useSessions();
  const revokeAllMutation = useRevokeAllSessions();

  // Loading state
  if (isLoading) {
    return (
      <div className="island p-6 border-0 shadow-lg shadow-black/2">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="size-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-28 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="island p-10 text-center border-0 shadow-lg shadow-black/2">
        <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4 border border-destructive/20">
          <XCircle className="size-7 text-destructive" />
        </div>
        <p className="font-medium mb-1">
          {t('security.activeSessions.failedToLoad')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('security.activeSessions.tryAgainLater')}
        </p>
      </div>
    );
  }

  // Empty state
  if (!currentSession && otherSessions.length === 0) {
    return (
      <div className="island p-12 text-center border-0 shadow-lg shadow-black/2">
        <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border/50">
          <Monitor className="size-7 text-muted-foreground/50" />
        </div>
        <p className="font-medium mb-1">
          {t('security.activeSessions.noActiveSessions')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('security.activeSessions.sessionsAppearHere')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
        {/* Current Session */}
        {currentSession && (
          <div className="p-5 bg-linear-to-r from-success/5 to-transparent border-b border-border/40">
            <SessionRow
              session={currentSession}
              onRevoke={() => {}}
              isRevoking={false}
              isCurrent
            />
          </div>
        )}

        {/* Other Sessions */}
        {otherSessions.length > 0 && (
          <>
            <div className="px-5 py-3 flex items-center justify-between bg-muted/20 border-b border-border/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('security.activeSessions.otherSessions', {
                  count: otherSessions.length,
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokeAllDialogOpen(true)}
                disabled={revokeAllMutation.isPending}
                className="h-8 px-3 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
              >
                {revokeAllMutation.isPending ? (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                ) : (
                  <LogOut className="size-3 mr-1.5" />
                )}
                {t('security.activeSessions.revokeAll')}
              </Button>
            </div>
            <div className="divide-y divide-border/40">
              {otherSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-5 hover:bg-muted/10 transition-colors"
                >
                  <SessionRow
                    session={session}
                    onRevoke={() => setRevokeSessionId(session.id)}
                    isRevoking={false}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Only current session, no others */}
        {otherSessions.length === 0 && currentSession && (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t('security.activeSessions.noOtherSessions')}
            </p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <RevokeSessionDialog
        sessionId={revokeSessionId}
        onOpenChange={() => setRevokeSessionId(null)}
      />

      <RevokeAllSessionsDialog
        open={revokeAllDialogOpen}
        onOpenChange={setRevokeAllDialogOpen}
        sessionCount={otherSessions.length}
      />
    </>
  );
}
