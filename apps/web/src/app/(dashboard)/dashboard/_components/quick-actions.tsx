'use client';

import Link from 'next/link';
import { Upload, Key, GitBranch, Users, Terminal } from 'lucide-react';

interface QuickActionsProps {
  isManager: boolean;
}

export function QuickActions({ isManager }: QuickActionsProps) {
  return (
    <div className="lg:col-span-3 space-y-6">
      <div className="space-y-3 animate-fade-in-up stagger-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Quick Actions
        </h2>
        <div className="space-y-3">
          <QuickActionLink
            href="/projects"
            icon={Upload}
            title="Import translations"
            description="JSON, YAML, XLIFF"
          />

          {isManager && (
            <QuickActionLink
              href="/settings/api-keys"
              icon={Key}
              title="API Keys"
              description="Manage access"
            />
          )}

          <QuickActionLink
            href="/projects"
            icon={GitBranch}
            title="Manage branches"
            description="Version control"
          />

          <QuickActionLink
            href="/projects"
            icon={Users}
            title="Team members"
            description="Collaborate"
          />
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
  );
}

interface QuickActionLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function QuickActionLink({ href, icon: Icon, title, description }: QuickActionLinkProps) {
  return (
    <Link href={href} className="island p-4 card-hover group flex items-center gap-3">
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
