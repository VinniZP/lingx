'use client';

import { cn } from '@/lib/utils';
import { Check, Clock, X } from 'lucide-react';

type Status = 'APPROVED' | 'REJECTED' | 'PENDING' | 'empty';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'default';
}

const statusConfig = {
  APPROVED: {
    label: 'Approved',
    icon: Check,
    className: 'bg-success/10 text-success border-success/20',
  },
  REJECTED: {
    label: 'Rejected',
    icon: X,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  empty: {
    label: 'Empty',
    icon: null,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.className
      )}
    >
      {Icon && <Icon className={cn(size === 'sm' ? 'size-2.5' : 'size-3')} />}
      {config.label}
    </span>
  );
}

// Status dot for compact display
export function StatusDot({ status }: { status: Status }) {
  return (
    <div
      className={cn(
        'size-2 rounded-full',
        status === 'APPROVED' && 'bg-success',
        status === 'REJECTED' && 'bg-destructive',
        status === 'PENDING' && 'bg-warning',
        status === 'empty' && 'bg-muted-foreground/30'
      )}
    />
  );
}
