'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { projectApi, Project } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  FolderOpen,
  Globe2,
  ArrowRight,
  Search,
  Key,
  Clock,
  LayoutGrid,
  List,
  SlidersHorizontal,
  GitBranch,
} from 'lucide-react';

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  });

  const projects = data?.projects || [];

  // Filter projects by search
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate totals
  const totalKeys = 0; // Placeholder - would come from stats
  const allLanguages = new Set<string>();
  projects.forEach(p => p.languages.forEach(l => allLanguages.add(l.code)));

  if (error) {
    return (
      <div className="text-destructive p-6 rounded-xl bg-destructive/10 border border-destructive/20">
        Failed to load projects. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="island p-6 lg:p-8 animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage your localization projects
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-8 lg:gap-12">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Projects</p>
              <p className="text-2xl font-semibold tabular-nums">{projects.length}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Languages</p>
              <p className="text-2xl font-semibold tabular-nums">{allLanguages.size}</p>
            </div>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Keys</p>
              <p className="text-2xl font-semibold tabular-nums">{totalKeys.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-1">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        {/* View toggle & actions */}
        <div className="flex items-center gap-3">
          {/* View toggle - h-11 to match other toolbar elements */}
          <div className="flex items-center h-11 rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`size-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="size-[18px]" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`size-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="size-[18px]" />
            </button>
          </div>

          <Button variant="outline" className="hidden sm:flex">
            <SlidersHorizontal />
            Filters
          </Button>

          <Button asChild>
            <Link href="/projects/new">
              <Plus />
              <span className="hidden sm:inline">New Project</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
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
      ) : filteredProjects.length === 0 && projects.length > 0 ? (
        // No search results
        <div className="island p-12 text-center animate-fade-in-up stagger-2">
          <Search className="size-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No projects found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search query
          </p>
        </div>
      ) : projects.length === 0 ? (
        // Empty state
        <div className="island p-12 text-center animate-fade-in-up stagger-2">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="size-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your first project to start managing translations with version control and collaboration.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/projects/new">
              <Plus className="size-4" />
              Create your first project
            </Link>
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid view
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      ) : (
        // List view
        <div className="island divide-y divide-border animate-fade-in-up stagger-2">
          {filteredProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  // Placeholder progress
  const progress = Math.floor(Math.random() * 40) + 60;
  const keyCount = Math.floor(Math.random() * 500) + 50;

  return (
    <Link href={`/projects/${project.id}`}>
      <div className={`island p-6 card-hover group h-full animate-fade-in-up stagger-${Math.min(index + 2, 6)}`}>
        {/* Header with icon and date */}
        <div className="flex items-start justify-between mb-5">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
            <FolderOpen className="size-6 text-primary group-hover:text-primary-foreground transition-colors" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Project name and slug */}
        <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        <p className="text-sm text-muted-foreground font-mono mb-5">
          {project.slug}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-5 text-sm text-muted-foreground mb-5">
          <div className="flex items-center gap-2">
            <Key className="size-4" />
            <span>{keyCount} keys</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe2 className="size-4" />
            <span>{project.languages.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="size-4" />
            <span>main</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-success">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Language badges */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
          {project.languages.slice(0, 4).map((lang) => (
            <span
              key={lang.code}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
                lang.isDefault
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {lang.code}
            </span>
          ))}
          {project.languages.length > 4 && (
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground">
              +{project.languages.length - 4}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProjectListItem({ project }: { project: Project }) {
  const progress = Math.floor(Math.random() * 40) + 60;
  const keyCount = Math.floor(Math.random() * 500) + 50;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center gap-5 p-5 hover:bg-muted/50 transition-colors group"
    >
      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <FolderOpen className="size-6 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <span className="text-sm text-muted-foreground font-mono hidden sm:inline">
            {project.slug}
          </span>
        </div>
        <div className="flex items-center gap-5 mt-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Key className="size-4" />
            {keyCount} keys
          </span>
          <span className="flex items-center gap-2">
            <Globe2 className="size-4" />
            {project.languages.length} languages
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="hidden md:flex items-center gap-3 w-36">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-success w-10">{progress}%</span>
      </div>

      {/* Languages preview */}
      <div className="hidden lg:flex items-center gap-1.5">
        {project.languages.slice(0, 3).map((lang) => (
          <span
            key={lang.code}
            className="px-2 py-1 rounded-md text-xs font-semibold uppercase bg-muted text-muted-foreground"
          >
            {lang.code}
          </span>
        ))}
        {project.languages.length > 3 && (
          <span className="text-sm text-muted-foreground ml-1">+{project.languages.length - 3}</span>
        )}
      </div>

      {/* Updated date */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground w-28 justify-end">
        <Clock className="size-4" />
        {new Date(project.updatedAt).toLocaleDateString()}
      </div>

      <ArrowRight className="size-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
