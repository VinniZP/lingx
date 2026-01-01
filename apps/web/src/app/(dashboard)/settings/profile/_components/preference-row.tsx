'use client';

interface PreferenceRowProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PreferenceRow({
  icon: Icon,
  title,
  description,
  children,
}: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between py-4 px-2 rounded-xl hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 border border-border/30">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
