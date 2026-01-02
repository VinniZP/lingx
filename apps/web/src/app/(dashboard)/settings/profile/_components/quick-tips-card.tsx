'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Sparkles, Zap, Key, Shield } from 'lucide-react';
import { SettingsSectionHeader, SettingsQuickTip } from '../../_components';

export function QuickTipsCard() {
  const { t } = useTranslation();

  return (
    <>
      <SettingsSectionHeader
        icon={Sparkles}
        title={t('profile.quickTips.title')}
        iconVariant="success"
      />

      <div className="space-y-4">
        <SettingsQuickTip
          icon={Zap}
          title={t('profile.quickTips.keyboardShortcuts')}
          description={t('profile.quickTips.keyboardShortcutsDesc')}
          variant="primary"
        />
        <SettingsQuickTip
          icon={Key}
          title={t('profile.quickTips.apiKeys')}
          description={t('profile.quickTips.apiKeysDesc')}
          variant="warm"
        />
        <SettingsQuickTip
          icon={Shield}
          title={t('profile.quickTips.security')}
          description={t('profile.quickTips.securityDesc')}
          variant="success"
        />
      </div>
    </>
  );
}
