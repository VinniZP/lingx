'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import type { AuditLogAction, AuditLogResponse } from '@lingx/shared';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Monitor,
  Search,
  Shield,
  ShieldOff,
  User,
  UserCog,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/** Action type badge configuration */
const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; variant: 'default' | 'destructive' | 'outline' }
> = {
  USER_DISABLED: { label: 'User Disabled', icon: ShieldOff, variant: 'destructive' },
  USER_ENABLED: { label: 'User Enabled', icon: Shield, variant: 'default' },
  USER_IMPERSONATED: { label: 'User Impersonated', icon: UserCog, variant: 'outline' },
};

/** Format JSON state for display */
function formatState(state: unknown): string {
  if (!state) return 'N/A';
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}

/** Audit log row component with expandable details */
function AuditLogRow({ log }: { log: AuditLogResponse }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = ACTION_CONFIG[log.action] || {
    label: log.action,
    icon: FileText,
    variant: 'outline' as const,
  };
  const Icon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('transition-colors', isOpen && 'bg-muted/30')}>
        <CollapsibleTrigger asChild>
          <button className="hover:bg-muted/50 flex w-full items-center gap-4 px-4 py-3 text-left transition-colors">
            <div className="text-muted-foreground">
              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </div>

            {/* Timestamp */}
            <div className="flex w-40 items-center gap-2 text-sm">
              <Clock className="text-muted-foreground size-4" />
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
              </span>
            </div>

            {/* Admin */}
            <div className="flex w-48 items-center gap-2">
              <div className="bg-muted flex size-8 items-center justify-center rounded-full">
                <User className="text-muted-foreground size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{log.admin.name || log.admin.email}</p>
                {log.admin.name && (
                  <p className="text-muted-foreground truncate text-xs">{log.admin.email}</p>
                )}
              </div>
            </div>

            {/* Action */}
            <div className="w-44">
              <Badge variant={config.variant} className="gap-1">
                <Icon className="size-3" />
                {config.label}
              </Badge>
            </div>

            {/* Target */}
            <div className="text-muted-foreground flex-1 truncate text-sm">
              {log.targetType}: {log.targetId}
            </div>

            {/* IP Address */}
            <div className="text-muted-foreground flex w-32 items-center gap-1 text-xs">
              <Globe className="size-3" />
              {log.ipAddress || 'N/A'}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="bg-muted/20 border-border/50 border-t px-4 py-4 pl-12">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Request Context */}
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Request Context
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Globe className="text-muted-foreground mt-0.5 size-4" />
                    <div>
                      <span className="text-muted-foreground">IP Address:</span>{' '}
                      <span className="font-mono">{log.ipAddress || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Monitor className="text-muted-foreground mt-0.5 size-4" />
                    <div className="min-w-0 flex-1">
                      <span className="text-muted-foreground">User Agent:</span>{' '}
                      <span className="text-muted-foreground/70 font-mono text-xs break-all">
                        {log.userAgent || 'N/A'}
                      </span>
                    </div>
                  </div>
                  {log.metadata != null && (
                    <div className="flex items-start gap-2">
                      <FileText className="text-muted-foreground mt-0.5 size-4" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground">Metadata:</span>
                        <pre className="bg-muted mt-1 overflow-auto rounded-md p-2 text-xs">
                          {formatState(log.metadata)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* State Changes */}
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  State Changes
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Before:</span>
                    <pre className="bg-muted mt-1 max-h-32 overflow-auto rounded-md p-2 text-xs">
                      {formatState(log.beforeState)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">After:</span>
                    <pre className="bg-muted mt-1 max-h-32 overflow-auto rounded-md p-2 text-xs">
                      {formatState(log.afterState)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Timestamp */}
            <div className="text-muted-foreground mt-4 text-xs">
              Full timestamp: {new Date(log.createdAt).toLocaleString()}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function AuditLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL params
  const action = (searchParams.get('action') as AuditLogAction) || undefined;
  const adminId = searchParams.get('adminId') || undefined;
  const targetId = searchParams.get('targetId') || undefined;

  // Local search state (debounced updates to URL)
  const [localTargetId, setLocalTargetId] = useState(targetId || '');

  // Query for audit logs
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-audit-logs', { action, adminId, targetId }],
    queryFn: () => adminApi.getAuditLogs({ action, adminId, targetId }),
  });

  // URL param handlers
  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.replace(`/admin/audit-logs?${params.toString()}`);
  };

  const handleActionChange = (value: string) => {
    updateParams({ action: value === 'all' ? undefined : value });
  };

  const handleTargetIdSearch = () => {
    updateParams({ targetId: localTargetId || undefined });
  };

  const handleClearFilters = () => {
    setLocalTargetId('');
    router.replace('/admin/audit-logs');
  };

  const hasFilters = action || adminId || targetId;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="stagger-1">
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Review all admin actions including user disable, enable, and impersonation events.
        </p>
      </div>

      {/* Main Content */}
      <div className="island stagger-2">
        {/* Filters Toolbar */}
        <div className="border-border/40 flex flex-wrap items-center gap-3 border-b p-4">
          {/* Action Filter */}
          <Select value={action || 'all'} onValueChange={handleActionChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="USER_DISABLED">User Disabled</SelectItem>
              <SelectItem value="USER_ENABLED">User Enabled</SelectItem>
              <SelectItem value="USER_IMPERSONATED">User Impersonated</SelectItem>
            </SelectContent>
          </Select>

          {/* Target ID Search */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by target ID..."
              value={localTargetId}
              onChange={(e) => setLocalTargetId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTargetIdSearch()}
              className="w-[200px]"
            />
            <Button variant="outline" size="icon" onClick={handleTargetIdSearch}>
              <Search className="size-4" />
            </Button>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}

          {/* Total Count */}
          <div className="text-muted-foreground ml-auto text-sm">
            {data?.total ?? 0} {data?.total === 1 ? 'entry' : 'entries'}
          </div>
        </div>

        {/* Audit Logs List */}
        <div className="divide-border/40 divide-y">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="bg-primary/10 size-12 animate-pulse rounded-xl" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="text-primary size-6" />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">Loading audit logs...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-2xl">
                  <FileText className="text-destructive size-7" />
                </div>
                <p className="text-muted-foreground text-sm">Failed to load audit logs</p>
              </div>
            </div>
          ) : data?.auditLogs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="bg-muted/50 flex size-14 items-center justify-center rounded-2xl">
                  <FileText className="text-muted-foreground size-7" />
                </div>
                <div>
                  <p className="font-medium">No audit logs found</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {hasFilters
                      ? 'Try adjusting your filters to find what you are looking for.'
                      : 'Admin actions will appear here once they occur.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            data?.auditLogs.map((log) => <AuditLogRow key={log.id} log={log} />)
          )}
        </div>
      </div>
    </div>
  );
}
