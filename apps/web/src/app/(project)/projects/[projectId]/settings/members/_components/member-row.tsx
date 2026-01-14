'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, getInitials } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { AssignableRole, ProjectMemberResponse, ProjectRole } from '@lingx/shared';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, LogOut, Trash2 } from 'lucide-react';
import { RoleSelector } from './role-selector';

interface MemberRowProps {
  member: ProjectMemberResponse;
  currentUserId: string;
  currentUserRole: ProjectRole;
  isOnlyOwner: boolean;
  onRoleChange: (userId: string, role: AssignableRole) => void;
  onRemove: (userId: string) => void;
  onLeave: () => void;
  isChangingRole?: boolean;
  isRemoving?: boolean;
}

export function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  isOnlyOwner,
  onRoleChange,
  onRemove,
  onLeave,
  isChangingRole,
  isRemoving,
}: MemberRowProps) {
  const { t } = useTranslation();
  const isCurrentUser = member.userId === currentUserId;

  // Permission logic
  const canChangeRole =
    currentUserRole === 'OWNER' || (currentUserRole === 'MANAGER' && member.role === 'DEVELOPER');
  const canRemove = currentUserRole === 'OWNER' && !isCurrentUser;
  const canLeave = isCurrentUser && !(member.role === 'OWNER' && isOnlyOwner);

  // Owner can't demote themselves if they're the only owner
  const roleDisabled = !canChangeRole || (isCurrentUser && member.role === 'OWNER' && isOnlyOwner);

  return (
    <div className="group hover:bg-muted/20 flex items-center gap-5 p-5 transition-colors">
      {/* Avatar with fallback initials */}
      <Avatar className="border-border/40 size-12 rounded-xl border">
        <AvatarImage src={member.avatarUrl || undefined} alt={member.name || member.email} />
        <AvatarFallback className="from-primary/20 to-primary/5 text-primary bg-linear-to-br text-sm font-medium">
          {getInitials(member.name || member.email)}
        </AvatarFallback>
      </Avatar>

      {/* Name + Email */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{member.name || member.email}</span>
          {isCurrentUser && (
            <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
              {t('members.you')}
            </span>
          )}
        </div>
        {member.name && <p className="text-muted-foreground truncate text-sm">{member.email}</p>}
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t('members.joined', {
            time: formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true }),
          })}
        </p>
      </div>

      {/* Role Selector */}
      <RoleSelector
        role={member.role}
        actorRole={currentUserRole}
        disabled={roleDisabled}
        onChange={(role) => onRoleChange(member.userId, role)}
        isLoading={isChangingRole}
      />

      {/* Action Buttons */}
      <div className="flex w-24 items-center justify-end gap-2">
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(member.userId)}
            disabled={isRemoving}
            className={cn(
              'text-muted-foreground size-10 rounded-xl',
              'hover:text-destructive hover:bg-destructive/10',
              'opacity-0 transition-opacity group-hover:opacity-100'
            )}
          >
            {isRemoving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        )}
        {canLeave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeave}
            className={cn(
              'text-muted-foreground h-9 rounded-xl',
              'hover:text-destructive hover:bg-destructive/10'
            )}
          >
            <LogOut className="mr-2 size-4" />
            {t('members.leave')}
          </Button>
        )}
      </div>
    </div>
  );
}
