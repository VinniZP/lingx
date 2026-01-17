'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { toast } from 'sonner';

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
  badge?: boolean;
  copyable?: boolean;
}

export function InfoRow({
  label,
  value,
  mono = false,
  badge = false,
  copyable = false,
}: InfoRowProps) {
  const { t } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(t('profile.toasts.copiedToClipboard'));
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-4',
        copyable && 'hover:bg-muted/30 group cursor-pointer transition-colors'
      )}
      onClick={copyable ? handleCopy : undefined}
      title={copyable ? 'Click to copy' : undefined}
    >
      <span className="text-muted-foreground text-sm">{label}</span>
      {badge ? (
        <span className="bg-primary/15 text-primary border-primary/20 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
          {value}
        </span>
      ) : (
        <span
          className={cn(
            'text-sm font-medium',
            mono &&
              'bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary rounded-lg px-2.5 py-1 font-mono text-xs transition-colors'
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}
