'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks';
import { ProjectsHeader } from './_components/projects-header';
import { ProjectsToolbar } from './_components/projects-toolbar';
import { ProjectCard } from './_components/project-card';
import { ProjectListItem } from './_components/project-list-item';
import { ProjectsEmpty } from './_components/projects-empty';

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading, error } = useProjects();

  const projects = data?.projects || [];

  // Filter projects by search
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="text-destructive p-6 rounded-xl bg-destructive/10 border border-destructive/20">
        Failed to load projects. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectsHeader projects={projects} />

      <ProjectsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Content */}
      {isLoading ? (
        <ProjectsLoadingSkeleton viewMode={viewMode} />
      ) : filteredProjects.length === 0 && projects.length > 0 ? (
        <ProjectsEmpty type="no-results" />
      ) : projects.length === 0 ? (
        <ProjectsEmpty type="no-projects" />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      ) : (
        <div className="island divide-y divide-border animate-fade-in-up stagger-2">
          {filteredProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsLoadingSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return (
    <div className={viewMode === 'grid'
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : "space-y-3"
    }>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="island p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
