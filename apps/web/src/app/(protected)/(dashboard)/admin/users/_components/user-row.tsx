'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, getInitials } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { AdminUserResponse } from '@lingx/shared';
import { Eye, FolderOpen, UserCheck, UserX } from 'lucide-react';
import { UserRoleBadge } from './user-role-badge';
import { UserStatusBadge } from './user-status-badge';

interface UserRowProps {
  user: AdminUserResponse;
  onViewDetails: (userId: string) => void;
  onDisable: (userId: string) => void;
  onEnable: (userId: string) => void;
  isProcessing?: boolean;
}

export function UserRow({ user, onViewDetails, onDisable, onEnable, isProcessing }: UserRowProps) {
  const { t } = useTranslation();
  const displayName = user.name || user.email;

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="group hover:bg-muted/20 flex items-center gap-5 p-5 transition-colors">
      {/* Avatar with fallback initials */}
      <Avatar className="border-border/40 size-12 rounded-xl border">
        <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
        <AvatarFallback className="from-primary/20 to-primary/5 text-primary bg-linear-to-br text-sm font-medium">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + Email */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{displayName}</span>
        </div>
        {user.name && <p className="text-muted-foreground truncate text-sm">{user.email}</p>}
      </div>

      {/* Role Badge */}
      <UserRoleBadge role={user.role} />

      {/* Status Badge */}
      <UserStatusBadge isDisabled={user.isDisabled} />

      {/* Project Count */}
      <div className="text-muted-foreground flex w-24 items-center gap-1.5 text-sm">
        <FolderOpen className="size-4" />
        <span>{t('admin.users.projectCount', { count: user.projectCount })}</span>
      </div>

      {/* Action Buttons - Always visible */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewDetails(user.id)}
              aria-label={t('admin.actions.viewDetails')}
              className={cn(
                'text-muted-foreground size-9 rounded-xl',
                'hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t('admin.actions.viewDetails')}</TooltipContent>
        </Tooltip>

        {user.isDisabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleActionClick(e, () => onEnable(user.id))}
                disabled={isProcessing}
                aria-label={t('admin.actions.enable')}
                className={cn(
                  'text-muted-foreground size-9 rounded-xl',
                  'hover:text-success hover:bg-success/10'
                )}
              >
                <UserCheck className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t('admin.actions.enable')}</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleActionClick(e, () => onDisable(user.id))}
                disabled={isProcessing}
                aria-label={t('admin.actions.disable')}
                className={cn(
                  'text-muted-foreground size-9 rounded-xl',
                  'hover:text-destructive hover:bg-destructive/10'
                )}
              >
                <UserX className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t('admin.actions.disable')}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
