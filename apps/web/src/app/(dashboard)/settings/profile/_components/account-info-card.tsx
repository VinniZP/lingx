'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import type { UserProfile } from '@/lib/api';
import { Hash } from 'lucide-react';
import { SettingsSectionHeader } from '../../_components';
import { InfoRow } from './info-row';

interface AccountInfoCardProps {
  profile: UserProfile;
}

export function AccountInfoCard({ profile }: AccountInfoCardProps) {
  const { t } = useTranslation();

  return (
    <>
      <SettingsSectionHeader
        icon={Hash}
        title={t('profile.accountDetails.title')}
        iconVariant="muted"
      />

      <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
        <div className="divide-y divide-border/40">
          <InfoRow
            label={t('profile.accountDetails.userId')}
            value={profile.id}
            mono
            copyable
          />
          <InfoRow label={t('profile.emailAddress')} value={profile.email} />
          <InfoRow
            label={t('profile.accountDetails.role')}
            value={profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
            badge
          />
          <InfoRow
            label={t('profile.accountDetails.created')}
            value={
              profile.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'
            }
          />
        </div>
      </div>
    </>
  );
}
