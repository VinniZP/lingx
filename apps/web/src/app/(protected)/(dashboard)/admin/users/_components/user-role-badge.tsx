'use client';

import { cn } from '@/lib/utils';
import { tKey, useTranslation, type TKey } from '@lingx/sdk-nextjs';
import { Code, Shield, Users, type LucideIcon } from 'lucide-react';

type UserRole = 'ADMIN' | 'MANAGER' | 'DEVELOPER';

interface UserRoleBadgeProps {
  role: UserRole;
  className?: string;
}

const roleConfig: Record<
  UserRole,
  { bg: string; text: string; border: string; Icon: LucideIcon; labelKey: TKey }
> = {
  ADMIN: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20',
    Icon: Shield,
    labelKey: tKey('admin.roles.admin'),
  },
  MANAGER: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    Icon: Users,
    labelKey: tKey('admin.roles.manager'),
  },
  DEVELOPER: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    Icon: Code,
    labelKey: tKey('admin.roles.developer'),
  },
};

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  const { td } = useTranslation();
  const config = roleConfig[role];

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
