'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useLocaleflowContext } from '../context/LocaleflowContext';

/**
 * Return type for useNamespace hook
 */
export interface UseNamespaceReturn {
  /**
   * The namespace name
   */
  namespace: string;

  /**
   * Load the namespace translations
   * This is automatically called if autoLoad is true (default)
   *
   * @returns Promise that resolves when namespace is loaded
   *
   * @example
   * ```tsx
   * const { loadNamespace, isLoaded } = useNamespace('checkout');
   *
   * useEffect(() => {
   *   if (!isLoaded) {
   *     loadNamespace();
   *   }
   * }, [isLoaded, loadNamespace]);
   * ```
   */
  loadNamespace: () => Promise<void>;

  /**
   * Whether the namespace has been loaded
   */
  isLoaded: boolean;

  /**
   * Whether the namespace is currently loading
   */
  isLoading: boolean;
}

/**
 * Options for useNamespace hook
 */
export interface UseNamespaceOptions {
  /**
   * Automatically load namespace on mount
   * @default false
   */
  autoLoad?: boolean;
}

/**
 * Hook for namespace-based lazy loading of translations.
 *
 * Use this for code-splitting translations by feature/page.
 *
 * @param namespace - Namespace to manage
 * @param options - Hook options
 * @returns Namespace state and controls
 *
 * @example
 * ```tsx
 * // Manual loading
 * const { isLoaded, loadNamespace } = useNamespace('checkout');
 *
 * if (!isLoaded) {
 *   return <button onClick={loadNamespace}>Load Checkout</button>;
 * }
 *
 * // Auto loading
 * const { isLoaded, isLoading } = useNamespace('checkout', { autoLoad: true });
 *
 * if (isLoading) return <Loading />;
 * if (!isLoaded) return <Error />;
 *
 * return <CheckoutForm />;
 * ```
 */
export function useNamespace(
  namespace: string,
  options: UseNamespaceOptions = {}
): UseNamespaceReturn {
  const { autoLoad = false } = options;
  const context = useLocaleflowContext();
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const isLoaded = context.loadedNamespaces.has(namespace);

  const loadNamespace = useCallback(async () => {
    if (isLoaded || loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    try {
      await context.loadNamespace(namespace);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [context, namespace, isLoaded]);

  // Auto-load on mount if requested
  useEffect(() => {
    if (autoLoad && !isLoaded && !loadingRef.current) {
      loadNamespace();
    }
  }, [autoLoad, isLoaded, loadNamespace]);

  return useMemo(
    () => ({
      namespace,
      loadNamespace,
      isLoaded,
      isLoading,
    }),
    [namespace, loadNamespace, isLoaded, isLoading]
  );
}
