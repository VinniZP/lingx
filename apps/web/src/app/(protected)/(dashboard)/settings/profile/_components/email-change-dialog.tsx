'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Loader2, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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

export function EmailChangeDialog({ open, onOpenChange, currentEmail }: EmailChangeDialogProps) {
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
      <DialogContent className="gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:max-w-[440px]">
        {/* Decorative gradient header */}
        <div className="from-info/20 via-info/10 relative h-32 overflow-hidden bg-linear-to-br to-transparent">
          {/* Animated gradient orbs */}
          <div className="from-info/30 absolute top-0 right-0 h-40 w-40 translate-x-1/4 -translate-y-1/2 rounded-full bg-gradient-to-bl to-transparent blur-2xl" />
          <div className="from-primary/20 absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/2 rounded-full bg-gradient-to-tr to-transparent blur-2xl" />

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
              <div className="bg-info/40 absolute inset-0 scale-150 rounded-3xl blur-xl" />
              <div className="from-info/30 via-info/20 to-info/10 border-info/30 shadow-info/20 relative flex size-20 items-center justify-center rounded-3xl border bg-linear-to-br shadow-lg backdrop-blur-sm">
                <Mail className="text-info size-10" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pt-6 pb-8">
          {/* Title & description */}
          <div className="mb-8 text-center">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {t('profile.changeEmailDialog.title')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
                {t('profile.changeEmailDialog.description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-muted/30 border-border/40 rounded-xl border p-4 text-sm">
                <p className="text-muted-foreground">
                  {t('profile.changeEmailDialog.currentEmail')}{' '}
                  <span className="text-foreground font-medium">{currentEmail}</span>
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
                    <FormLabel className="text-sm font-medium">{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('profile.changeEmailDialog.passwordPlaceholder')}
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('profile.changeEmailDialog.passwordHint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-12 flex-1 rounded-xl"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="shadow-primary/15 h-12 flex-1 gap-2 rounded-xl shadow-lg"
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
