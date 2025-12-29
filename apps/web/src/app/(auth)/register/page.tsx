'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Check } from 'lucide-react';

const PASSWORD_REQUIREMENTS = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  const { register } = useAuth();

  const passwordRequirementsMet = PASSWORD_REQUIREMENTS.filter(req => req.test(password));
  const isPasswordValid = passwordRequirementsMet.length === PASSWORD_REQUIREMENTS.length;
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error('Password requirements not met', {
        description: 'Please ensure your password meets all requirements.',
      });
      return;
    }

    if (!doPasswordsMatch) {
      toast.error('Passwords do not match', {
        description: 'Please ensure both passwords are identical.',
      });
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name || undefined);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-instrument-serif)' }}
        >
          Create your account
        </h1>
        <p className="text-muted-foreground">
          Start managing your translations in minutes
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Full name
              <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="h-11 w-full bg-background border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all touch-manipulation"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 w-full bg-background border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all touch-manipulation"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPasswordHints(true)}
              required
              disabled={isLoading}
              className="h-11 w-full bg-background border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all touch-manipulation"
              autoComplete="new-password"
            />
            {/* Password requirements */}
            {showPasswordHints && password.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {PASSWORD_REQUIREMENTS.map((req, index) => {
                  const isMet = req.test(password);
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        isMet ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors ${
                          isMet ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isMet && <Check className="w-3 h-3" />}
                      </div>
                      <span>{req.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className={`h-11 w-full bg-background border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all touch-manipulation ${
                confirmPassword.length > 0 && !doPasswordsMatch ? 'border-destructive' : ''
              }`}
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && !doPasswordsMatch && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all touch-manipulation"
          disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Already have an account?
          </span>
        </div>
      </div>

      {/* Sign in link */}
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors touch-manipulation"
        >
          Sign in instead
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
