'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { LayoutGrid, List, Plus, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

interface ProjectsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function ProjectsToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: ProjectsToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in-up stagger-1 flex flex-col gap-4 sm:flex-row">
      {/* Search */}
      <div className="relative max-w-md flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2" />
        <input
          type="text"
          placeholder={t('projects.search.placeholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-border bg-card placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary h-11 w-full rounded-xl border pr-4 pl-12 text-sm transition-colors focus:ring-2 focus:outline-none"
        />
      </div>

      {/* View toggle & actions */}
      <div className="flex items-center gap-3">
        {/* View toggle - h-11 to match other toolbar elements */}
        <div className="border-border bg-card flex h-11 items-center rounded-xl border p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`flex size-9 items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="size-4.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`flex size-9 items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="size-4.5" />
          </button>
        </div>

        <Button variant="outline" className="hidden sm:flex">
          <SlidersHorizontal />
          {t('projects.filters')}
        </Button>

        <Button asChild>
          <Link href="/projects/new">
            <Plus />
            <span className="hidden sm:inline">{t('projects.newProject.title')}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
