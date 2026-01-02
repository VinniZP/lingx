# Data Fetching

Lingx uses TanStack Query (React Query) for all data fetching.

## Configuration

```typescript
// components/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## API Layer

All API calls are centralized in `lib/api.ts`:

```typescript
// lib/api.ts
import type { DashboardStats, Project } from '@lingx/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || 'Request failed');
  }

  return response.json();
}

// Group by domain
export const dashboardApi = {
  getStats: () => fetchApi<DashboardStats>('/api/dashboard/stats'),
};

export const projectApi = {
  list: () => fetchApi<{ projects: Project[] }>('/api/projects'),
  get: (id: string) => fetchApi<Project>(`/api/projects/${id}`),
  create: (data: CreateProjectInput) =>
    fetchApi<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

## Query Patterns

### Basic Query

```typescript
// hooks/use-projects.ts
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  });
}
```

### Parameterized Query

```typescript
// hooks/use-project.ts
export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.get(id),
    enabled: !!id, // Don't fetch if no id
  });
}
```

### Dependent Query

```typescript
// Wait for first query before running second
export function useProjectStats(projectId: string) {
  const { data: project } = useProject(projectId);

  return useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectApi.getStats(projectId),
    enabled: !!project, // Only run when project is loaded
  });
}
```

### Parallel Queries

```typescript
// Run multiple queries in parallel
import { useQueries } from '@tanstack/react-query';

export function useMultipleProjects(ids: string[]) {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ['project', id],
      queryFn: () => projectApi.get(id),
    })),
  });
}
```

## Query Keys

Use consistent, hierarchical query keys:

```typescript
// Single entity
['project', projectId]
['branch', branchId]
['key', keyId]

// Entity list
['projects']
['branches', projectId]
['keys', branchId]

// With filters
['keys', branchId, { search: 'foo', page: 1 }]

// Aggregates
['dashboard-stats']
['project-stats', projectId]
```

## Mutation Patterns

### Basic Mutation

```typescript
// hooks/use-create-project.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

### With Callbacks

```typescript
// In component
const { mutate } = useCreateProject();

const handleSubmit = (data: FormData) => {
  mutate(data, {
    onSuccess: (project) => {
      toast.success('Project created');
      router.push(`/projects/${project.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
```

### Optimistic Update

```typescript
export function useUpdateTranslation(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationApi.setTranslation,

    // Before mutation
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['keys', branchId] });

      // Snapshot current value
      const previous = queryClient.getQueryData(['keys', branchId]);

      // Optimistically update
      queryClient.setQueryData(['keys', branchId], (old) => ({
        ...old,
        // Apply optimistic update
      }));

      return { previous };
    },

    // On error, rollback
    onError: (err, newData, context) => {
      queryClient.setQueryData(['keys', branchId], context?.previous);
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
    },
  });
}
```

## Loading States

### In Component

```typescript
function ProjectsPage() {
  const { data, isLoading, error } = useProjects();

  if (isLoading) {
    return <ProjectsSkeleton />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!data?.projects?.length) {
    return <EmptyState />;
  }

  return <ProjectsList projects={data.projects} />;
}
```

### Skeleton Components

```typescript
function ProjectsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="island p-4 animate-pulse">
          <div className="h-5 w-1/3 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded mt-2" />
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

### API Error Class

```typescript
// lib/api.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### Error Boundaries

```typescript
// components/error-boundary.tsx
'use client';

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div className="p-4 text-center">
          <p>Something went wrong</p>
          <button onClick={resetErrorBoundary}>Try again</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## Cache Invalidation

### Manual Invalidation

```typescript
const queryClient = useQueryClient();

// Invalidate single query
queryClient.invalidateQueries({ queryKey: ['projects'] });

// Invalidate with prefix
queryClient.invalidateQueries({ queryKey: ['project', projectId] });

// Invalidate exact match
queryClient.invalidateQueries({
  queryKey: ['keys', branchId],
  exact: true,
});
```

### Refetch on Focus

```typescript
// For real-time data
useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  refetchOnWindowFocus: true, // Refetch when tab becomes active
  refetchInterval: 30000, // Poll every 30s
});
```

## Best Practices

1. **Use hooks for all queries** - Never call useQuery directly in components
2. **Consistent query keys** - Use the same key structure everywhere
3. **Handle all states** - Loading, error, empty, success
4. **Use shared types** - Import from `@lingx/shared`
5. **Invalidate appropriately** - After mutations, invalidate affected queries
