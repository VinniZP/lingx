'use client';

import { ImpersonationBanner } from '@/components/impersonation-banner';
import { useImpersonation } from '@/hooks/use-impersonation';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isImpersonating, impersonatedUser, timeRemaining, exitImpersonation } =
    useImpersonation();

  return (
    <div
      className={isImpersonating ? 'pt-12' : ''}
      style={{ '--impersonation-offset': isImpersonating ? '3rem' : '0px' } as React.CSSProperties}
    >
      {isImpersonating && impersonatedUser && (
        <ImpersonationBanner
          userName={impersonatedUser.name || impersonatedUser.email}
          timeRemaining={timeRemaining}
          onExit={exitImpersonation}
        />
      )}
      {children}
    </div>
  );
}
