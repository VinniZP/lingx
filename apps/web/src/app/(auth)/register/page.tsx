'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { toast } from 'sonner';
import { Loader2, ArrowRight, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

// Validation schema
const registerSchema = z.object({
  name: z
    .string()
    .max(100, 'Name must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { register: registerUser } = useAuth();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.email, data.password, data.name || undefined);
      toast.success('Account created!', {
        description: 'Welcome to Localeflow. Your account is ready.',
      });
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'An unexpected error occurred. Please try again.';
      toast.error('Registration failed', {
        description: message,
      });
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
          Create your account
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Start managing your translations in minutes
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
                    Full name
                    <span className="ml-1 text-muted-foreground/60 font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        focusedField === 'name' ? 'text-primary' : 'text-muted-foreground/50'
                      }`}>
                        <User className="w-[18px] h-[18px]" />
                      </div>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        onFocus={() => setFocusedField('name')}
                        onBlur={(e) => { field.onBlur(); setFocusedField(null); }}
                        className="h-12 w-full pl-12 pr-4 bg-card border-border/60 rounded-xl text-[15px] placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200 touch-manipulation"
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        focusedField === 'password' ? 'text-primary' : 'text-muted-foreground/50'
                      }`}>
                        <Lock className="w-[18px] h-[18px]" />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        {...field}
                        onFocus={() => setFocusedField('password')}
                        onBlur={(e) => { field.onBlur(); setFocusedField(null); }}
                        className="h-12 w-full pl-12 pr-12 bg-card border-border/60 rounded-xl text-[15px] placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200 touch-manipulation"
                        autoComplete="new-password"
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
                Creating account...
              </>
            ) : (
              <>
                Create account
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
            Already have an account?
          </span>
        </div>
      </div>

      {/* Sign in link */}
      <div className="text-center">
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium text-foreground rounded-xl border border-border/60 bg-card hover:bg-accent hover:border-border transition-all duration-200 touch-manipulation"
        >
          Sign in instead
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
