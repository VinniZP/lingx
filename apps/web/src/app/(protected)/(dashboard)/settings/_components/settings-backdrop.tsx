/**
 * SettingsBackdrop - Premium atmospheric gradient background for settings pages
 *
 * Features:
 * - Primary gradient orb (top-right)
 * - Secondary accent orb (bottom-left)
 * - Floating center orb
 * - Subtle grid pattern overlay
 *
 * Supports theme variants via `accentColor` prop:
 * - 'primary' (purple) - default/security
 * - 'info' (blue) - profile
 * - 'warm' (coral/orange) - api-keys
 */

interface SettingsBackdropProps {
  /**
   * The primary accent color for the backdrop gradient orbs
   * @default 'primary'
   */
  accentColor?: 'primary' | 'info' | 'warm';
}

export function SettingsBackdrop({ accentColor = 'primary' }: SettingsBackdropProps) {
  const colorVariants = {
    primary: {
      primary: 'from-primary/[0.08] via-primary/[0.04]',
      secondary: 'from-warm/[0.06] via-warm/[0.02]',
      floating: 'from-info/[0.04] to-primary/[0.04]',
    },
    info: {
      primary: 'from-info/[0.08] via-info/[0.04]',
      secondary: 'from-warm/[0.06] via-warm/[0.02]',
      floating: 'from-primary/[0.04] to-info/[0.04]',
    },
    warm: {
      primary: 'from-warm/[0.08] via-warm/[0.04]',
      secondary: 'from-primary/[0.06] via-primary/[0.02]',
      floating: 'from-warm/[0.04] to-primary/[0.04]',
    },
  };

  const colors = colorVariants[accentColor];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Primary gradient orb */}
      <div
        className={`absolute top-0 right-0 h-[1000px] w-250 bg-gradient-to-bl ${colors.primary} translate-x-1/3 -translate-y-1/3 animate-pulse rounded-full to-transparent blur-3xl`}
        style={{ animationDuration: '8s' }}
      />
      {/* Secondary accent orb */}
      <div
        className={`absolute bottom-0 left-0 h-[800px] w-200 bg-gradient-to-tr ${colors.secondary} -translate-x-1/3 translate-y-1/3 rounded-full to-transparent blur-3xl`}
      />
      {/* Floating center orb */}
      <div
        className={`absolute top-1/2 left-1/2 h-[400px] w-[400px] bg-linear-to-r ${colors.floating} -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full blur-3xl`}
        style={{ animationDuration: '12s' }}
      />
      {/* Refined grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)`,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}
