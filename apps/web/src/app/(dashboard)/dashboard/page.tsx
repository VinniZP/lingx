'use client';

import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FolderOpen,
  Key,
  Globe,
  ArrowRight,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

const stats = [
  {
    title: 'Projects',
    value: '0',
    description: 'Active localization projects',
    icon: FolderOpen,
    href: '/projects',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Translation Keys',
    value: '0',
    description: 'Across all projects',
    icon: Key,
    href: '/projects',
    color: 'text-warm',
    bgColor: 'bg-warm/10',
  },
  {
    title: 'Languages',
    value: '0',
    description: 'Supported locales',
    icon: Globe,
    href: '/projects',
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
  },
];

const quickActions = [
  {
    title: 'Create a project',
    description: 'Start a new localization project',
    icon: Plus,
    href: '/projects/new',
    primary: true,
  },
  {
    title: 'Import translations',
    description: 'Import from JSON, YAML, or other formats',
    icon: TrendingUp,
    href: '/projects',
  },
  {
    title: 'Generate API key',
    description: 'Access translations programmatically',
    icon: Key,
    href: '/settings/api-keys',
  },
];

const recentActivity = [
  {
    action: 'Get started',
    description: 'Create your first project to begin managing translations',
    time: 'Now',
    icon: CheckCircle2,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome section */}
      <div className="space-y-2">
        <h1
          className="text-3xl lg:text-4xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-instrument-serif)' }}
        >
          {greeting()}, {displayName}
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your translations with git-like branching and seamless collaboration.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group touch-manipulation">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor} transition-transform group-hover:scale-110`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card
                  className={`h-full min-h-[88px] hover:shadow-md transition-all cursor-pointer group touch-manipulation ${
                    action.primary
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                          action.primary
                            ? 'bg-primary-foreground/20'
                            : 'bg-muted'
                        }`}
                      >
                        <action.icon
                          className={`h-5 w-5 ${
                            action.primary ? 'text-primary-foreground' : 'text-foreground'
                          }`}
                        />
                      </div>
                      <div>
                        <h3
                          className={`font-medium ${
                            action.primary ? '' : 'text-foreground'
                          }`}
                        >
                          {action.title}
                        </h3>
                        <p
                          className={`text-sm mt-0.5 ${
                            action.primary
                              ? 'text-primary-foreground/80'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <Card className="touch-manipulation">
            <CardContent className="pt-6">
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="p-2 rounded-lg bg-muted h-fit">
                        <activity.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Empty state / Getting started */}
      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="py-12">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-instrument-serif)' }}
              >
                Start your localization journey
              </h3>
              <p className="text-muted-foreground">
                Create your first project to begin managing translations across multiple languages
                with version control and collaboration features.
              </p>
            </div>
            <Button className="h-11 gap-2 touch-manipulation">
              Create your first project
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
