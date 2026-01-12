/**
 * Security Module Utilities
 *
 * Helper functions for session management and request metadata extraction.
 */
import type { FastifyRequest } from 'fastify';
import { UAParser } from 'ua-parser-js';

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
 * Uses ua-parser-js for robust browser/OS/device detection.
 */
export function parseUserAgent(userAgent: string): string {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Build browser string (e.g., "Chrome 120", "Safari 17")
  const browserName = result.browser.name || 'Unknown Browser';
  const browserVersion = result.browser.major;
  const browser = browserVersion ? `${browserName} ${browserVersion}` : browserName;

  // Build OS string (e.g., "Windows 11", "macOS 14", "iOS 17")
  const osName = result.os.name || 'Unknown OS';
  const osVersion = result.os.version;
  const os = osVersion ? `${osName} ${osVersion}` : osName;

  // Include device type for mobile/tablet
  const deviceType = result.device.type;
  const deviceModel = result.device.model;

  if (deviceType === 'mobile' || deviceType === 'tablet') {
    const device = deviceModel || (deviceType === 'mobile' ? 'Mobile' : 'Tablet');
    return `${browser} on ${device} (${os})`;
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
