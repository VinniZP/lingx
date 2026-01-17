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
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { registerSchema, type RegisterInput } from '@lingx/shared';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { t } = useTranslation();
  const { register: registerUser } = useAuth();

  // Get URL params for prefill and redirect
  const emailFromUrl = searchParams.get('email') || '';
  const redirectUrlParam = searchParams.get('redirect') || '';

  // Validate redirect URL to prevent open redirect attacks
  // Only allow relative paths starting with / (not //)
  const isValidRedirect = (url: string): boolean => {
    return url.startsWith('/') && !url.startsWith('//');
  };
  const redirectUrl = isValidRedirect(redirectUrlParam) ? redirectUrlParam : '';

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: emailFromUrl,
      password: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      await registerUser(data.email, data.password, data.name || undefined);
      toast.success(t('auth.accountCreated'), {
        description: t('auth.accountCreatedDescription'),
      });
      // Redirect to the specified URL or default to dashboard
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } catch (error) {
      // Try to map field-level errors to form fields first
      if (!handleApiFieldErrors(error, form.setError)) {
        // Only show toast for non-field errors (network issues, 500s, etc.)
        const message = error instanceof ApiError ? error.message : t('auth.unexpectedError');
        toast.error(t('auth.registrationFailed'), {
          description: message,
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h1
          className="text-foreground text-[2rem] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-instrument-serif)' }}
        >
          {t('auth.createAccount')}
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          {t('auth.startManaging')}
        </p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-4">
            {/* Name field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('auth.fullName')}
                    <span className="text-muted-foreground/60 ml-1 font-normal">
                      {t('common.optional')}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div
                        className={`absolute top-1/2 left-4 -translate-y-1/2 transition-colors duration-200 ${
                          focusedField === 'name' ? 'text-primary' : 'text-muted-foreground/50'
                        }`}
                      >
                        <User className="size-4.5" />
                      </div>
                      <Input
                        placeholder={t('auth.fullNamePlaceholder')}
                        {...field}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => {
                          field.onBlur();
                          setFocusedField(null);
                        }}
                        className="bg-card border-border/60 placeholder:text-muted-foreground/40 focus:border-primary focus:ring-primary/10 h-12 w-full touch-manipulation rounded-xl pr-4 pl-12 text-[15px] transition-all duration-200 focus:ring-2"
                        autoComplete="name"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.emailAddress')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div
                        className={`absolute top-1/2 left-4 -translate-y-1/2 transition-colors duration-200 ${
                          focusedField === 'email' ? 'text-primary' : 'text-muted-foreground/50'
                        }`}
                      >
                        <Mail className="size-4.5" />
                      </div>
                      <Input
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        {...field}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => {
                          field.onBlur();
                          setFocusedField(null);
                        }}
                        className="bg-card border-border/60 placeholder:text-muted-foreground/40 focus:border-primary focus:ring-primary/10 h-12 w-full touch-manipulation rounded-xl pr-4 pl-12 text-[15px] transition-all duration-200 focus:ring-2"
                        autoComplete="email"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div
                        className={`absolute top-1/2 left-4 -translate-y-1/2 transition-colors duration-200 ${
                          focusedField === 'password' ? 'text-primary' : 'text-muted-foreground/50'
                        }`}
                      >
                        <Lock className="size-4.5" />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('auth.createPassword')}
                        {...field}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => {
                          field.onBlur();
                          setFocusedField(null);
                        }}
                        className="bg-card border-border/60 placeholder:text-muted-foreground/40 focus:border-primary focus:ring-primary/10 h-12 w-full touch-manipulation rounded-xl pr-12 pl-12 text-[15px] transition-all duration-200 focus:ring-2"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted-foreground/50 hover:text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2 touch-manipulation transition-colors duration-200"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4.5" />
                        ) : (
                          <Eye className="size-4.5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 hover:shadow-primary/25 h-12 w-full touch-manipulation rounded-xl text-[15px] font-medium shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4.5 animate-spin" />
                {t('auth.creatingAccount')}
              </>
            ) : (
              <>
                {t('auth.createAnAccount')}
                <ArrowRight className="ml-2 size-4.5" />
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="via-border h-px w-full bg-linear-to-r from-transparent to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background text-muted-foreground/60 px-4 text-xs font-medium tracking-wider uppercase">
            {t('auth.alreadyHaveAccount')}
          </span>
        </div>
      </div>

      {/* Sign in link */}
      <div className="text-center">
        <Link
          href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
          className="group text-foreground border-border/60 bg-card hover:bg-accent hover:border-border inline-flex touch-manipulation items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200"
        >
          {t('auth.signInInstead')}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
