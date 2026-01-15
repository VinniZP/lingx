'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { UserPreferences, UserProfile } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Bell, Clock, FolderOpen, Languages, Mail, Palette } from 'lucide-react';
import { PreferenceRow } from './preference-row';
import { useUpdatePreferences } from './use-profile';

interface PreferencesFormProps {
  profile: UserProfile;
  projects: { id: string; name: string }[];
}

export function PreferencesForm({ profile, projects }: PreferencesFormProps) {
  const { t } = useTranslation();
  const mutation = useUpdatePreferences();

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
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
      <div className="border-border/40 from-muted/40 via-muted/20 border-b bg-linear-to-r to-transparent px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="from-warm/15 to-warm/5 border-warm/10 flex size-12 items-center justify-center rounded-2xl border bg-linear-to-br">
            <Palette className="text-warm size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t('profile.preferences.title')}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {t('profile.preferences.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Appearance group */}
      <div className="border-border/40 border-b px-8 py-6">
        <p className="text-muted-foreground mb-5 text-xs font-semibold tracking-wider uppercase">
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
              <SelectTrigger className="h-10 w-36 rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{t('profile.preferences.system')}</SelectItem>
                <SelectItem value="light">{t('profile.preferences.light')}</SelectItem>
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
              <SelectTrigger className="h-10 w-36 rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('profile.preferences.english')}</SelectItem>
                <SelectItem value="es">{t('profile.preferences.spanish')}</SelectItem>
                <SelectItem value="fr">{t('profile.preferences.french')}</SelectItem>
                <SelectItem value="de">{t('profile.preferences.german')}</SelectItem>
                <SelectItem value="ru">{t('profile.preferences.russian')}</SelectItem>
                <SelectItem value="uk">{t('profile.preferences.ukrainian')}</SelectItem>
                <SelectItem value="ja">{t('profile.preferences.japanese')}</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>
        </div>
      </div>

      {/* Workflow group */}
      <div className="border-border/40 border-b px-8 py-6">
        <p className="text-muted-foreground mb-5 text-xs font-semibold tracking-wider uppercase">
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
            <SelectTrigger className="h-10 w-44 rounded-xl text-sm">
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
        <p className="text-muted-foreground mb-5 text-xs font-semibold tracking-wider uppercase">
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
              onCheckedChange={(checked: boolean) => updateNotification('email', checked)}
            />
          </PreferenceRow>

          <PreferenceRow
            icon={Bell}
            title={t('profile.preferences.inAppNotifications')}
            description={t('profile.preferences.inAppNotificationsDesc')}
          >
            <Switch
              checked={profile.preferences.notifications.inApp}
              onCheckedChange={(checked: boolean) => updateNotification('inApp', checked)}
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
                updateNotification('digestFrequency', value as 'never' | 'daily' | 'weekly')
              }
            >
              <SelectTrigger className="h-10 w-32 rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{t('profile.preferences.never')}</SelectItem>
                <SelectItem value="daily">{t('profile.preferences.daily')}</SelectItem>
                <SelectItem value="weekly">{t('profile.preferences.weekly')}</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>
        </div>
      </div>
    </div>
  );
}
