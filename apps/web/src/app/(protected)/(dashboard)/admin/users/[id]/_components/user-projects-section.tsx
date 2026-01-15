'use client';

import { cn } from '@/lib/utils';
import { tKey, useTranslation, type TKey } from '@lingx/sdk-nextjs';
import type { AdminUserProject } from '@lingx/shared';
import { ExternalLink, FolderOpen } from 'lucide-react';
import Link from 'next/link';

interface UserProjectsSectionProps {
  projects: AdminUserProject[];
}

type ProjectRole = 'OWNER' | 'MANAGER' | 'DEVELOPER';

const roleConfig: Record<
  ProjectRole,
  { bg: string; text: string; border: string; labelKey: TKey }
> = {
  OWNER: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    labelKey: tKey('members.roles.owner'),
  },
  MANAGER: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    labelKey: tKey('members.roles.manager'),
  },
  DEVELOPER: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    labelKey: tKey('members.roles.developer'),
  },
};

export function UserProjectsSection({ projects }: UserProjectsSectionProps) {
  const { t, td } = useTranslation();

  return (
    <div className="island">
      <div className="border-border/40 border-b p-5">
        <h3 className="font-semibold">{t('admin.users.projects')}</h3>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-muted/50 mb-4 flex size-14 items-center justify-center rounded-2xl">
            <FolderOpen className="text-muted-foreground size-7" />
          </div>
          <p className="text-muted-foreground">{t('admin.users.noProjects')}</p>
        </div>
      ) : (
        <div className="divide-border/40 divide-y">
          {projects.map((project) => {
            const config = roleConfig[project.role];
            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="group hover:bg-muted/20 flex items-center justify-between gap-4 p-5 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <FolderOpen className="text-primary size-5" />
                  </div>
                  <span className="truncate font-medium">{project.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-lg border px-2.5 py-1',
                      'text-[10px] font-bold tracking-widest uppercase',
                      config.bg,
                      config.text,
                      config.border
                    )}
                  >
                    {td(config.labelKey)}
                  </span>
                  <ExternalLink className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
