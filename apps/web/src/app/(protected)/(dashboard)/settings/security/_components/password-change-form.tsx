'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { securityApi } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { passwordSchema } from '@lingx/shared';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
              <div className="border-border/40 w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card text-muted-foreground px-4 text-xs font-semibold tracking-wider uppercase">
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

          <div className="flex flex-col items-stretch gap-4 pt-4 sm:flex-row sm:items-center">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="shadow-primary/15 h-12 w-full gap-2.5 rounded-xl shadow-lg sm:w-auto"
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
            <p className="text-muted-foreground flex items-center gap-2 text-xs sm:ml-2">
              <AlertTriangle className="text-warning size-4 shrink-0" />
              {t('security.changePassword.signOutWarning')}
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}
