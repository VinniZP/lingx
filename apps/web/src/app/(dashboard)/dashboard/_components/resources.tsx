'use client';

import { BookOpen, Zap, Globe2 } from 'lucide-react';

export function Resources() {
  return (
    <div className="space-y-3 animate-fade-in-up stagger-5">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        Resources
      </h2>
      <div className="island p-4 space-y-3">
        <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
          <BookOpen className="size-4 text-muted-foreground" />
          <span>Documentation</span>
        </a>
        <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
          <Zap className="size-4 text-muted-foreground" />
          <span>Getting started guide</span>
        </a>
        <a href="#" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
          <Globe2 className="size-4 text-muted-foreground" />
          <span>Language best practices</span>
        </a>
      </div>
    </div>
  );
}
