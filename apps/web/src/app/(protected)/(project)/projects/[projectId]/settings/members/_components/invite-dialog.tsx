'use client';

import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { memberApi, type MemberApiError } from '@/lib/api/members';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { InviteMemberResultResponse, ProjectRole } from '@lingx/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Info, Loader2, RotateCcw, Send, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { roleStyles } from './role-selector';

const inviteFormSchema = z.object({
  emails: z.string().min(1, 'Enter at least one email address'),
  role: z.enum(['MANAGER', 'DEVELOPER'] as const),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  actorRole: ProjectRole;
}

interface InviteResultsProps {
  results: InviteMemberResultResponse;
  onReset: () => void;
  onClose: () => void;
}

function InviteResults({ results, onReset, onClose }: InviteResultsProps) {
  const { t } = useTranslation();
  const hasSent = results.sent.length > 0;
  const hasSkipped = results.skipped.length > 0;
  const hasErrors = results.errors.length > 0;

  return (
    <div className="space-y-4 px-6 pb-6">
      {/* Results summary */}
      <div className="space-y-3">
        {hasSent && (
          <div className="bg-success/5 border-success/20 flex items-start gap-3 rounded-xl border p-3">
            <div className="bg-success/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Check className="text-success size-4" />
            </div>
            <div>
              <p className="text-success text-sm font-medium">
                {t('members.invitationsSent', { count: results.sent.length })}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">{results.sent.join(', ')}</p>
            </div>
          </div>
        )}

        {hasSkipped && (
          <div className="bg-muted/30 border-border/40 flex items-start gap-3 rounded-xl border p-3">
            <div className="bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <AlertCircle className="text-muted-foreground size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {t('members.invitationsSkipped', { count: results.skipped.length })}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t('members.skippedReason')}: {results.skipped.join(', ')}
              </p>
            </div>
          </div>
        )}

        {hasErrors && (
          <div className="bg-destructive/5 border-destructive/20 flex items-start gap-3 rounded-xl border p-3">
            <div className="bg-destructive/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <AlertCircle className="text-destructive size-4" />
            </div>
            <div>
              <p className="text-destructive text-sm font-medium">
                {t('members.invitationsFailed', { count: results.errors.length })}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">{results.errors.join(', ')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <DialogFooter className="mt-6 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-11 flex-1 gap-2 sm:flex-none"
        >
          <RotateCcw className="size-4" />
          {t('members.sendMore')}
        </Button>
        <Button type="button" onClick={onClose} className="h-11 flex-1 sm:flex-none">
          {t('common.done')}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function InviteDialog({ open, onOpenChange, projectId, actorRole }: InviteDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [results, setResults] = useState<InviteMemberResultResponse | null>(null);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    mode: 'onTouched',
    defaultValues: {
      emails: '',
      role: 'DEVELOPER',
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { emails: string[]; role: 'MANAGER' | 'DEVELOPER' }) =>
      memberApi.invite(projectId, { emails: data.emails, role: data.role }),
    onSuccess: (result) => {
      setResults(result);
      queryClient.invalidateQueries({
        queryKey: ['project-invitations', projectId],
      });
      if (result.sent.length > 0) {
        toast.success(t('members.invitationsSent', { count: result.sent.length }));
      }
    },
    onError: (error: MemberApiError) => {
      toast.error(t('members.inviteFailed'), {
        description: error.message || t('common.tryAgain'),
      });
    },
  });

  const onSubmit = (data: InviteFormData) => {
    // Parse emails: split by newlines or commas, trim, and filter valid emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = data.emails
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && emailRegex.test(e));

    if (emails.length === 0) {
      form.setError('emails', {
        type: 'manual',
        message: t('members.enterValidEmail'),
      });
      return;
    }

    inviteMutation.mutate({ emails, role: data.role });
  };

  const handleReset = () => {
    setResults(null);
    form.reset();
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after dialog closes
    setTimeout(() => {
      setResults(null);
      form.reset();
    }, 200);
  };

  // Determine available roles based on actor's role
  const canInviteManager = actorRole === 'OWNER';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
        {/* Gradient Header */}
        <div className="from-primary/10 via-primary/5 bg-linear-to-br to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 border-primary/20 flex size-12 items-center justify-center rounded-xl border">
                <UserPlus className="text-primary size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {t('members.inviteTeamMembers')}
                </DialogTitle>
                <DialogDescription>{t('members.inviteDescription')}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form or Results */}
        {results ? (
          <InviteResults results={results} onReset={handleReset} onClose={handleClose} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 pb-6">
              <FormField
                control={form.control}
                name="emails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('members.emailAddresses')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`jane@example.com\njohn@example.com`}
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('members.emailsHint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => {
                  const selectedRole = field.value as 'MANAGER' | 'DEVELOPER';
                  const selectedStyle = roleStyles[selectedRole];
                  const SelectedIcon = selectedStyle.icon;
                  return (
                    <FormItem>
                      <FormLabel>{t('members.role')}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!canInviteManager}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'flex size-6 items-center justify-center rounded-md border',
                                  selectedStyle.bg,
                                  selectedStyle.border
                                )}
                              >
                                <SelectedIcon className={cn('size-3', selectedStyle.text)} />
                              </div>
                              <span>
                                {selectedRole === 'MANAGER'
                                  ? t('members.roles.manager')
                                  : t('members.roles.developer')}
                              </span>
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {canInviteManager && (
                            <SelectItem value="MANAGER">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    'flex size-6 items-center justify-center rounded-md border',
                                    roleStyles.MANAGER.bg,
                                    roleStyles.MANAGER.border
                                  )}
                                >
                                  <roleStyles.MANAGER.icon
                                    className={cn('size-3', roleStyles.MANAGER.text)}
                                  />
                                </div>
                                <div>
                                  <p className="font-medium">{t('members.roles.manager')}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {t('members.roles.managerDescription')}
                                  </p>
                                </div>
                              </div>
                            </SelectItem>
                          )}
                          <SelectItem value="DEVELOPER">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex size-6 items-center justify-center rounded-md border',
                                  roleStyles.DEVELOPER.bg,
                                  roleStyles.DEVELOPER.border
                                )}
                              >
                                <roleStyles.DEVELOPER.icon
                                  className={cn('size-3', roleStyles.DEVELOPER.text)}
                                />
                              </div>
                              <div>
                                <p className="font-medium">{t('members.roles.developer')}</p>
                                <p className="text-muted-foreground text-xs">
                                  {t('members.roles.developerDescription')}
                                </p>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {!canInviteManager && (
                        <FormDescription>
                          {t('members.managerCanOnlyInviteDevelopers')}
                        </FormDescription>
                      )}
                    </FormItem>
                  );
                }}
              />

              {/* Info callout */}
              <div className="bg-muted/30 border-border/50 flex items-start gap-3 rounded-xl border p-3">
                <div className="bg-info/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Info className="text-info size-4" />
                </div>
                <p className="text-muted-foreground text-xs">{t('members.invitationExpiryInfo')}</p>
              </div>

              <DialogFooter className="mt-6 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="h-11 flex-1 sm:flex-none"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="h-11 flex-1 gap-2 sm:flex-none"
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {t('members.sendInvitations')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
