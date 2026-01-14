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
import { Loader2, LogOut } from 'lucide-react';

interface LeaveProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLeaving?: boolean;
}

export function LeaveProjectDialog({
  open,
  onOpenChange,
  onConfirm,
  isLeaving,
}: LeaveProjectDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-hidden rounded-2xl p-0">
        {/* Gradient Header */}
        <div className="from-destructive/10 via-destructive/5 bg-linear-to-br to-transparent px-6 pt-6 pb-4">
          <AlertDialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 border-destructive/20 flex size-12 items-center justify-center rounded-xl border">
                <LogOut className="text-destructive size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-semibold tracking-tight">
                  {t('members.leaveProject')}
                </AlertDialogTitle>
                <AlertDialogDescription>{t('members.leaveConfirm')}</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm">{t('members.leaveWarning')}</p>
          <p className="text-muted-foreground mt-2 text-sm">{t('members.leaveRegainAccess')}</p>
        </div>

        {/* Footer */}
        <AlertDialogFooter className="px-6 pb-6">
          <AlertDialogCancel className="h-11 rounded-xl">{t('members.stay')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLeaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11 gap-2 rounded-xl"
          >
            {isLeaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            {t('members.leaveProject')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
