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
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={cn(
        "text-2xl lg:text-3xl font-semibold tracking-tight mt-1",
        highlight && "text-success"
      )}>
        {value}
      </p>
    </div>
  );
}
