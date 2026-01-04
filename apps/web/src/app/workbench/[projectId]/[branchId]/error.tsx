'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for the Workbench page.
 *
 * Catches runtime errors in the workbench and provides:
 * - User-friendly error message
 * - Retry functionality
 * - Error reporting to console for debugging
 */
export default function WorkbenchError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[Workbench Error]', error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="bg-destructive/10 text-destructive rounded-full p-4">
        <AlertTriangle className="size-8" />
      </div>

      <div className="max-w-md space-y-2 text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">
          An error occurred while loading the translation workbench. This may be a temporary issue.
        </p>
        {error.message && (
          <p className="bg-muted/50 text-muted-foreground mt-4 rounded-lg p-3 font-mono text-sm">
            {error.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 size-4" />
          Reload page
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>

      {error.digest && <p className="text-muted-foreground/50 text-xs">Error ID: {error.digest}</p>}
    </div>
  );
}
