'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { projectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderOpen,
  Key,
  Globe2,
  ArrowRight,
  Plus,
  Upload,
  Languages,
  CheckCircle2,
  GitBranch,
  Users,
  Zap,
  Activity,
  FileText,
  Terminal,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

// Placeholder activity data
const recentActivity = [
  { id: 1, type: 'translation', description: 'Updated 12 keys in Spanish', project: 'Mobile App', timeAgo: '2 min ago' },
  { id: 2, type: 'branch', description: 'Created branch "feature/checkout"', project: 'Web Platform', timeAgo: '1 hour ago' },
  { id: 3, type: 'review', description: 'Approved German translations', project: 'Mobile App', timeAgo: '3 hours ago' },
  { id: 4, type: 'import', description: 'Imported 48 keys from JSON', project: 'API Docs', timeAgo: 'Yesterday' },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'translation': return FileText;
    case 'branch': return GitBranch;
    case 'review': return CheckCircle2;
    case 'import': return Upload;
    default: return Activity;
  }
};

export default function DashboardPage() {
  const { user, isManager } = useAuth();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  });

  const { data: allStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', projectsData?.projects?.map(p => p.id)],
    queryFn: async () => {
      if (!projectsData?.projects?.length) return null;
      const statsPromises = projectsData.projects.map(p =>
        projectApi.getStats(p.id).catch(() => null)
      );
      return Promise.all(statsPromises);
    },
    enabled: !!projectsData?.projects?.length,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const projects = projectsData?.projects || [];
  const projectCount = projects.length;

  const allLanguages = new Set<string>();
  projects.forEach(p => p.languages.forEach(l => allLanguages.add(l.code)));
  const languageCount = allLanguages.size;

  const totalKeys = allStats?.reduce((sum, stats) => sum + (stats?.totalKeys || 0), 0) || 0;
  const isLoading = projectsLoading || (projectCount > 0 && statsLoading);

  const recentProjects = projects.slice(0, 3).map(p => ({
    id: p.id,
    name: p.name,
    languages: p.languages.length,
    updatedAt: new Date(p.updatedAt).toLocaleDateString(),
  }));

  // Calculate completion percentage (placeholder logic)
  const completionRate = projectCount > 0 ? 87 : 0;

  return (
    <div className="space-y-8">
      {/* Hero Section - Greeting + Stats consolidated */}
      <div className="island p-6 lg:p-8 animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
              {greeting()}, {displayName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's your translation overview
            </p>
          </div>

          {/* Stats Row - Inline */}
          <div className="flex flex-wrap items-center gap-8 lg:gap-12">
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projects</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12 mt-1 mx-auto" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight mt-1">{projectCount}</p>
              )}
            </div>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Keys</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1 mx-auto" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight mt-1">{totalKeys.toLocaleString()}</p>
              )}
            </div>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Languages</p>
              {isLoading ? (
                <Skeleton className="h-8 w-8 mt-1 mx-auto" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight mt-1">{languageCount}</p>
              )}
            </div>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Complete</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12 mt-1 mx-auto" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight mt-1 text-success">{completionRate}%</p>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {projectCount > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall translation progress</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid - Asymmetric Layout */}
      <div className="grid gap-6 lg:grid-cols-12">

        {/* Left Column - Primary Action + Recent Projects */}
        <div className="lg:col-span-5 space-y-6">

          {/* Primary CTA Card */}
          <Link
            href="/projects/new"
            className="island p-6 card-hover group block animate-fade-in-up stagger-1"
          >
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Plus className="size-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Create new project</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Start a localization project with version control, branching, and team collaboration
                </p>
                <div className="mt-4 flex items-center text-primary text-sm font-medium">
                  Get started
                  <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* Recent Projects */}
          <div className="space-y-3 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Projects
              </h2>
              <Link href="/projects" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="island divide-y divide-border">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-28 mb-1.5" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentProjects.length > 0 ? (
                <>
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <FolderOpen className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.languages} language{project.languages !== 1 ? 's' : ''} · {project.updatedAt}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                  {/* Add project hint */}
                  <Link
                    href="/projects/new"
                    className="flex items-center gap-3 p-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <div className="size-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <Plus className="size-4" />
                    </div>
                    <span className="text-sm">Add another project</span>
                  </Link>
                </>
              ) : (
                <div className="p-8 text-center">
                  <div className="size-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <FolderOpen className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
                  <Button asChild size="sm">
                    <Link href="/projects/new">Create your first project</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column - Quick Actions */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-3 animate-fade-in-up stagger-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link href="/projects" className="island p-4 card-hover group flex items-center gap-3">
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Upload className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-medium text-sm">Import translations</p>
                  <p className="text-xs text-muted-foreground">JSON, YAML, XLIFF</p>
                </div>
              </Link>

              {isManager && (
                <Link href="/settings/api-keys" className="island p-4 card-hover group flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Key className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">API Keys</p>
                    <p className="text-xs text-muted-foreground">Manage access</p>
                  </div>
                </Link>
              )}

              <Link href="/projects" className="island p-4 card-hover group flex items-center gap-3">
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <GitBranch className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-medium text-sm">Manage branches</p>
                  <p className="text-xs text-muted-foreground">Version control</p>
                </div>
              </Link>

              <Link href="/projects" className="island p-4 card-hover group flex items-center gap-3">
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Users className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-medium text-sm">Team members</p>
                  <p className="text-xs text-muted-foreground">Collaborate</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Integration hint */}
          <div className="island p-4 bg-primary/5 border border-primary/10 animate-fade-in-up stagger-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Terminal className="size-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">CLI Available</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sync translations from your terminal
                </p>
                <code className="text-[10px] font-mono text-primary/70 mt-2 block">
                  npx localeflow pull
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-3 animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Activity
              </h2>
              <span className="text-xs text-muted-foreground">Last 24 hours</span>
            </div>
            <div className="island divide-y divide-border">
              {projectCount > 0 ? (
                recentActivity.map((item) => {
                  const Icon = getActivityIcon(item.type);
                  return (
                    <div key={item.id} className="p-4 flex items-start gap-3">
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.project} · {item.timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Activity className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Activity will appear here as you work
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resources section */}
          <div className="space-y-3 animate-fade-in-up stagger-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Resources
            </h2>
            <div className="island p-4 space-y-3">
              <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                <BookOpen className="size-4 text-muted-foreground" />
                <span>Documentation</span>
              </a>
              <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                <Zap className="size-4 text-muted-foreground" />
                <span>Getting started guide</span>
              </a>
              <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                <Globe2 className="size-4 text-muted-foreground" />
                <span>Language best practices</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding section - only show when no projects */}
      {!isLoading && projectCount === 0 && (
        <div className="island p-8 lg:p-10 animate-fade-in-up stagger-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
                <Languages className="size-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Welcome to LocaleFlow
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Professional translation management with git-like version control for modern teams
              </p>
            </div>

            {/* Onboarding steps */}
            <div className="grid sm:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-sm font-semibold text-primary">1</span>
                </div>
                <p className="font-medium text-sm">Create a project</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Define your source and target languages
                </p>
              </div>
              <div className="text-center">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-sm font-semibold text-primary">2</span>
                </div>
                <p className="font-medium text-sm">Add translation keys</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Import existing or create new keys
                </p>
              </div>
              <div className="text-center">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-sm font-semibold text-primary">3</span>
                </div>
                <p className="font-medium text-sm">Sync with your app</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use CLI or API to pull translations
                </p>
              </div>
            </div>

            <div className="text-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/projects/new">
                  <Plus className="size-4" />
                  Create your first project
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
