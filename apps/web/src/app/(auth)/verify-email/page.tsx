'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { profileApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type VerificationState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('Invalid verification link. No token provided.');
      return;
    }

    async function verifyEmail() {
      try {
        const profile = await profileApi.verifyEmailChange(token!);
        setNewEmail(profile.email);
        setState('success');
      } catch (error) {
        setState('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to verify email. The link may have expired.'
        );
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="island p-8 text-center">
          {state === 'loading' && (
            <div className="animate-fade-in-up">
              <div className="size-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Verifying Email</h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="animate-fade-in-up">
              <div className="size-16 mx-auto rounded-2xl bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="size-8 text-success" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Email Verified!</h1>
              <p className="text-muted-foreground mb-2">
                Your email has been successfully changed to:
              </p>
              <p className="font-medium text-lg mb-6 flex items-center justify-center gap-2">
                <Mail className="size-5 text-primary" />
                {newEmail}
              </p>
              <Button asChild className="gap-2">
                <Link href="/settings/profile">
                  Go to Profile
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="animate-fade-in-up">
              <div className="size-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
                <XCircle className="size-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Verification Failed</h1>
              <p className="text-muted-foreground mb-6">{errorMessage}</p>
              <div className="flex flex-col gap-3">
                <Button asChild variant="outline">
                  <Link href="/settings/profile">Go to Profile</Link>
                </Button>
                <Button asChild>
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Decorative background */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 size-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 -right-1/4 size-96 rounded-full bg-warm/5 blur-3xl" />
        </div>
      </div>
    </div>
  );
}
