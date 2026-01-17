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
import { loginSchema, type LoginInput } from '@lingx/shared';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { ArrowRight, Eye, EyeOff, Fingerprint, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const { login, loginWithPasskey } = useAuth();

  // Get URL params for prefill and redirect
  const emailFromUrl = searchParams.get('email') || '';
  const redirectUrlParam = searchParams.get('redirect') || '';

  // Validate redirect URL to prevent open redirect attacks
  // Only allow relative paths starting with / (not //)
  const isValidRedirect = (url: string): boolean => {
    return url.startsWith('/') && !url.startsWith('//');
  };
  const redirectUrl = isValidRedirect(redirectUrlParam) ? redirectUrlParam : '';

  // Check for WebAuthn support on client
  const supportsPasskey = typeof window !== 'undefined' && browserSupportsWebAuthn();

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    try {
      await loginWithPasskey();
      toast.success(t('auth.welcomeToast'), {
        description: t('auth.passkeySignInSuccess'),
      });
      // Redirect to the specified URL or default to dashboard
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.passkeyAuthFailed');
      toast.error(t('auth.passkeySignInFailed'), {
        description: message,
      });
    } finally {
      setPasskeyLoading(false);
    }
  };

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: {
      email: emailFromUrl,
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password);
      toast.success(t('auth.welcomeToast'), {
        description: t('auth.welcomeDescription'),
      });
      // Redirect to the specified URL or default to dashboard
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } catch (error) {
      // Try to map field-level errors to form fields first
      if (!handleApiFieldErrors(error, form.setError)) {
        const message = error instanceof ApiError ? error.message : t('auth.unexpectedError');
        toast.error(t('auth.signInFailed'), {
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
          {t('auth.welcomeBack')}
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          {t('auth.enterCredentials')}
        </p>
      </div>

      {/* Passkey login button */}
      {supportsPasskey && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handlePasskeyLogin}
            disabled={passkeyLoading}
            className="border-border/60 bg-card hover:bg-accent text-foreground h-12 w-full touch-manipulation rounded-xl text-[15px] font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
          >
            {passkeyLoading ? (
              <>
                <Loader2 className="mr-2 size-4.5 animate-spin" />
                {t('auth.authenticating')}
              </>
            ) : (
              <>
                <Fingerprint className="mr-2 size-4.5" />
                {t('auth.signInWithPasskey')}
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="via-border h-px w-full bg-linear-to-r from-transparent to-transparent" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background text-muted-foreground/60 px-4 text-xs font-medium tracking-wider uppercase">
                {t('auth.orContinueWithEmail')}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors duration-200"
                    >
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
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
                        placeholder={t('auth.passwordPlaceholder')}
                        {...field}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => {
                          field.onBlur();
                          setFocusedField(null);
                        }}
                        className="bg-card border-border/60 placeholder:text-muted-foreground/40 focus:border-primary focus:ring-primary/10 h-12 w-full touch-manipulation rounded-xl pr-12 pl-12 text-[15px] transition-all duration-200 focus:ring-2"
                        autoComplete="current-password"
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
                {t('auth.signingIn')}
              </>
            ) : (
              <>
                {t('auth.signIn')}
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
            {t('auth.newToLingx')}
          </span>
        </div>
      </div>

      {/* Sign up link */}
      <div className="text-center">
        <Link
          href={
            redirectUrl
              ? `/register?redirect=${encodeURIComponent(redirectUrl)}${emailFromUrl ? `&email=${encodeURIComponent(emailFromUrl)}` : ''}`
              : '/register'
          }
          className="group text-foreground border-border/60 bg-card hover:bg-accent hover:border-border inline-flex touch-manipulation items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200"
        >
          {t('auth.createAnAccount')}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
