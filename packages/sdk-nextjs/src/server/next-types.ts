/**
 * Type declarations for Next.js fetch extensions
 * These are used only in server-side code for SSG/ISR caching
 */

/**
 * Next.js fetch cache options
 */
export interface NextFetchRequestConfig {
  /**
   * Number of seconds to cache the response.
   * Set to `false` to disable caching.
   * Set to `0` to cache for the duration of the request.
   */
  revalidate?: number | false;

  /**
   * Tags for on-demand cache revalidation.
   * Use `revalidateTag()` to invalidate cache for specific tags.
   */
  tags?: string[];
}

/**
 * Extended fetch options including Next.js-specific options
 */
export interface NextFetchOptions extends RequestInit {
  /**
   * Next.js-specific fetch options for caching
   */
  next?: NextFetchRequestConfig;
}

/**
 * Type-safe wrapper for fetch with Next.js options
 */
export async function nextFetch(
  url: string,
  options: NextFetchOptions
): Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fetch(url, options as any);
}
