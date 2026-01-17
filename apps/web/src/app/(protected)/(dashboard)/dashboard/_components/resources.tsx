'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { BookOpen, Globe2, Zap } from 'lucide-react';

export function Resources() {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in-up stagger-5 space-y-3">
      <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wider uppercase">
        {t('dashboard.resources.title')}
      </h2>
      <div className="island space-y-3 p-4">
        <a
          href="#"
          className="hover:text-primary flex items-center gap-3 text-sm transition-colors"
        >
          <BookOpen className="text-muted-foreground size-4" />
          <span>{t('dashboard.resources.docs')}</span>
        </a>
        <a
          href="#"
          className="hover:text-primary flex items-center gap-3 text-sm transition-colors"
        >
          <Zap className="text-muted-foreground size-4" />
          <span>{t('dashboard.resources.guide')}</span>
        </a>
        <a
          href="#"
          className="hover:text-primary flex items-center gap-3 text-sm transition-colors"
        >
          <Globe2 className="text-muted-foreground size-4" />
          <span>{t('dashboard.resources.bestPractices')}</span>
        </a>
      </div>
    </div>
  );
}
