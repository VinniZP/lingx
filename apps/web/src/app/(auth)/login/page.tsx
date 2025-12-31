'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@localeflow/shared';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ApiError } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const { login, loginWithPasskey } = useAuth();

  // Check for WebAuthn support on client
  const supportsPasskey = typeof window !== 'undefined' && browserSupportsWebAuthn();

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    try {
      await loginWithPasskey();
      toast.success('Welcome back!', {
        description: 'You signed in with your passkey.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Passkey authentication failed';
      toast.error('Passkey sign in failed', {
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
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!', {
        description: 'You have successfully signed in.',
      });
    } catch (error) {
      // Try to map field-level errors to form fields first
      if (!handleApiFieldErrors(error, form.setError)) {
        const message = error instanceof ApiError
          ? error.message
          : 'An unexpected error occurred. Please try again.';
        toast.error('Sign in failed', {
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
          className="text-[2rem] font-semibold tracking-tight text-foreground"
          style={{ fontFamily: 'var(--font-instrument-serif)' }}
        >
          Welcome back
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Enter your credentials to access your projects
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
            className="w-full h-12 rounded-xl border-border/60 bg-card hover:bg-accent text-foreground font-medium text-[15px] transition-all duration-200 touch-manipulation hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0"
          >
            {passkeyLoading ? (
              <>
                <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Fingerprint className="mr-2 h-[18px] w-[18px]" />
                Sign in with passkey
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                or continue with email
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
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        focusedField === 'email' ? 'text-primary' : 'text-muted-foreground/50'
                      }`}>
                        <Mail className="w-[18px] h-[18px]" />
                      </div>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        onFocus={() => setFocusedField('email')}
                        onBlur={(e) => { field.onBlur(); setFocusedField(null); }}
                        className="h-12 w-full pl-12 pr-4 bg-card border-border/60 rounded-xl text-[15px] placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200 touch-manipulation"
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
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 touch-manipulation"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        focusedField === 'password' ? 'text-primary' : 'text-muted-foreground/50'
                      }`}>
                        <Lock className="w-[18px] h-[18px]" />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        {...field}
                        onFocus={() => setFocusedField('password')}
                        onBlur={(e) => { field.onBlur(); setFocusedField(null); }}
                        className="h-12 w-full pl-12 pr-12 bg-card border-border/60 rounded-xl text-[15px] placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200 touch-manipulation"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200 touch-manipulation"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-[18px] h-[18px]" />
                        ) : (
                          <Eye className="w-[18px] h-[18px]" />
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
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[15px] transition-all duration-200 touch-manipulation shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-2 h-[18px] w-[18px]" />
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            New to Localeflow?
          </span>
        </div>
      </div>

      {/* Sign up link */}
      <div className="text-center">
        <Link
          href="/register"
          className="group inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium text-foreground rounded-xl border border-border/60 bg-card hover:bg-accent hover:border-border transition-all duration-200 touch-manipulation"
        >
          Create an account
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
