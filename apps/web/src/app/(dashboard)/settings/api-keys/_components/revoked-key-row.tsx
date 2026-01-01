'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { Badge } from '@/components/ui/badge';
import { Key } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
    <div className="p-5 flex items-center gap-4">
      <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/30">
        <Key className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <p className="font-medium truncate">{apiKey.name}</p>
          <Badge
            variant="destructive"
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
          >
            {t('apiKeys.revoked')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          {apiKey.keyPrefix}...
        </p>
      </div>
      <p className="text-xs text-muted-foreground hidden sm:block">
        {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
      </p>
    </div>
  );
}
