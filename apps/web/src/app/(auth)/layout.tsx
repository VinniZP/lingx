'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Languages } from 'lucide-react';

// Custom hook for hydration-safe mounted state
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mounted = useMounted();

  return (
    <div className="relative min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-sidebar">
        {/* Gradient background with flow animation */}
        <div className="absolute inset-0 gradient-flow-dark" />

        {/* Decorative flowing shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
            }`}
          />
          <div
            className={`absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-warm/10 blur-3xl transition-all duration-1000 delay-300 ${
              mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
          />
          <div
            className={`absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-brand/15 blur-3xl transition-all duration-1000 delay-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <Languages className="w-5 h-5" />
            </div>
            <span className="text-2xl font-semibold text-sidebar-foreground tracking-tight">
              Localeflow
            </span>
          </Link>

          {/* Hero text */}
          <div className="space-y-6 max-w-md">
            <h1
              className={`text-4xl lg:text-5xl font-display text-sidebar-foreground leading-tight transition-all duration-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              Translations that flow,
              <br />
              <span className="text-warm">seamlessly</span>
            </h1>
            <p
              className={`text-lg text-sidebar-foreground/70 leading-relaxed transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Git-like branching for your localization workflow.
              Collaborate, review, and ship translations with confidence.
            </p>
          </div>

          {/* Footer */}
          <div
            className={`flex items-center gap-2 text-sm text-sidebar-foreground/50 transition-all duration-700 delay-400 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span>Self-hosted</span>
            <span className="w-1 h-1 rounded-full bg-sidebar-foreground/30" />
            <span>Open Source</span>
            <span className="w-1 h-1 rounded-full bg-sidebar-foreground/30" />
            <span>Privacy-first</span>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Languages className="w-4 h-4" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Localeflow</span>
          </Link>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div
            className={`w-full max-w-[400px] transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center text-sm text-muted-foreground">
          <p>
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-foreground hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-foreground hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
