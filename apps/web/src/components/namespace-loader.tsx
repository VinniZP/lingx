'use client';

import { type ReactNode } from 'react';
import { useTranslation, type NamespaceKeys } from '@lingx/sdk-nextjs';
import { cn } from '@/lib/utils';

interface NamespaceLoaderProps<NS extends keyof NamespaceKeys> {
  namespace: NS;
  children: (t: ReturnType<typeof useTranslation<NS>>['t']) => ReactNode;
  className?: string;
}

/**
 * Wrapper component that handles namespace loading state.
 * Shows a subtle loading animation while the namespace translations are being fetched.
 *
 * @example
 * ```tsx
 * <NamespaceLoader namespace="glossary">
 *   {(t) => (
 *     <div>{t('dialog.title')}</div>
 *   )}
 * </NamespaceLoader>
 * ```
 */
export function NamespaceLoader<NS extends keyof NamespaceKeys>({
  namespace,
  children,
  className,
}: NamespaceLoaderProps<NS>) {
  const { t, ready } = useTranslation(namespace);

  if (!ready) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <LoadingPulse />
      </div>
    );
  }

  return <>{children(t)}</>;
}

/**
 * Simple but fancy loading animation - three bouncing dots
 */
function LoadingPulse() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="size-2.5 rounded-full bg-primary animate-loading-dot"
        style={{ animationDelay: '0ms' }}
      />
      <div
        className="size-2.5 rounded-full bg-primary animate-loading-dot"
        style={{ animationDelay: '160ms' }}
      />
      <div
        className="size-2.5 rounded-full bg-primary animate-loading-dot"
        style={{ animationDelay: '320ms' }}
      />
    </div>
  );
}

/**
 * Standalone loading pulse component for custom usage
 */
export { LoadingPulse };
