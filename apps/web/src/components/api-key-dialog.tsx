'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Sparkles } from 'lucide-react';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  isLoading: boolean;
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ApiKeyDialogProps) {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim());
    setName('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-warm/10">
              <Key className="h-5 w-5 text-warm" />
            </div>
            <div>
              <DialogTitle
                className="text-xl"
                style={{ fontFamily: 'var(--font-instrument-serif)' }}
              >
                Generate New API Key
              </DialogTitle>
            </div>
          </div>
          <DialogDescription>
            Create a new API key for CLI or SDK authentication. The key will
            only be shown once after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Key Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Production CLI, Development SDK"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                Give this key a descriptive name to identify its purpose.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="gap-2 order-1 sm:order-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Key
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
