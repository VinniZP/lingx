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
export function QuickActionCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="island p-4 card-hover group flex items-center gap-3"
    >
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}
