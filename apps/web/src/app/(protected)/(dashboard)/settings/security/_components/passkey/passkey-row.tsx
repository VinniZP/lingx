'use client';

import { Button } from '@/components/ui/button';
import { useRelativeTime } from '@/hooks/use-relative-time';
import { Key, Trash2 } from 'lucide-react';

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
    <div className="bg-muted/20 border-border/40 hover:border-border/60 group flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200">
      <div className="from-primary/15 to-primary/5 border-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl border bg-linear-to-br">
        <Key className="text-primary size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate font-medium">{credential.name}</span>
          {credential.backedUp && (
            <span className="bg-success/10 text-success border-success/20 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
              Synced
            </span>
          )}
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-2.5 text-xs">
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
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-10 shrink-0 rounded-xl p-0 opacity-60 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
        <span className="sr-only">Delete passkey</span>
      </Button>
    </div>
  );
}
