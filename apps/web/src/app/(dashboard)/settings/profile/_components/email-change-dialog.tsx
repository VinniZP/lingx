'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@lingx/sdk-nextjs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mail, Loader2 } from 'lucide-react';
import { useInitiateEmailChange } from './use-profile';

const emailChangeSchema = z.object({
  newEmail: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type EmailChangeFormData = z.infer<typeof emailChangeSchema>;

interface EmailChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}

export function EmailChangeDialog({
  open,
  onOpenChange,
  currentEmail,
}: EmailChangeDialogProps) {
  const { t } = useTranslation();

  const form = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    mode: 'onTouched',
    defaultValues: {
      newEmail: '',
      password: '',
    },
  });

  const mutation = useInitiateEmailChange(form.setError, () => {
    onOpenChange(false);
    form.reset();
  });

  const onSubmit = (data: EmailChangeFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-0 shadow-2xl p-0 overflow-hidden gap-0">
        {/* Decorative gradient header */}
        <div className="relative h-32 bg-linear-to-br from-info/20 via-info/10 to-transparent overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-info/30 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* Centered icon with glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-info/40 rounded-3xl blur-xl scale-150" />
              <div className="relative size-20 rounded-3xl bg-linear-to-br from-info/30 via-info/20 to-info/10 flex items-center justify-center border border-info/30 backdrop-blur-sm shadow-lg shadow-info/20">
                <Mail className="size-10 text-info" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-6">
          {/* Title & description */}
          <div className="text-center mb-8">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {t('profile.changeEmailDialog.title')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                {t('profile.changeEmailDialog.description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="p-4 rounded-xl bg-muted/30 text-sm border border-border/40">
                <p className="text-muted-foreground">
                  {t('profile.changeEmailDialog.currentEmail')}{' '}
                  <span className="font-medium text-foreground">{currentEmail}</span>
                </p>
              </div>

              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t('profile.emailAddress')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('profile.changeEmailDialog.newEmailPlaceholder')}
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t('auth.password')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('profile.changeEmailDialog.passwordPlaceholder')}
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('profile.changeEmailDialog.passwordHint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-12 rounded-xl"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 h-12 rounded-xl gap-2 shadow-lg shadow-primary/15"
                >
                  {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  {t('profile.changeEmailDialog.submit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
