'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { cn } from '@/lib/utils';
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
        copyable && 'cursor-pointer hover:bg-muted/30 transition-colors group'
      )}
      onClick={copyable ? handleCopy : undefined}
      title={copyable ? 'Click to copy' : undefined}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge ? (
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
          {value}
        </span>
      ) : (
        <span
          className={cn(
            'text-sm font-medium',
            mono &&
              'font-mono text-xs bg-muted/50 px-2.5 py-1 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors'
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}
