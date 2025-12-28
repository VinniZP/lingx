'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Key, ArrowLeft, Shield, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

const settingsCards = [
  {
    title: 'API Keys',
    description: 'Generate and manage API keys for CLI and SDK authentication',
    icon: Key,
    href: '/settings/api-keys',
    color: 'text-warm',
    bgColor: 'bg-warm/10',
  },
  {
    title: 'Security',
    description: 'Manage your password and security preferences',
    icon: Shield,
    href: '/settings/security',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    disabled: true,
  },
];

export default function SettingsPage() {
  const { isManager, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isManager) {
      router.push('/projects');
    }
  }, [isManager, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1
              className="text-3xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account and organization settings
            </p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {settingsCards.map((card) => (
          <Link
            key={card.title}
            href={card.disabled ? '#' : card.href}
            className={card.disabled ? 'cursor-not-allowed' : ''}
          >
            <Card
              className={`h-full transition-all ${
                card.disabled
                  ? 'opacity-50'
                  : 'hover:border-primary/50 hover:shadow-md cursor-pointer'
              } group`}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg ${card.bgColor} transition-transform group-hover:scale-110`}
                  >
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {card.title}
                      {card.disabled && (
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Coming Soon
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {card.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
