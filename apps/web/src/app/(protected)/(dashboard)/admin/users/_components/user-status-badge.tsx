'use client';

import { cn } from '@/lib/utils';
import { tKey, useTranslation, type TKey } from '@lingx/sdk-nextjs';
import { CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';

interface UserStatusBadgeProps {
  isDisabled: boolean;
  className?: string;
}

type StatusType = 'active' | 'disabled';

const statusConfig: Record<
  StatusType,
  { bg: string; text: string; border: string; Icon: LucideIcon; labelKey: TKey }
> = {
  active: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    Icon: CheckCircle2,
    labelKey: tKey('admin.status.active'),
  },
  disabled: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20',
    Icon: XCircle,
    labelKey: tKey('admin.status.disabled'),
  },
};

export function UserStatusBadge({ isDisabled, className }: UserStatusBadgeProps) {
  const { td } = useTranslation();
  const status: StatusType = isDisabled ? 'disabled' : 'active';
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1',
        'text-[10px] font-bold tracking-widest uppercase',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <config.Icon className="size-3" />
      {td(config.labelKey)}
    </div>
  );
}
