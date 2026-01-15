import { cn } from '@/lib/utils';

interface StatPillProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

/**
 * StatPill - Inline stat display for hero section
 */
export function StatPill({ label, value, highlight = false }: StatPillProps) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tracking-tight lg:text-3xl',
          highlight && 'text-success'
        )}
      >
        {value}
      </p>
    </div>
  );
}
