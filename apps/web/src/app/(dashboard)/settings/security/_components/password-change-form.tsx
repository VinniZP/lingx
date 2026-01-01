'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { useMutation } from '@tanstack/react-query';
import { securityApi } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { passwordSchema } from '@localeflow/shared';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;

export function PasswordChangeForm() {
  const { t } = useTranslation();

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordFormSchema),
    mode: 'onTouched',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: securityApi.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully', {
        description: 'All other sessions have been revoked.',
      });
      form.reset();
    },
    onError: (error) => {
      const handled = handleApiFieldErrors(error, form.setError);
      if (!handled) {
        toast.error('Failed to change password');
      }
    },
  });

  const onSubmit = (data: ChangePasswordFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t('security.changePassword.currentPassword')}
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    placeholder={t('security.changePassword.currentPasswordPlaceholder')}
                    autoComplete="current-password"
                    className="h-12 rounded-xl"
                  />
                </FormControl>
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
                {t('security.changePassword.newPassword')}
              </span>
            </div>
          </div>

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t('security.changePassword.newPassword')}
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    placeholder={t('security.changePassword.newPasswordPlaceholder')}
                    autoComplete="new-password"
                    className="h-12 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t('security.changePassword.confirmPassword')}
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    placeholder={t('security.changePassword.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    className="h-12 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="sm:w-auto w-full gap-2.5 h-12 rounded-xl shadow-lg shadow-primary/15"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  {t('security.changePassword.submit')}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-2 sm:ml-2">
              <AlertTriangle className="size-4 text-warning shrink-0" />
              {t('security.changePassword.signOutWarning')}
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}
