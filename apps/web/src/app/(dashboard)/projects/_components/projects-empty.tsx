'use client';

import Link from 'next/link';
import { FolderOpen, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';

interface ProjectsEmptyProps {
  type: 'no-projects' | 'no-results';
}

export function ProjectsEmpty({ type }: ProjectsEmptyProps) {
  const { t } = useTranslation();

  if (type === 'no-results') {
    return (
      <div className="island p-12 text-center animate-fade-in-up stagger-2">
        <Search className="size-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-1">{t('projects.search.noResults')}</h3>
        <p className="text-muted-foreground text-sm">
          {t('projects.search.noResultsHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="island p-12 text-center animate-fade-in-up stagger-2">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <FolderOpen className="size-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{t('projects.empty.title')}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
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
