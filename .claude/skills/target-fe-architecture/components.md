# Component Patterns

Guidelines for splitting and organizing React components in LocaleFlow.

## When to Split

| Condition | Action |
|-----------|--------|
| Component > 200 lines | Split into sub-components |
| Complex logic mixed with JSX | Extract to hook |
| Same component used 2+ places | Move to shared location |
| Inline function component | Extract to file if > 30 lines |

## Co-location Strategy

### Page-specific Components

Use `_components/` folder (Next.js private folder convention):

```
app/(dashboard)/dashboard/
├── page.tsx                  # Main page
├── _components/              # Private to this route
│   ├── dashboard-hero.tsx
│   ├── recent-projects.tsx
│   ├── quick-actions.tsx
│   └── activity-feed.tsx
```

### Shared Components

Place in `components/` when used across multiple pages:

```
components/
├── ui/                       # shadcn/ui base components
├── layout/                   # Layout components (sidebar, header)
├── dialogs/                  # Shared dialogs
├── translations/             # Translation-related components
└── branch/                   # Branch-related components
```

## Component Types

### Page Component (Orchestrator)

```typescript
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useDashboardStats } from '@/hooks';
import { useProjects } from '@/hooks';
import { DashboardHero } from './_components/dashboard-hero';
import { RecentProjects } from './_components/recent-projects';
import { QuickActions } from './_components/quick-actions';
import { ActivityFeed } from './_components/activity-feed';
import { Resources } from './_components/resources';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  if (statsLoading || projectsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <DashboardHero stats={stats} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <RecentProjects projects={projects?.slice(0, 3)} />
          <QuickActions />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <ActivityFeed />
          <Resources />
        </div>
      </div>
    </div>
  );
}
```

**Characteristics:**
- ~50 lines target
- Fetches data via hooks
- Composes child components
- Passes data down via props
- Handles loading states

### Presentational Component

```typescript
// app/(dashboard)/dashboard/_components/dashboard-hero.tsx
import type { DashboardStats } from '@localeflow/shared';
import { Folder, Key, Languages, CheckCircle } from 'lucide-react';

interface DashboardHeroProps {
  stats: DashboardStats | undefined;
}

export function DashboardHero({ stats }: DashboardHeroProps) {
  return (
    <div className="island p-6 lg:p-8 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Folder}
          label="Projects"
          value={stats?.totalProjects ?? 0}
        />
        <StatCard
          icon={Key}
          label="Keys"
          value={stats?.totalKeys ?? 0}
        />
        <StatCard
          icon={Languages}
          label="Languages"
          value={stats?.totalLanguages ?? 0}
        />
        <StatCard
          icon={CheckCircle}
          label="Complete"
          value={`${Math.round((stats?.completionRate ?? 0) * 100)}%`}
        />
      </div>
    </div>
  );
}

// Private helper component - OK to keep in same file if small
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="text-center">
      <Icon className="size-5 mx-auto text-muted-foreground mb-2" />
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
```

**Characteristics:**
- Receives data via props
- No data fetching
- Pure rendering
- < 100 lines typically
- Can have small private helpers

### List Component with Items

```typescript
// app/(dashboard)/dashboard/_components/recent-projects.tsx
import Link from 'next/link';
import type { Project } from '@localeflow/shared';
import { ChevronRight } from 'lucide-react';

interface RecentProjectsProps {
  projects: Project[] | undefined;
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  if (!projects?.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3 animate-fade-in-up stagger-2">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        Recent Projects
      </h2>
      <div className="island divide-y divide-border">
        {projects.map(project => (
          <ProjectItem key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function ProjectItem({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{project.name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {project.description || 'No description'}
        </p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="island p-8 text-center">
      <p className="text-muted-foreground">No projects yet</p>
    </div>
  );
}
```

## Props Patterns

### Required vs Optional

```typescript
interface ComponentProps {
  // Required - always needed
  id: string;

  // Optional with default
  variant?: 'default' | 'compact';

  // Optional, undefined allowed
  description?: string;

  // Callback
  onSelect?: (id: string) => void;
}

export function Component({
  id,
  variant = 'default',
  description,
  onSelect,
}: ComponentProps) {
  // ...
}
```

### Children Pattern

```typescript
interface CardProps {
  title: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="island">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

### Render Props (When Needed)

```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

export function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <div>
      {items.map((item, index) => (
        <div key={keyExtractor(item)}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}
```

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Page component | `page.tsx` | `dashboard/page.tsx` |
| Layout | `layout.tsx` | `dashboard/layout.tsx` |
| Co-located | `kebab-case.tsx` | `_components/dashboard-hero.tsx` |
| Shared | `kebab-case.tsx` | `components/ui/button.tsx` |

## Import Order

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';

// 3. Internal hooks
import { useDashboardStats } from '@/hooks';

// 4. Internal components
import { Button } from '@/components/ui/button';
import { DashboardHero } from './_components/dashboard-hero';

// 5. Types
import type { DashboardStats } from '@localeflow/shared';

// 6. Utilities
import { cn } from '@/lib/utils';
```

## Anti-patterns

### Don't fetch data in presentational components

```typescript
// BAD - fetching in child
function DashboardHero() {
  const { data } = useDashboardStats(); // ❌
  return <div>{data?.totalProjects}</div>;
}

// GOOD - receive via props
function DashboardHero({ stats }: { stats: DashboardStats }) {
  return <div>{stats.totalProjects}</div>;
}
```

### Don't pass too many props

```typescript
// BAD - prop drilling
<DashboardHero
  totalProjects={stats.totalProjects}
  totalKeys={stats.totalKeys}
  totalLanguages={stats.totalLanguages}
  completionRate={stats.completionRate}
/>

// GOOD - pass object
<DashboardHero stats={stats} />
```

### Don't mix layout and logic

```typescript
// BAD - logic in layout
function DashboardHero({ stats }) {
  const formattedRate = Math.round(stats.completionRate * 100); // ❌

  return <div>{formattedRate}%</div>;
}

// GOOD - format in hook or parent
function DashboardHero({ completionPercentage }) {
  return <div>{completionPercentage}</div>;
}
```
