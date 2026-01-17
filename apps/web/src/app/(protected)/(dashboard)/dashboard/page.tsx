'use client';

import { useDashboardStats, useProjects } from '@/hooks';
import { useAuth } from '@/lib/auth';
import { ActivityFeed } from './_components/activity-feed';
import { DashboardHero } from './_components/dashboard-hero';
import { Onboarding } from './_components/onboarding';
import { QuickActions } from './_components/quick-actions';
import { RecentProjects } from './_components/recent-projects';
import { Resources } from './_components/resources';

export default function DashboardPage() {
  const { user, isManager } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: projectsData, isLoading: projectsLoading } = useProjects();

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const projects = projectsData?.projects || [];
  const isLoading = statsLoading || projectsLoading;
  const hasProjects = projects.length > 0;

  return (
    <div className="space-y-8">
      <DashboardHero displayName={displayName} stats={stats} isLoading={isLoading} />

      <div className="grid gap-6 lg:grid-cols-12">
        <RecentProjects projects={projects} isLoading={isLoading} />
        <QuickActions isManager={isManager} />

        <div className="space-y-6 lg:col-span-4">
          <ActivityFeed hasProjects={hasProjects} />
          <Resources />
        </div>
      </div>

      {!isLoading && !hasProjects && <Onboarding />}
    </div>
  );
}
