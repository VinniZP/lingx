'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Languages,
  ArrowRight,
  GitBranch,
  Users,
  Zap,
  Shield,
  Globe,
  Code2,
} from 'lucide-react';

// Custom hook for hydration-safe mounted state
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const features = [
  {
    icon: GitBranch,
    title: 'Git-like branching',
    description: 'Create branches for translations, review changes, and merge with confidence.',
  },
  {
    icon: Users,
    title: 'Team collaboration',
    description: 'Invite translators, assign roles, and track progress in real-time.',
  },
  {
    icon: Zap,
    title: 'Lightning fast',
    description: 'Optimized for performance with instant search and live updates.',
  },
  {
    icon: Shield,
    title: 'Self-hosted',
    description: 'Your data stays on your infrastructure. Full control, always.',
  },
  {
    icon: Globe,
    title: 'Any language',
    description: 'Support for RTL, pluralization, and complex language rules.',
  },
  {
    icon: Code2,
    title: 'Developer-first',
    description: 'CLI tools, SDKs, and APIs designed for modern workflows.',
  },
];

export default function Home() {
  const mounted = useMounted();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <Languages className="w-4 h-4" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Localeflow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button className="gap-2">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 gradient-flow opacity-50" />

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl transition-all duration-1000 ${
              mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          />
          <div
            className={`absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-warm/5 blur-3xl transition-all duration-1000 delay-300 ${
              mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary transition-all duration-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Open source and self-hosted
            </div>

            {/* Headline */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight transition-all duration-700 delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              Localization management
              <br />
              <span className="text-gradient-brand">that flows</span>
            </h1>

            {/* Subheadline */}
            <p
              className={`text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Manage translations with git-like branching. Collaborate with your team,
              review changes, and ship localized products with confidence.
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Link href="/register">
                <Button size="lg" className="gap-2 h-12 px-6 text-base">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="https://github.com/localeflow/localeflow" target="_blank">
                <Button variant="outline" size="lg" className="h-12 px-6 text-base">
                  View on GitHub
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2
              className="text-3xl lg:text-4xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              Everything you need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete localization platform designed for modern development workflows.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative rounded-3xl bg-sidebar overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 gradient-flow-dark opacity-50" />
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-warm/10 blur-3xl" />

            <div className="relative px-8 py-16 lg:px-16 lg:py-24 text-center">
              <div className="max-w-2xl mx-auto space-y-6">
                <h2
                  className="text-3xl lg:text-4xl font-semibold text-sidebar-foreground tracking-tight"
                  style={{ fontFamily: 'var(--font-instrument-serif)' }}
                >
                  Ready to streamline your
                  <br />
                  <span className="text-warm">localization workflow?</span>
                </h2>
                <p className="text-sidebar-foreground/70 text-lg">
                  Join teams who trust Localeflow for their translation management.
                  Self-hosted, open source, and privacy-first.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link href="/register">
                    <Button size="lg" className="gap-2 h-12 px-6 text-base bg-sidebar-foreground text-sidebar hover:bg-sidebar-foreground/90">
                      Get started free
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <Languages className="w-4 h-4" />
              </div>
              <span className="font-semibold">Localeflow</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link href="https://github.com/localeflow/localeflow" className="hover:text-foreground transition-colors">
                GitHub
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Open source under MIT License
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
