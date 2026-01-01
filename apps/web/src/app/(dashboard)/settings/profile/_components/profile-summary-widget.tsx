'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import type { UserProfile } from '@/lib/api';

interface ProfileSummaryWidgetProps {
  profile: UserProfile;
  joinDate: string;
  memberDuration: string;
}

export function ProfileSummaryWidget({
  profile,
  joinDate,
  memberDuration,
}: ProfileSummaryWidgetProps) {
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
    <div className="shrink-0 p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 min-w-50">
      <div className="flex items-center gap-4 mb-4">
        {/* Avatar */}
        <div className="size-14 rounded-xl bg-gradient-to-br from-info/20 via-info/10 to-primary/10 flex items-center justify-center border border-info/20 overflow-hidden">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name || 'Avatar'}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold text-info">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">
            {profile.name || t('profile.noName')}
          </p>
          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
        </div>
      </div>
      <div className="space-y-2 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('profile.memberSince')}</span>
          <span className="font-medium">{memberDuration}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('profile.accountStatus')}</span>
          <span className="font-medium text-success">{t('common.active')}</span>
        </div>
      </div>
    </div>
  );
}
