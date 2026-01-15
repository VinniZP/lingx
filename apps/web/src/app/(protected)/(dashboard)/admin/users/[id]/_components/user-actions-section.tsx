'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { AdminUserDetailsResponse } from '@lingx/shared';
import { UserCheck, UserMinus, UserX } from 'lucide-react';

interface UserActionsSectionProps {
  user: AdminUserDetailsResponse;
  onDisable: () => void;
  onEnable: () => void;
  onImpersonate: () => void;
  isDisabling?: boolean;
  isEnabling?: boolean;
  isImpersonating?: boolean;
}

export function UserActionsSection({
  user,
  onDisable,
  onEnable,
  onImpersonate,
  isDisabling,
  isEnabling,
  isImpersonating,
}: UserActionsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="island border-destructive/20">
      <div className="border-destructive/20 border-b p-5">
        <h3 className="text-destructive font-semibold">{t('admin.actions.dangerZone')}</h3>
      </div>

      <div className="divide-destructive/10 divide-y">
        {/* Disable/Enable Action */}
        {user.isDisabled ? (
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="bg-success/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
                <UserCheck className="text-success size-5" />
              </div>
              <div>
                <p className="font-medium">{t('admin.actions.enable')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('admin.actions.enableDescription')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onEnable}
              disabled={isEnabling}
              className="border-success text-success hover:bg-success/10"
            >
              {t('admin.actions.enable')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="bg-destructive/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
                <UserX className="text-destructive size-5" />
              </div>
              <div>
                <p className="font-medium">{t('admin.actions.disable')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('admin.actions.disableDescription')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onDisable}
              disabled={isDisabling}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              {t('admin.actions.disable')}
            </Button>
          </div>
        )}

        {/* Impersonate Action - Only for active users */}
        {!user.isDisabled && (
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="bg-warning/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
                <UserMinus className="text-warning size-5" />
              </div>
              <div>
                <p className="font-medium">{t('admin.actions.impersonate')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('admin.actions.impersonateDescription')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onImpersonate}
              disabled={isImpersonating}
              className="border-warning text-warning hover:bg-warning/10"
            >
              {t('admin.actions.impersonate')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
