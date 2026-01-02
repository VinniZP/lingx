'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import type { UserProfile, UserPreferences } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Languages, Bell, Palette, FolderOpen, Clock, Mail } from 'lucide-react';
import { useUpdatePreferences } from './use-profile';
import { PreferenceRow } from './preference-row';

interface PreferencesFormProps {
  profile: UserProfile;
  projects: { id: string; name: string }[];
}

export function PreferencesForm({ profile, projects }: PreferencesFormProps) {
  const { t } = useTranslation();
  const mutation = useUpdatePreferences();

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    mutation.mutate({ [key]: value });
  };

  const updateNotification = (
    key: keyof UserPreferences['notifications'],
    value: boolean | string
  ) => {
    mutation.mutate({
      notifications: {
        ...profile.preferences.notifications,
        [key]: value,
      },
    });
  };

  return (
    <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
      {/* Section header with subtle gradient */}
      <div className="px-8 py-6 border-b border-border/40 bg-linear-to-r from-muted/40 via-muted/20 to-transparent">
        <div className="flex items-center gap-5">
          <div className="size-12 rounded-2xl bg-linear-to-br from-warm/15 to-warm/5 flex items-center justify-center border border-warm/10">
            <Palette className="size-5 text-warm" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t('profile.preferences.title')}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('profile.preferences.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Appearance group */}
      <div className="px-8 py-6 border-b border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          {t('profile.preferences.appearance')}
        </p>
        <div className="space-y-2">
          <PreferenceRow
            icon={Palette}
            title={t('profile.preferences.theme')}
            description={t('profile.preferences.colorScheme')}
          >
            <Select
              value={profile.preferences.theme}
              onValueChange={(value) =>
                updatePreference('theme', value as UserPreferences['theme'])
              }
            >
              <SelectTrigger className="w-36 h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  {t('profile.preferences.system')}
                </SelectItem>
                <SelectItem value="light">
                  {t('profile.preferences.light')}
                </SelectItem>
                <SelectItem value="dark">{t('profile.preferences.dark')}</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>

          <PreferenceRow
            icon={Languages}
            title={t('profile.preferences.language')}
            description={t('profile.preferences.interfaceLanguage')}
          >
            <Select
              value={profile.preferences.language}
              onValueChange={(value) => updatePreference('language', value)}
            >
              <SelectTrigger className="w-36 h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('profile.preferences.english')}</SelectItem>
                <SelectItem value="es">{t('profile.preferences.spanish')}</SelectItem>
                <SelectItem value="fr">{t('profile.preferences.french')}</SelectItem>
                <SelectItem value="de">{t('profile.preferences.german')}</SelectItem>
                <SelectItem value="ru">{t('profile.preferences.russian')}</SelectItem>
                <SelectItem value="uk">{t('profile.preferences.ukrainian')}</SelectItem>
                <SelectItem value="ja">
                  {t('profile.preferences.japanese')}
                </SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>
        </div>
      </div>

      {/* Workflow group */}
      <div className="px-8 py-6 border-b border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          {t('profile.preferences.workflow')}
        </p>
        <PreferenceRow
          icon={FolderOpen}
          title={t('profile.preferences.defaultProject')}
          description={t('profile.preferences.openOnLogin')}
        >
          <Select
            value={profile.preferences.defaultProjectId || 'none'}
            onValueChange={(value) =>
              updatePreference('defaultProjectId', value === 'none' ? null : value)
            }
          >
            <SelectTrigger className="w-44 h-10 text-sm rounded-xl">
              <SelectValue placeholder={t('profile.preferences.never')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('profile.preferences.never')}</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PreferenceRow>
      </div>

      {/* Notifications group */}
      <div className="px-8 py-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          {t('profile.preferences.notifications')}
        </p>
        <div className="space-y-2">
          <PreferenceRow
            icon={Mail}
            title={t('profile.preferences.emailNotifications')}
            description={t('profile.preferences.emailNotificationsDesc')}
          >
            <Switch
              checked={profile.preferences.notifications.email}
              onCheckedChange={(checked: boolean) =>
                updateNotification('email', checked)
              }
            />
          </PreferenceRow>

          <PreferenceRow
            icon={Bell}
            title={t('profile.preferences.inAppNotifications')}
            description={t('profile.preferences.inAppNotificationsDesc')}
          >
            <Switch
              checked={profile.preferences.notifications.inApp}
              onCheckedChange={(checked: boolean) =>
                updateNotification('inApp', checked)
              }
            />
          </PreferenceRow>

          <PreferenceRow
            icon={Clock}
            title={t('profile.preferences.activityDigest')}
            description={t('profile.preferences.summaryFrequency')}
          >
            <Select
              value={profile.preferences.notifications.digestFrequency}
              onValueChange={(value) =>
                updateNotification(
                  'digestFrequency',
                  value as 'never' | 'daily' | 'weekly'
                )
              }
            >
              <SelectTrigger className="w-32 h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">
                  {t('profile.preferences.never')}
                </SelectItem>
                <SelectItem value="daily">
                  {t('profile.preferences.daily')}
                </SelectItem>
                <SelectItem value="weekly">
                  {t('profile.preferences.weekly')}
                </SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>
        </div>
      </div>
    </div>
  );
}
