import Link from 'next/link';

interface QuickActionCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}

/**
 * QuickActionCard - Compact action link with icon
 */
export function QuickActionCard({ href, icon: Icon, title, subtitle }: QuickActionCardProps) {
  return (
    <Link href={href} className="island card-hover group flex items-center gap-3 p-4">
      <div className="bg-muted group-hover:bg-primary/10 flex size-9 items-center justify-center rounded-lg transition-colors">
        <Icon className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}
