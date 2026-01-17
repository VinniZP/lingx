'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { AdminUserDetailsResponse } from '@lingx/shared';
import { format } from 'date-fns';
import { UserRoleBadge } from '../../_components/user-role-badge';
import { UserStatusBadge } from '../../_components/user-status-badge';

interface UserProfileHeaderProps {
  user: AdminUserDetailsResponse;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const { t } = useTranslation();
  const displayName = user.name || user.email;

  return (
    <div className="flex items-start gap-6">
      {/* Large Avatar */}
      <Avatar className="border-border/40 size-16 rounded-2xl border">
        <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
        <AvatarFallback className="from-primary/20 to-primary/5 text-primary rounded-2xl bg-linear-to-br text-xl font-medium">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      {/* User Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h2 className="truncate text-2xl font-bold">{displayName}</h2>
          <UserRoleBadge role={user.role} />
          <UserStatusBadge isDisabled={user.isDisabled} />
        </div>

        {user.name && <p className="text-muted-foreground mt-1">{user.email}</p>}

        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
          <span>
            {t('admin.users.memberSince', {
              date: format(new Date(user.createdAt), 'MMM d, yyyy'),
            })}
          </span>

          {user.isDisabled && user.disabledAt && (
            <>
              <span>•</span>
              <span className="text-destructive">
                {t('admin.users.disabledOn', {
                  date: format(new Date(user.disabledAt), 'MMM d, yyyy'),
                })}
                {user.disabledBy && (
                  <>
                    {' '}
                    {t('admin.users.disabledBy', {
                      admin: user.disabledBy.name || user.disabledBy.email,
                    })}
                  </>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
