'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  translationApi,
  CreateKeyInput,
  TranslationKey,
  ApiError,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface KeyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  editKey?: TranslationKey;
}

export function KeyFormDialog({
  open,
  onOpenChange,
  branchId,
  editKey,
}: KeyFormDialogProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editKey) {
      setName(editKey.name);
      setDescription(editKey.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [editKey, open]);

  const createMutation = useMutation({
    mutationFn: (data: CreateKeyInput) =>
      translationApi.createKey(branchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      toast.success('Key created', {
        description: `"${name}" has been created.`,
      });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      toast.error('Failed to create key', {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      translationApi.updateKey(editKey!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      toast.success('Key updated', {
        description: 'Changes have been saved.',
      });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      toast.error('Failed to update key', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editKey) {
      updateMutation.mutate({
        name: name !== editKey.name ? name : undefined,
        description,
      });
    } else {
      createMutation.mutate({
        name,
        description: description || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editKey ? 'Edit Key' : 'New Key'}</DialogTitle>
          <DialogDescription>
            {editKey
              ? 'Update the key name and description'
              : 'Create a new translation key'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="common.welcome"
                required
              />
              <p className="text-sm text-muted-foreground">
                Use dot notation for namespacing (e.g., common.hello)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Context for translators..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name}>
              {isPending ? 'Saving...' : editKey ? 'Save Changes' : 'Create Key'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
