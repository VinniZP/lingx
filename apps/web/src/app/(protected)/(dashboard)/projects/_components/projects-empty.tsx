'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { FolderOpen, Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface ProjectsEmptyProps {
  type: 'no-projects' | 'no-results';
}

export function ProjectsEmpty({ type }: ProjectsEmptyProps) {
  const { t } = useTranslation();

  if (type === 'no-results') {
    return (
      <div className="island animate-fade-in-up stagger-2 p-12 text-center">
        <Search className="text-muted-foreground/30 mx-auto mb-4 size-12" />
        <h3 className="mb-1 text-lg font-medium">{t('projects.search.noResults')}</h3>
        <p className="text-muted-foreground text-sm">{t('projects.search.noResultsHint')}</p>
      </div>
    );
  }

  return (
    <div className="island animate-fade-in-up stagger-2 p-12 text-center">
      <div className="bg-primary/10 mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl">
        <FolderOpen className="text-primary size-8" />
      </div>
      <h3 className="mb-2 text-xl font-semibold">{t('projects.empty.title')}</h3>
      <p className="text-muted-foreground mx-auto mb-6 max-w-sm">
        {t('projects.empty.description')}
      </p>
      <Button asChild size="lg" className="gap-2">
        <Link href="/projects/new">
          <Plus className="size-4" />
          {t('projects.empty.cta')}
        </Link>
      </Button>
    </div>
  );
}
