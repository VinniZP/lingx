'use client';

import { BookOpen, Zap, Globe2 } from 'lucide-react';
import { useTranslation } from '@lingx/sdk-nextjs';

export function Resources() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 animate-fade-in-up stagger-5">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        {t('dashboard.resources.title')}
      </h2>
      <div className="island p-4 space-y-3">
        <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
          <BookOpen className="size-4 text-muted-foreground" />
          <span>{t('dashboard.resources.docs')}</span>
        </a>
        <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
          <Zap className="size-4 text-muted-foreground" />
          <span>{t('dashboard.resources.guide')}</span>
        </a>
        <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
          <Globe2 className="size-4 text-muted-foreground" />
          <span>{t('dashboard.resources.bestPractices')}</span>
        </a>
      </div>
    </div>
  );
}
