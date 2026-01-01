'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@localeflow/sdk-nextjs';
import type { UserProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { User, Mail, Loader2 } from 'lucide-react';
import { useUpdateProfile } from './use-profile';

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .optional()
    .or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: UserProfile;
  onEmailChangeClick: () => void;
}

export function ProfileForm({ profile, onEmailChangeClick }: ProfileFormProps) {
  const { t } = useTranslation();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      name: profile.name || '',
    },
  });

  const mutation = useUpdateProfile(form.setError);

  const onSubmit = (data: ProfileFormData) => {
    mutation.mutate(data);
  };

  const hasChanges = form.formState.isDirty;

  return (
    <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
      {/* Section header with subtle gradient */}
      <div className="px-8 py-6 border-b border-border/40 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent">
        <div className="flex items-center gap-5">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t('profile.personalInfo')}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('profile.personalInfoDescription')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t('profile.displayName')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.displayNamePlaceholder')}
                      className="h-12 rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('profile.displayNameHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('profile.emailAddress')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Input
                    value={profile.email}
                    disabled
                    className="h-12 rounded-xl bg-muted/30 pr-24"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-md border border-success/20">
                    {t('common.verified')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEmailChangeClick}
                  className="shrink-0 h-12 rounded-xl gap-2"
                >
                  <Mail className="size-4" />
                  {t('profile.changeEmail')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('profile.emailChangeHint')}
              </p>
            </div>

            {hasChanges && (
              <div className="flex justify-end gap-3 pt-6 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  className="h-12 rounded-xl"
                >
                  {t('profile.discard')}
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="h-12 rounded-xl gap-2 shadow-lg shadow-primary/15"
                >
                  {mutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t('profile.saveChanges')}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
