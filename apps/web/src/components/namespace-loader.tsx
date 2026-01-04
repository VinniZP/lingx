'use client';

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
