'use client';

import { Button } from '@/components/ui/button';
import { Key, Trash2 } from 'lucide-react';
import { useRelativeTime } from '@/hooks/use-relative-time';

interface Credential {
  id: string;
  name: string;
  backedUp?: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
}

interface PasskeyRowProps {
  credential: Credential;
  onDelete: (id: string) => void;
}

export function PasskeyRow({ credential, onDelete }: PasskeyRowProps) {
  const { formatDate } = useRelativeTime();

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-border/60 transition-all duration-200 group">
      <div className="size-12 rounded-xl bg-linear-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
        <Key className="size-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="font-medium truncate">{credential.name}</span>
          {credential.backedUp && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
              Synced
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1">
          <span>Added {formatDate(credential.createdAt)}</span>
          {credential.lastUsedAt && (
            <>
              <span className="text-border/60">•</span>
              <span>Last used {formatDate(credential.lastUsedAt)}</span>
            </>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(credential.id)}
        className="size-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="size-4" />
        <span className="sr-only">Delete passkey</span>
      </Button>
    </div>
  );
}
