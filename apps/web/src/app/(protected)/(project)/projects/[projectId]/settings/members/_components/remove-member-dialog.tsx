'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Loader2, UserX } from 'lucide-react';

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    userId: string;
    name: string | null;
    email: string;
  };
  onConfirm: () => void;
  isRemoving?: boolean;
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  onConfirm,
  isRemoving,
}: RemoveMemberDialogProps) {
  const { t } = useTranslation();
  const displayName = member.name || member.email;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-hidden rounded-2xl p-0">
        {/* Gradient Header */}
        <div className="from-destructive/10 via-destructive/5 bg-linear-to-br to-transparent px-6 pt-6 pb-4">
          <AlertDialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 border-destructive/20 flex size-12 items-center justify-center rounded-xl border">
                <UserX className="text-destructive size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-semibold tracking-tight">
                  {t('members.removeMember')}
                </AlertDialogTitle>
                <AlertDialogDescription>{t('members.removeCannotUndo')}</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm">{t('members.removeConfirm', { name: displayName })}</p>
          <p className="text-muted-foreground mt-2 text-sm">{t('members.removeWarning')}</p>
        </div>

        {/* Footer */}
        <AlertDialogFooter className="px-6 pb-6">
          <AlertDialogCancel className="h-11 rounded-xl">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11 gap-2 rounded-xl"
          >
            {isRemoving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserX className="size-4" />
            )}
            {t('members.removeMember')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
