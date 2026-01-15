'use client';

import type { UserProfile } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';

interface ProfileSummaryWidgetProps {
  profile: UserProfile;
  memberDuration: string;
}

export function ProfileSummaryWidget({ profile, memberDuration }: ProfileSummaryWidgetProps) {
  const { t } = useTranslation();

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase();

  return (
    <div className="from-muted/50 to-muted/20 border-border/50 min-w-50 shrink-0 rounded-2xl border bg-linear-to-br p-6">
      <div className="mb-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="from-info/20 via-info/10 to-primary/10 border-info/20 flex size-14 items-center justify-center overflow-hidden rounded-xl border bg-linear-to-br">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name || 'Avatar'}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-info text-lg font-semibold">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile.name || t('profile.noName')}</p>
          <p className="text-muted-foreground truncate text-xs">{profile.email}</p>
        </div>
      </div>
      <div className="border-border/50 space-y-2 border-t pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('profile.memberSince')}</span>
          <span className="font-medium">{memberDuration}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('profile.accountStatus')}</span>
          <span className="text-success font-medium">{t('common.active')}</span>
        </div>
      </div>
    </div>
  );
}
