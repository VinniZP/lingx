'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Loader2, Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
      <div className="border-border/40 from-muted/40 via-muted/20 border-b bg-linear-to-r to-transparent px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="from-primary/15 to-primary/5 border-primary/10 flex size-12 items-center justify-center rounded-2xl border bg-linear-to-br">
            <User className="text-primary size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t('profile.personalInfo')}</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
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
                  <FormLabel className="text-sm font-medium">{t('profile.displayName')}</FormLabel>
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
                <div className="border-border/40 w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card text-muted-foreground px-4 text-xs font-semibold tracking-wider uppercase">
                  {t('profile.emailAddress')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-muted/30 h-12 rounded-xl pr-24"
                  />
                  <span className="text-success bg-success/10 border-success/20 absolute top-1/2 right-4 -translate-y-1/2 rounded-md border px-2 py-1 text-xs font-medium">
                    {t('common.verified')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEmailChangeClick}
                  className="h-12 shrink-0 gap-2 rounded-xl"
                >
                  <Mail className="size-4" />
                  {t('profile.changeEmail')}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">{t('profile.emailChangeHint')}</p>
            </div>

            {hasChanges && (
              <div className="border-border/40 flex justify-end gap-3 border-t pt-6">
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
                  className="shadow-primary/15 h-12 gap-2 rounded-xl shadow-lg"
                >
                  {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
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
