'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Languages, Globe, GitBranch, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [panelMounted, setPanelMounted] = useState(false);
  const [formMounted, setFormMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isInitialMount = useRef(true);
  const { user, isLoading, pendingTwoFactor } = useAuth();

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (isLoading) return;

    // If user is authenticated and not pending 2FA, redirect to dashboard
    if (user && !pendingTwoFactor) {
      router.replace('/dashboard');
      return;
    }

    // If on 2FA page but no pending 2FA, redirect to login
    if (pathname === '/two-factor' && !pendingTwoFactor) {
      router.replace('/login');
      return;
    }
  }, [user, isLoading, pendingTwoFactor, pathname, router]);

  // Left panel - animate only on initial mount
  useEffect(() => {
    const timer = setTimeout(() => setPanelMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Form - animate on every route change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const timer = setTimeout(() => setFormMounted(true), 50);
      return () => clearTimeout(timer);
    }

    // Route change - reset and retrigger
    setFormMounted(false);
    const timer = setTimeout(() => setFormMounted(true), 50);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Show loading state while checking auth or if user is authenticated (will redirect)
  if (isLoading || (user && !pendingTwoFactor)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        {/* Base gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1625] via-[#1e1a2e] to-[#0f0d14]" />

        {/* Animated gradient mesh overlay */}
        <div className="absolute inset-0">
          {/* Primary glow - purple */}
          <div
            className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full transition-all duration-[2000ms] ${
              panelMounted
                ? 'opacity-60 scale-100'
                : 'opacity-0 scale-75'
            }`}
            style={{
              background: 'radial-gradient(circle, rgba(124, 110, 230, 0.35) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          {/* Secondary glow - coral/warm */}
          <div
            className={`absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full transition-all duration-[2000ms] delay-300 ${
              panelMounted
                ? 'opacity-50 scale-100'
                : 'opacity-0 scale-75'
            }`}
            style={{
              background: 'radial-gradient(circle, rgba(232, 145, 111, 0.25) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          {/* Accent glow - teal hint */}
          <div
            className={`absolute top-2/3 left-1/3 w-[300px] h-[300px] rounded-full transition-all duration-[2000ms] delay-500 ${
              panelMounted
                ? 'opacity-40 scale-100'
                : 'opacity-0 scale-75'
            }`}
            style={{
              background: 'radial-gradient(circle, rgba(91, 159, 224, 0.2) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </div>

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <Link
            href="/"
            className={`flex items-center gap-3 group transition-all duration-500 ${
              panelMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white transition-all duration-300 group-hover:bg-white/15 group-hover:scale-105">
              <Languages className="w-5 h-5" />
            </div>
            <span className="text-2xl font-semibold text-white tracking-tight">
              Localeflow
            </span>
          </Link>

          {/* Hero section */}
          <div className="space-y-10">
            {/* Main headline */}
            <div className="space-y-5">
              <h1
                className={`text-[2.75rem] xl:text-[3.25rem] text-white leading-[1.1] tracking-tight transition-all duration-700 ${
                  panelMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  fontFamily: 'var(--font-instrument-serif)',
                  transitionDelay: '100ms',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                Translations that
                <br />
                flow, <span className="text-[#F0A07A]">seamlessly</span>
              </h1>
              <p
                className={`text-lg text-white/60 leading-relaxed max-w-md transition-all duration-700 ${
                  panelMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: '200ms',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                Git-like branching for your localization workflow.
                Collaborate, review, and ship translations with confidence.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              {[
                { icon: Globe, label: 'Multi-language', sublabel: 'support' },
                { icon: GitBranch, label: 'Branch-based', sublabel: 'workflow' },
                { icon: Users, label: 'Team', sublabel: 'collaboration' },
              ].map((feature, index) => (
                <div
                  key={feature.label}
                  className={`group flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.06] hover:border-white/10 ${
                    panelMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
                  }`}
                  style={{
                    transitionDelay: `${350 + index * 100}ms`,
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center mb-3 transition-colors group-hover:bg-white/[0.12]">
                    <feature.icon className="w-5 h-5 text-white/70" />
                  </div>
                  <span className="text-sm font-medium text-white/90">{feature.label}</span>
                  <span className="text-xs text-white/40">{feature.sublabel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer badges */}
          <div className="flex items-center gap-3">
            {['Self-hosted', 'Open Source', 'Privacy-first'].map((badge, index) => (
              <span
                key={badge}
                className={`px-3 py-1.5 text-xs font-medium text-white/50 bg-white/[0.04] rounded-full border border-white/[0.06] transition-all duration-500 ${
                  panelMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{
                  transitionDelay: `${600 + index * 80}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-background relative">
        {/* Subtle gradient overlay at top */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-6 border-b border-border relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
              <Languages className="w-4 h-4" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Localeflow</span>
          </Link>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
          <div
            className={`w-full max-w-[420px] transition-all duration-500 ${
              formMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center text-sm text-muted-foreground relative z-10">
          <p>
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
