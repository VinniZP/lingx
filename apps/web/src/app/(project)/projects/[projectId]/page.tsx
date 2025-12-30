'use client';

import { use, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { projectApi, ProjectTreeBranch } from '@/lib/api';
import { useProjectActivities } from '@/hooks';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings,
  Key,
  ChevronRight,
  GitBranch,
  GitMerge,
  Plus,
  FolderOpen,
  ChevronDown,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Edit,
  Zap,
  Activity,
} from 'lucide-react';
import { CreateSpaceDialog, CreateBranchDialog, MergeBranchDialog } from '@/components/dialogs';
import { ActivityItem } from '@/components/activity';
import { cn } from '@/lib/utils';
import type { ProjectTreeSpace } from '@/lib/api';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * ProjectDetailPage - Premium redesigned project hub
 *
 * Features:
 * - Hero section with inline stats and prominent CTA
 * - Asymmetric grid layout (7-5 split)
 * - Quick actions section
 * - Activity feed
 * - Inline space/branch management
 */
export default function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = use(params);

  // Dialog state
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [mergeBranchOpen, setMergeBranchOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<ProjectTreeSpace | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<ProjectTreeBranch | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectApi.getStats(projectId),
  });

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['project-tree', projectId],
    queryFn: () => projectApi.getTree(projectId),
  });

  const { data: activityData, isLoading: activityLoading } = useProjectActivities(projectId, 5);
  const activities = activityData?.activities || [];

  // Find default branch for quick access
  const defaultBranch = tree?.spaces
    .flatMap((s) => s.branches)
    .find((b) => b.isDefault);

  // All branches for merge dialog
  const allBranches = useMemo(() => {
    if (!tree?.spaces) return [];
    return tree.spaces.flatMap((space) => space.branches);
  }, [tree?.spaces]);

  // Calculate overall completion percentage
  const completionPercentage = useMemo(() => {
    if (!stats?.translationsByLanguage) return 0;
    const languages = Object.values(stats.translationsByLanguage);
    if (languages.length === 0) return 0;
    const totalPercentage = languages.reduce((sum, lang) => sum + (lang.percentage || 0), 0);
    return Math.round(totalPercentage / languages.length);
  }, [stats?.translationsByLanguage]);

  const handleCreateBranch = (space: ProjectTreeSpace) => {
    setSelectedSpace(space);
    setCreateBranchOpen(true);
  };

  const handleMergeBranch = (branch: ProjectTreeBranch) => {
    setSelectedBranch(branch);
    setMergeBranchOpen(true);
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="island p-6 lg:p-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex items-center gap-8">
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-destructive p-6 rounded-xl bg-destructive/10 border border-destructive/20">
        Project not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="island p-6 lg:p-8 animate-fade-in-up">
        {/* Row 1: Name + Inline Stats */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Project Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">
              /{project.slug}
            </p>
            {project.description && (
              <p className="text-muted-foreground mt-3 max-w-xl">
                {project.description}
              </p>
            )}
          </div>

          {/* Right: Inline Stats */}
          <div className="flex flex-wrap items-center gap-6 lg:gap-10">
            <StatPill
              label="Languages"
              value={project.languages.length}
            />
            <div className="w-px h-8 bg-border hidden sm:block" />
            <StatPill
              label="Keys"
              value={statsLoading ? '-' : stats?.totalKeys || 0}
            />
            <div className="w-px h-8 bg-border hidden sm:block" />
            <StatPill
              label="Complete"
              value={statsLoading ? '-' : `${completionPercentage}%`}
              highlight={completionPercentage === 100}
            />
          </div>
        </div>

        {/* Row 2: Full-width CTA */}
        {defaultBranch && (
          <div className="mt-6 pt-6 border-t border-border">
            <Link
              href={`/projects/${projectId}/translations/${defaultBranch.id}`}
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between w-full p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/15 hover:via-primary/10 border border-primary/20 transition-all gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Start Translating</h3>
                  <p className="text-muted-foreground text-sm">
                    Edit translations on the {defaultBranch.name} branch
                  </p>
                </div>
              </div>
              <Button className="gap-2 group-hover:gap-3 transition-all w-full sm:w-auto">
                Open Editor
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Asymmetric Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Content - 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Spaces & Branches */}
          <div className="island animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between p-6 pb-4">
              <div>
                <h2 className="text-lg font-semibold">Spaces & Branches</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize translations by space and work on feature branches
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateSpaceOpen(true)}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                New Space
              </Button>
            </div>

            <div className="px-6 pb-6">
              {treeLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : tree?.spaces.length === 0 ? (
                <div className="text-center py-12 relative rounded-xl bg-muted/30">
                  <div className="relative">
                    <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 mx-auto flex items-center justify-center mb-4">
                      <FolderOpen className="size-7 text-amber-600" />
                    </div>
                    <p className="text-muted-foreground mb-4">No spaces yet</p>
                    <Button
                      onClick={() => setCreateSpaceOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="size-4" />
                      Create First Space
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tree?.spaces.map((space) => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      projectId={projectId}
                      onCreateBranch={() => handleCreateBranch(space)}
                      onMergeBranch={handleMergeBranch}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Translation Coverage */}
          <div className="island animate-fade-in-up stagger-3">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold">Translation Coverage</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Progress by language
              </p>
            </div>

            <div className="px-6 pb-6">
              {statsLoading ? (
                <div className="space-y-5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-2.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {project.languages.map((lang) => {
                    const langStats = stats?.translationsByLanguage[lang.code];
                    const percentage = langStats?.percentage || 0;
                    const isComplete = percentage === 100;

                    return (
                      <div key={lang.code} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{lang.name}</span>
                            {lang.isDefault && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                default
                              </span>
                            )}
                            {isComplete && (
                              <CheckCircle2 className="size-4 text-success" />
                            )}
                          </div>
                          <span className="text-muted-foreground font-mono text-xs">
                            {langStats?.translated || 0} / {langStats?.total || 0}{' '}
                            <span className={cn(
                              "font-semibold",
                              isComplete ? "text-success" : "text-foreground"
                            )}>
                              ({percentage}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              isComplete
                                ? 'bg-success'
                                : 'bg-primary'
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3 animate-fade-in-up stagger-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Quick Actions
            </h2>
            <div className="space-y-3">
              {defaultBranch && (
                <QuickActionCard
                  href={`/projects/${projectId}/translations/${defaultBranch.id}`}
                  icon={Edit}
                  title="Edit Translations"
                  subtitle="Manage keys and values"
                />
              )}
              <QuickActionCard
                href={`/projects/${projectId}/environments`}
                icon={Zap}
                title="Environments"
                subtitle="Production, staging, dev"
              />
              <QuickActionCard
                href="/settings/api-keys"
                icon={Key}
                title="API Keys"
                subtitle="Manage access tokens"
              />
              <QuickActionCard
                href={`/projects/${projectId}/settings`}
                icon={Settings}
                title="Project Settings"
                subtitle="Languages, members"
              />
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-3 animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Activity
              </h2>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </div>

            <div className="island divide-y divide-border">
              {activityLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="size-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Activity className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                </div>
              ) : (
                activities.map((item) => (
                  <ActivityItem key={item.id} activity={item} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateSpaceDialog
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
        projectId={projectId}
      />

      {selectedSpace && (
        <CreateBranchDialog
          open={createBranchOpen}
          onOpenChange={setCreateBranchOpen}
          projectId={projectId}
          spaceId={selectedSpace.id}
          spaceName={selectedSpace.name}
          branches={selectedSpace.branches}
        />
      )}

      <MergeBranchDialog
        open={mergeBranchOpen}
        onOpenChange={setMergeBranchOpen}
        projectId={projectId}
        sourceBranch={selectedBranch}
        allBranches={allBranches}
      />
    </div>
  );
}

/**
 * StatPill - Inline stat display for hero section
 */
function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={cn(
        "text-2xl lg:text-3xl font-semibold tracking-tight mt-1",
        highlight && "text-success"
      )}>
        {value}
      </p>
    </div>
  );
}

/**
 * QuickActionCard - Compact action link with icon
 */
function QuickActionCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="island p-4 card-hover group flex items-center gap-3"
    >
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}

/**
 * SpaceCard - Collapsible card showing a space and its branches
 */
function SpaceCard({
  space,
  projectId,
  onCreateBranch,
  onMergeBranch,
}: {
  space: ProjectTreeSpace;
  projectId: string;
  onCreateBranch: () => void;
  onMergeBranch: (branch: ProjectTreeBranch) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-xl overflow-hidden bg-card/50 card-hover">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 flex items-center justify-center">
              <FolderOpen className="size-5 text-amber-600" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <div className="font-semibold">{space.name}</div>
              <div className="text-sm text-muted-foreground">
                {space.branches.length} branch{space.branches.length !== 1 ? 'es' : ''}
              </div>
            </div>
          </div>
          <div className={cn(
            "p-1.5 rounded-md transition-all",
            isOpen ? "bg-muted/50" : "hover:bg-muted/50"
          )}>
            {isOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border px-4 py-3 space-y-1 bg-background/50">
            {space.branches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <Link
                  href={`/projects/${projectId}/translations/${branch.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <GitBranch className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium group-hover:text-primary transition-colors truncate">
                    {branch.name}
                  </span>
                  {branch.isDefault && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                      default
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground font-mono hidden sm:inline">
                    {branch.keyCount} keys
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMergeBranch(branch);
                    }}
                    className="size-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label={`Merge ${branch.name} branch`}
                  >
                    <GitMerge className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground mt-1 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onCreateBranch();
              }}
            >
              <Plus className="size-4" />
              New Branch
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
