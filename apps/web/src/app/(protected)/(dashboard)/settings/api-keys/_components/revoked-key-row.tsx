'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@lingx/sdk-nextjs';
import { formatDistanceToNow } from 'date-fns';
import { Key } from 'lucide-react';

interface RevokedKeyRowProps {
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
    createdAt: string;
  };
}

export function RevokedKeyRow({ apiKey }: RevokedKeyRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4 p-5">
      <div className="bg-muted/50 border-border/30 flex size-12 shrink-0 items-center justify-center rounded-xl border">
        <Key className="text-muted-foreground size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <p className="truncate font-medium">{apiKey.name}</p>
          <Badge variant="destructive" className="rounded-md px-2 py-0.5 text-[10px] font-semibold">
            {t('apiKeys.revoked')}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 font-mono text-xs">{apiKey.keyPrefix}...</p>
      </div>
      <p className="text-muted-foreground hidden text-xs sm:block">
        {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
      </p>
    </div>
  );
}
