'use client';

interface PreferenceRowProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PreferenceRow({ icon: Icon, title, description, children }: PreferenceRowProps) {
  return (
    <div className="hover:bg-muted/20 flex items-center justify-between rounded-xl px-2 py-4 transition-colors">
      <div className="flex items-center gap-4">
        <div className="bg-muted/40 border-border/30 flex size-10 shrink-0 items-center justify-center rounded-xl border">
          <Icon className="text-muted-foreground size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
