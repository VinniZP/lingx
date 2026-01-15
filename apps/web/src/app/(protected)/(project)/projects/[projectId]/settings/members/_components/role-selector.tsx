'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { AssignableRole, ProjectRole } from '@lingx/shared';
import { ChevronDown, Code, Crown, Loader2, Shield } from 'lucide-react';
import { useState } from 'react';

interface RoleSelectorProps {
  role: ProjectRole;
  actorRole: ProjectRole;
  disabled?: boolean;
  onChange: (role: AssignableRole) => void;
  isLoading?: boolean;
}

// Role colors following design system
export const roleStyles = {
  OWNER: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
    icon: Crown,
  },
  MANAGER: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    icon: Shield,
  },
  DEVELOPER: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    icon: Code,
  },
} as const;

export function RoleSelector({
  role,
  actorRole,
  disabled,
  onChange,
  isLoading,
}: RoleSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Role names and descriptions from i18n
  const roleNames: Record<ProjectRole, string> = {
    OWNER: t('members.roles.owner'),
    MANAGER: t('members.roles.manager'),
    DEVELOPER: t('members.roles.developer'),
  };

  const roleDescriptions: Record<ProjectRole, string> = {
    OWNER: t('members.roles.ownerDescription'),
    MANAGER: t('members.roles.managerDescription'),
    DEVELOPER: t('members.roles.developerDescription'),
  };

  // Determine which roles can be selected based on actor's role
  // Note: OWNER role can only be assigned via Transfer Ownership, not here
  const canSelectRole = (targetRole: ProjectRole): boolean => {
    if (targetRole === 'OWNER') return false; // OWNER only via Transfer Ownership
    if (actorRole === 'OWNER') return true;
    if (actorRole === 'MANAGER') return targetRole === 'DEVELOPER';
    return false;
  };

  // Available roles for dropdown (excludes OWNER - use Transfer Ownership instead)
  const availableRoles: AssignableRole[] = (['MANAGER', 'DEVELOPER'] as const).filter((r) =>
    canSelectRole(r)
  );

  const currentStyle = roleStyles[role];
  const Icon = currentStyle.icon;

  // Static badge (disabled or only one option)
  if (disabled || availableRoles.length <= 1) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase',
          currentStyle.bg,
          currentStyle.text,
          currentStyle.border
        )}
      >
        <Icon className="size-3" />
        {roleNames[role]}
      </div>
    );
  }

  // Interactive dropdown
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all duration-200',
          'focus:ring-primary/20 focus:ring-2 focus:outline-none',
          'hover:brightness-95',
          currentStyle.bg,
          currentStyle.text,
          currentStyle.border
        )}
      >
        {isLoading ? <Loader2 className="size-3 animate-spin" /> : <Icon className="size-3" />}
        {roleNames[role]}
        <ChevronDown className="size-3 opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
        {availableRoles.map((r) => {
          const style = roleStyles[r];
          const RoleIcon = style.icon;
          const isSelected = r === role;

          return (
            <DropdownMenuItem
              key={r}
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
                isSelected && 'bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg border',
                  style.bg,
                  style.border
                )}
              >
                <RoleIcon className={cn('size-4', style.text)} />
              </div>
              <div className="flex-1">
                <div className={cn('text-sm font-semibold', isSelected && style.text)}>
                  {roleNames[r]}
                </div>
                <div className="text-muted-foreground text-xs">{roleDescriptions[r]}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
