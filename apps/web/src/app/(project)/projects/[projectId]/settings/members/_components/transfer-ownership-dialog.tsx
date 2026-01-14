'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, getInitials } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectMemberResponse } from '@lingx/shared';
import { AlertTriangle, Crown, Loader2, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ProjectMemberResponse[];
  currentUserId: string;
  projectName: string;
  onConfirm: (newOwnerId: string, keepOwnership: boolean) => void;
  isTransferring?: boolean;
}

// Static schema - validation for confirm step is handled manually
const transferFormSchema = z.object({
  newOwnerId: z.string().min(1, 'Please select a member'),
  keepOwnership: z.boolean(),
  confirmProjectName: z.string(),
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  projectName,
  onConfirm,
  isTransferring,
}: TransferOwnershipDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // Filter out current user from eligible members
  const eligibleMembers = useMemo(
    () => members.filter((m) => m.userId !== currentUserId),
    [members, currentUserId]
  );

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      newOwnerId: '',
      keepOwnership: true,
      confirmProjectName: '',
    },
  });

  const newOwnerId = form.watch('newOwnerId');
  const keepOwnership = form.watch('keepOwnership');
  const confirmProjectName = form.watch('confirmProjectName');

  const selectedMember = eligibleMembers.find((m) => m.userId === newOwnerId);

  // Reset form and step when dialog opens
  useEffect(() => {
    if (open) {
      setStep('select');
      form.reset({
        newOwnerId: '',
        keepOwnership: true,
        confirmProjectName: '',
      });
    }
  }, [open, form]);

  const handleClose = () => {
    if (!isTransferring) {
      onOpenChange(false);
    }
  };

  const handleContinue = () => {
    if (step === 'select' && newOwnerId) {
      form.setValue('confirmProjectName', '');
      setStep('confirm');
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    onConfirm(data.newOwnerId, data.keepOwnership);
  });

  const isNextDisabled =
    isTransferring ||
    (step === 'select' && !newOwnerId) ||
    (step === 'confirm' && confirmProjectName !== projectName);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
        {/* Gradient Header */}
        <div className="from-warning/10 via-warning/5 bg-linear-to-br to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-warning/15 border-warning/20 flex size-12 items-center justify-center rounded-xl border">
                <Crown className="text-warning size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {t('members.transfer.title')}
                </DialogTitle>
                <DialogDescription>
                  {step === 'select'
                    ? t('members.transfer.selectDescription')
                    : t('members.transfer.confirmDescription')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
            {/* Step 1: Select Member */}
            <div className={cn('space-y-4', step !== 'select' && 'hidden')}>
              {/* Member Selection */}
              <FormField
                control={form.control}
                name="newOwnerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('members.transfer.newOwner')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={t('members.transfer.selectMember')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eligibleMembers.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-7">
                                <AvatarImage src={member.avatarUrl || undefined} />
                                <AvatarFallback className="bg-muted text-xs">
                                  {getInitials(member.name || member.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col text-left">
                                <span className="text-sm font-medium">
                                  {member.name || member.email}
                                </span>
                                {member.name && (
                                  <span className="text-muted-foreground text-xs">
                                    {member.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Keep Ownership Checkbox */}
              <FormField
                control={form.control}
                name="keepOwnership"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem className="border-border/50 flex flex-row items-start space-y-0 space-x-3 rounded-xl border p-4">
                    <FormControl>
                      <Checkbox checked={value} onCheckedChange={onChange} {...field} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        {t('members.transfer.keepOwnership')}
                      </FormLabel>
                      <FormDescription>
                        {t('members.transfer.keepOwnershipDescription')}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Warning callout */}
              <div className="bg-warning/5 border-warning/20 flex items-start gap-3 rounded-xl border p-3">
                <div className="bg-warning/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <AlertTriangle className="text-warning size-4" />
                </div>
                <p className="text-muted-foreground text-xs">
                  {keepOwnership
                    ? t('members.transfer.warningKeep')
                    : t('members.transfer.warningLose')}
                </p>
              </div>
            </div>

            {/* Step 2: Confirm */}
            <div className={cn('space-y-4', step !== 'confirm' && 'hidden')}>
              {/* Confirmation Warning */}
              <div className="bg-destructive/5 border-destructive/20 flex items-start gap-3 rounded-xl border p-4">
                <div className="bg-destructive/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <ShieldAlert className="text-destructive size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-destructive text-sm font-medium">
                    {t('members.transfer.confirmWarningTitle')}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t('members.transfer.confirmWarningDescription', {
                      name: selectedMember?.name || selectedMember?.email || '',
                    })}
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="confirmProjectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('members.transfer.typeProjectName', { name: projectName })}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={projectName} autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6 gap-3">
              {step === 'confirm' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('select')}
                  disabled={isTransferring}
                  className="h-11"
                >
                  {t('common.back')}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isTransferring}
                className="h-11 flex-1 sm:flex-none"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type={step === 'select' ? 'button' : 'submit'}
                disabled={isNextDisabled}
                onClick={step === 'select' ? handleContinue : undefined}
                className="bg-warning text-warning-foreground hover:bg-warning/90 h-11 flex-1 gap-2 sm:flex-none"
              >
                {isTransferring ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Crown className="size-4" />
                )}
                {step === 'select' ? t('common.continue') : t('members.transfer.transferOwnership')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
