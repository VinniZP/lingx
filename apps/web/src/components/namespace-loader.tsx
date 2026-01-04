'use client';

import { cn } from '@/lib/utils';
import { useTranslation, type NamespaceKeys } from '@lingx/sdk-nextjs';
import { type ReactNode } from 'react';

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
function NamespaceLoader<NS extends keyof NamespaceKeys>({
  namespace,
  children,
  className,
}: NamespaceLoaderProps<NS>) {
  const { t, ready } = useTranslation(namespace);

  if (!ready) {
    return (
      <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
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
        className="bg-primary animate-loading-dot size-2.5 rounded-full"
        style={{ animationDelay: '0ms' }}
      />
      <div
        className="bg-primary animate-loading-dot size-2.5 rounded-full"
        style={{ animationDelay: '160ms' }}
      />
      <div
        className="bg-primary animate-loading-dot size-2.5 rounded-full"
        style={{ animationDelay: '320ms' }}
      />
    </div>
  );
}

/**
 * Standalone loading pulse component for custom usage
 */
export { LoadingPulse };
