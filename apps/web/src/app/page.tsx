'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthRedirect } from '@/components/auth-redirect';
import { useTranslation, tKey, type TranslationKey } from '@localeflow/sdk-nextjs';
import {
  Languages,
  ArrowRight,
  GitBranch,
  Users,
  Zap,
  Shield,
  Globe,
  Code2,
  Check,
  Star,
  ArrowUpRight,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Floating language chips that animate across the hero
const floatingLanguages = [
  { code: 'EN', label: 'English', delay: '0s', duration: '20s', top: '15%', startX: '-10%' },
  { code: 'DE', label: 'Deutsch', delay: '3s', duration: '25s', top: '35%', startX: '-15%' },
  { code: 'FR', label: 'Français', delay: '7s', duration: '22s', top: '60%', startX: '-5%' },
  { code: 'JA', label: '日本語', delay: '2s', duration: '28s', top: '80%', startX: '-12%' },
  { code: 'ES', label: 'Español', delay: '5s', duration: '24s', top: '25%', startX: '-8%' },
  { code: 'ZH', label: '中文', delay: '9s', duration: '26s', top: '70%', startX: '-18%' },
];

// Feature config with typed translation keys
interface FeatureConfig {
  icon: typeof GitBranch;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  size: 'large' | 'normal';
  gradient: string;
}

const featureConfig: FeatureConfig[] = [
  {
    icon: GitBranch,
    titleKey: tKey('landing.features.branching.title'),
    descriptionKey: tKey('landing.features.branching.description'),
    size: 'large',
    gradient: 'from-primary/20 via-primary/5 to-transparent',
  },
  {
    icon: Users,
    titleKey: tKey('landing.features.collaboration.title'),
    descriptionKey: tKey('landing.features.collaboration.description'),
    size: 'normal',
    gradient: 'from-warm/20 via-warm/5 to-transparent',
  },
  {
    icon: Zap,
    titleKey: tKey('landing.features.fast.title'),
    descriptionKey: tKey('landing.features.fast.description'),
    size: 'normal',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  },
  {
    icon: Shield,
    titleKey: tKey('landing.features.secure.title'),
    descriptionKey: tKey('landing.features.secure.description'),
    size: 'large',
    gradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
  },
  {
    icon: Globe,
    titleKey: tKey('landing.features.anyLanguage.title'),
    descriptionKey: tKey('landing.features.anyLanguage.description'),
    size: 'normal',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
  },
  {
    icon: Code2,
    titleKey: tKey('landing.features.developerFirst.title'),
    descriptionKey: tKey('landing.features.developerFirst.description'),
    size: 'normal',
    gradient: 'from-pink-500/20 via-pink-500/5 to-transparent',
  },
];

// Benefits config with typed translation keys
interface BenefitConfig {
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}

const benefitConfig: BenefitConfig[] = [
  { labelKey: tKey('landing.benefits.selfHosted'), descriptionKey: tKey('landing.benefits.selfHostedDesc') },
  { labelKey: tKey('landing.benefits.openSource'), descriptionKey: tKey('landing.benefits.openSourceDesc') },
  { labelKey: tKey('landing.benefits.gitLike'), descriptionKey: tKey('landing.benefits.gitLikeDesc') },
  { labelKey: tKey('landing.benefits.devFirst'), descriptionKey: tKey('landing.benefits.devFirstDesc') },
];

// Mock translation editor preview data
const mockTranslations = [
  { key: 'app.welcome.title', en: 'Welcome to the app', de: 'Willkommen in der App', status: 'complete' },
  { key: 'app.welcome.subtitle', en: 'Get started in seconds', de: 'Starten Sie in Sekunden', status: 'complete' },
  { key: 'common.button.save', en: 'Save changes', de: 'Änderungen speichern', status: 'review' },
  { key: 'common.button.cancel', en: 'Cancel', de: 'Abbrechen', status: 'complete' },
  { key: 'errors.not_found', en: 'Page not found', de: '', status: 'missing' },
];

function TranslationEditorMockup() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Browser chrome */}
      <div className="island overflow-hidden shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-background/50 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>localhost:3000/translations</span>
            </div>
          </div>
        </div>

        {/* Editor content */}
        <div className="bg-card">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                <GitBranch className="w-3 h-3" />
                <span>feature/german-translations</span>
              </div>
              <span className="text-xs text-muted-foreground">3 changes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">EN</div>
              <div className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">DE</div>
            </div>
          </div>

          {/* Translation rows */}
          <div className="divide-y divide-border">
            {mockTranslations.map((t, i) => (
              <div key={t.key} className={cn(
                "grid grid-cols-[1fr,1.5fr,1.5fr,auto] gap-4 px-4 py-3 text-sm transition-colors",
                i === 2 && "bg-primary/5"
              )}>
                <code className="font-mono text-xs text-muted-foreground truncate">{t.key}</code>
                <span className="text-foreground/80">{t.en}</span>
                <span className={cn(
                  "text-foreground",
                  t.status === 'missing' && "text-muted-foreground italic"
                )}>
                  {t.de || 'Missing translation'}
                </span>
                <div className={cn(
                  "w-2 h-2 rounded-full self-center",
                  t.status === 'complete' && "bg-emerald-500",
                  t.status === 'review' && "bg-amber-500",
                  t.status === 'missing' && "bg-red-400"
                )} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating decoration cards */}
      <div className="absolute -left-8 top-1/4 animate-float-slow hidden lg:block">
        <div className="island px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">Auto-saved</span>
          </div>
        </div>
      </div>

      <div className="absolute -right-6 top-1/3 animate-float-delayed hidden lg:block">
        <div className="island px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">3 translators online</span>
          </div>
        </div>
      </div>

      <div className="absolute -right-4 bottom-1/4 animate-float hidden lg:block">
        <div className="island px-3 py-2 shadow-lg border-emerald-500/30">
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">87% complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingLanguageChip({ code, label, delay, duration, top, startX }: {
  code: string;
  label: string;
  delay: string;
  duration: string;
  top: string;
  startX: string;
}) {
  return (
    <div
      className="absolute flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-xs font-medium shadow-sm animate-float-horizontal opacity-40"
      style={{
        top,
        left: startX,
        animationDelay: delay,
        animationDuration: duration,
      }}
    >
      <span className="text-primary font-semibold">{code}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export default function Home() {
  const { t, td } = useTranslation();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Silent auth redirect for logged-in users */}
      <AuthRedirect to="/dashboard" />

      {/* Grain overlay for texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary text-primary-foreground transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/25">
              <Languages className="size-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">{t('landing.brand')}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" className="h-10">
                {t('landing.signIn')}
              </Button>
            </Link>
            <Link href="/register">
              <Button className="h-10 gap-2 shadow-lg shadow-primary/25">
                {t('landing.getStarted')}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl animate-pulse-slow" />
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-warm/15 to-transparent blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent blur-3xl animate-pulse-slow" />
        </div>

        {/* Floating language chips */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
          {floatingLanguages.map((lang) => (
            <FloatingLanguageChip key={lang.code} {...lang} />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          {/* Text content */}
          <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
            {/* Badge */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                {t('landing.openSourceBadge')}
              </div>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight leading-[1.1] animate-fade-in-up stagger-1"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              {t('landing.headline')}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-warm bg-clip-text text-transparent">
                {t('landing.headlineHighlight')}
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up stagger-2">
              {t('landing.subheadline')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up stagger-3">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 gap-2 text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                  {t('landing.startForFree')}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="https://github.com/localeflow/localeflow" target="_blank">
                <Button variant="outline" size="lg" className="h-12 px-8 gap-2 text-base group">
                  <Terminal className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  {t('landing.viewOnGitHub')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Product mockup */}
          <div className="animate-fade-in-up stagger-4">
            <TranslationEditorMockup />
          </div>
        </div>
      </section>

      {/* Benefits section */}
      <section className="py-12 lg:py-16 border-y border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {benefitConfig.map((benefit, i) => (
              <div
                key={benefit.labelKey}
                className={cn(
                  "text-center animate-fade-in-up",
                  i === 0 && "stagger-1",
                  i === 1 && "stagger-2",
                  i === 2 && "stagger-3",
                  i === 3 && "stagger-4"
                )}
              >
                <div className="text-lg font-semibold text-foreground">
                  {td(benefit.labelKey)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{td(benefit.descriptionKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features section - Bento grid */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16 animate-fade-in-up">
            <h2
              className="text-3xl lg:text-5xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              {t('landing.features.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          {/* Bento Grid - Asymmetric layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {featureConfig.map((feature, i) => (
              <div
                key={feature.titleKey}
                className={cn(
                  "group relative island p-6 lg:p-8 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in-up",
                  feature.size === 'large' && "md:col-span-2 lg:col-span-1 lg:row-span-2",
                  i === 0 && "stagger-1",
                  i === 1 && "stagger-2",
                  i === 2 && "stagger-3",
                  i === 3 && "stagger-4",
                  i === 4 && "stagger-5",
                  i === 5 && "stagger-6"
                )}
              >
                {/* Background gradient */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  feature.gradient
                )} />

                <div className={cn(
                  "relative space-y-4",
                  feature.size === 'large' && "lg:space-y-6"
                )}>
                  {/* Icon */}
                  <div className={cn(
                    "flex items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors",
                    feature.size === 'large' ? "size-14 lg:size-16" : "size-12"
                  )}>
                    <feature.icon className={cn(
                      "text-primary",
                      feature.size === 'large' ? "size-7 lg:size-8" : "size-6"
                    )} />
                  </div>

                  {/* Content */}
                  <div className={cn(feature.size === 'large' && "lg:space-y-3")}>
                    <h3 className={cn(
                      "font-semibold",
                      feature.size === 'large' ? "text-xl lg:text-2xl" : "text-lg"
                    )}>
                      {td(feature.titleKey)}
                    </h3>
                    <p className={cn(
                      "text-muted-foreground leading-relaxed",
                      feature.size === 'large' ? "text-base lg:text-lg" : "text-sm"
                    )}>
                      {td(feature.descriptionKey)}
                    </p>
                  </div>

                  {/* Large card extra content */}
                  {feature.size === 'large' && (
                    <div className="hidden lg:flex items-center gap-2 pt-4 text-sm text-muted-foreground">
                      <ArrowUpRight className="size-4" />
                      <span>{t('common.learnMore')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source section */}
      <section className="py-16 lg:py-20 bg-muted/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            <div className="island p-8 lg:p-12 text-center relative overflow-hidden">
              {/* GitHub icon */}
              <div className="flex justify-center mb-6">
                <div className="size-16 rounded-2xl bg-foreground/5 flex items-center justify-center">
                  <svg className="size-8 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <h3
                className="text-2xl lg:text-3xl font-semibold mb-4"
                style={{ fontFamily: 'var(--font-instrument-serif)' }}
              >
                {t('landing.openSourceSection.title')}
              </h3>

              <p className="text-muted-foreground text-lg leading-relaxed mb-6 max-w-xl mx-auto">
                {t('landing.openSourceSection.description')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="https://github.com/localeflow/localeflow" target="_blank">
                  <Button variant="outline" className="h-11 px-6 gap-2">
                    <Star className="size-4" />
                    {t('landing.openSourceSection.starOnGitHub')}
                  </Button>
                </Link>
                <Link href="https://github.com/localeflow/localeflow/issues" target="_blank">
                  <Button variant="ghost" className="h-11 px-6 gap-2">
                    <ArrowUpRight className="size-4" />
                    {t('landing.openSourceSection.reportIssue')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative island overflow-hidden bg-gradient-to-br from-sidebar to-sidebar/95">
            {/* Background decoration */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-warm/10 blur-3xl" />
              {/* Grid pattern */}
              <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
            </div>

            <div className="relative px-8 py-16 lg:px-16 lg:py-24 text-center">
              <div className="max-w-2xl mx-auto space-y-6">
                <h2
                  className="text-3xl lg:text-5xl font-semibold text-sidebar-foreground tracking-tight animate-fade-in-up"
                  style={{ fontFamily: 'var(--font-instrument-serif)' }}
                >
                  {t('landing.cta.title')}
                  <br />
                  <span className="bg-gradient-to-r from-warm to-primary bg-clip-text text-transparent">
                    {t('landing.cta.titleHighlight')}
                  </span>
                </h2>
                <p className="text-sidebar-foreground/70 text-lg animate-fade-in-up stagger-1">
                  {t('landing.cta.description')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in-up stagger-2">
                  <Link href="/register">
                    <Button size="lg" className="h-12 px-8 gap-2 text-base bg-sidebar-foreground text-sidebar hover:bg-sidebar-foreground/90 shadow-xl">
                      {t('landing.cta.getStartedFree')}
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/docs">
                    <Button variant="outline" size="lg" className="h-12 px-8 text-base border-sidebar-foreground/20 text-sidebar-foreground hover:bg-sidebar-foreground/10">
                      {t('landing.cta.readTheDocs')}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Brand column */}
            <div className="col-span-2 lg:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center size-10 rounded-xl bg-primary text-primary-foreground">
                  <Languages className="size-5" />
                </div>
                <span className="text-xl font-semibold">{t('landing.brand')}</span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                {t('landing.footer.description')}
              </p>
            </div>

            {/* Project */}
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.project')}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="https://github.com/localeflow/localeflow" className="hover:text-foreground transition-colors">{t('landing.footer.github')}</Link></li>
                <li><Link href="https://github.com/localeflow/localeflow/issues" className="hover:text-foreground transition-colors">{t('landing.footer.issues')}</Link></li>
                <li><Link href="https://github.com/localeflow/localeflow/discussions" className="hover:text-foreground transition-colors">{t('landing.footer.discussions')}</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.resources')}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition-colors">{t('landing.footer.documentation')}</Link></li>
                <li><Link href="https://github.com/localeflow/localeflow#readme" className="hover:text-foreground transition-colors">{t('landing.footer.readme')}</Link></li>
                <li><Link href="https://github.com/localeflow/localeflow/blob/main/CONTRIBUTING.md" className="hover:text-foreground transition-colors">{t('landing.footer.contributing')}</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.legal')}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="https://github.com/localeflow/localeflow/blob/main/LICENSE" className="hover:text-foreground transition-colors">{t('landing.footer.mitLicense')}</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t('landing.footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <div className="flex items-center gap-4">
              <Link href="https://github.com/localeflow" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link href="https://twitter.com/localeflow" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes float-horizontal {
          0% { transform: translateX(0); }
          100% { transform: translateX(120vw); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }

        @keyframes pulse-slower {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.08); }
        }

        .animate-float-horizontal {
          animation: float-horizontal linear infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 3.5s ease-in-out infinite;
          animation-delay: 1s;
        }

        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }

        .animate-pulse-slower {
          animation: pulse-slower 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
