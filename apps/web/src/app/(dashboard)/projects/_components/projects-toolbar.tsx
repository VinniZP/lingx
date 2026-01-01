'use client';

import Link from 'next/link';
import { Search, LayoutGrid, List, SlidersHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@localeflow/sdk-nextjs';

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
    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-1">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('projects.search.placeholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-11 pl-12 pr-4 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* View toggle & actions */}
      <div className="flex items-center gap-3">
        {/* View toggle - h-11 to match other toolbar elements */}
        <div className="flex items-center h-11 rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`size-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="size-[18px]" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`size-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="size-[18px]" />
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
