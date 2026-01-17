'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Loader2, LogOut, Monitor, XCircle } from 'lucide-react';
import { useState } from 'react';
import { RevokeAllSessionsDialog } from './revoke-all-sessions-dialog';
import { RevokeSessionDialog } from './revoke-session-dialog';
import { SessionRow } from './session-row';
import { useRevokeAllSessions, useSessions } from './use-sessions';

export function SessionsList() {
  const { t } = useTranslation();
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);

  const { currentSession, otherSessions, isLoading, error } = useSessions();
  const revokeAllMutation = useRevokeAllSessions();

  // Loading state
  if (isLoading) {
    return (
      <div className="island border-0 p-6 shadow-lg shadow-black/2">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-4">
              <div className="bg-muted size-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="bg-muted h-4 w-36 rounded" />
                <div className="bg-muted h-3 w-28 rounded" />
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
      <div className="island border-0 p-10 text-center shadow-lg shadow-black/2">
        <div className="bg-destructive/10 border-destructive/20 mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border">
          <XCircle className="text-destructive size-7" />
        </div>
        <p className="mb-1 font-medium">{t('security.activeSessions.failedToLoad')}</p>
        <p className="text-muted-foreground text-sm">
          {t('security.activeSessions.tryAgainLater')}
        </p>
      </div>
    );
  }

  // Empty state
  if (!currentSession && otherSessions.length === 0) {
    return (
      <div className="island border-0 p-12 text-center shadow-lg shadow-black/2">
        <div className="bg-muted/50 border-border/50 mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border">
          <Monitor className="text-muted-foreground/50 size-7" />
        </div>
        <p className="mb-1 font-medium">{t('security.activeSessions.noActiveSessions')}</p>
        <p className="text-muted-foreground text-sm">
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
          <div className="from-success/5 border-border/40 border-b bg-linear-to-r to-transparent p-5">
            <SessionRow session={currentSession} onRevoke={() => {}} isRevoking={false} isCurrent />
          </div>
        )}

        {/* Other Sessions */}
        {otherSessions.length > 0 && (
          <>
            <div className="bg-muted/20 border-border/40 flex items-center justify-between border-b px-5 py-3">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t('security.activeSessions.otherSessions', {
                  count: otherSessions.length,
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokeAllDialogOpen(true)}
                disabled={revokeAllMutation.isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 rounded-lg px-3 text-xs font-medium"
              >
                {revokeAllMutation.isPending ? (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                ) : (
                  <LogOut className="mr-1.5 size-3" />
                )}
                {t('security.activeSessions.revokeAll')}
              </Button>
            </div>
            <div className="divide-border/40 divide-y">
              {otherSessions.map((session) => (
                <div key={session.id} className="hover:bg-muted/10 p-5 transition-colors">
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
            <p className="text-muted-foreground text-sm">
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
