'use client';

import { FileText, GitBranch, CheckCircle2, Upload, Activity } from 'lucide-react';

interface ActivityFeedProps {
  hasProjects: boolean;
}

// Placeholder activity data - will be replaced with real API in future phase
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

export function ActivityFeed({ hasProjects }: ActivityFeedProps) {
  return (
    <div className="space-y-3 animate-fade-in-up stagger-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Recent Activity
        </h2>
        <span className="text-xs text-muted-foreground">Last 24 hours</span>
      </div>
      <div className="island divide-y divide-border">
        {hasProjects ? (
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
  );
}
