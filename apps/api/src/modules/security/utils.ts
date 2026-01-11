/**
 * Security Module Utilities
 *
 * Helper functions for session management and request metadata extraction.
 */
import type { FastifyRequest } from 'fastify';

/**
 * Request metadata extracted from HTTP request.
 * Used to decouple domain operations from framework-specific types.
 */
export interface RequestMetadata {
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

/**
 * Extract request metadata from a Fastify request.
 * Call this in routes before creating commands.
 */
export function extractRequestMetadata(request: FastifyRequest): RequestMetadata {
  const userAgent = request.headers['user-agent'] || null;

  // Check for forwarded IP (behind proxy)
  const forwarded = request.headers['x-forwarded-for'];
  let ipAddress: string | null = null;
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    ipAddress = ips[0].trim();
  } else {
    ipAddress = request.ip || null;
  }

  return { userAgent, ipAddress };
}

/**
 * Parse user agent string into readable device info.
 */
export function parseUserAgent(userAgent: string): string {
  // Simple parsing - extract browser and OS
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect browser
  if (userAgent.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg/')) {
    browser = 'Edge';
  } else if (userAgent.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  return `${browser} on ${os}`;
}

/**
 * Mask IP address for privacy (hide last octet).
 */
export function maskIpAddress(ip: string | null): string | null {
  if (!ip) return null;

  // IPv4: 192.168.1.xxx
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = 'xxx';
      return parts.join('.');
    }
  }

  // IPv6: just show first few groups
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length > 4) {
      return parts.slice(0, 4).join(':') + ':...';
    }
  }

  return ip;
}
