/**
 * TOTP Rate Limiting Utilities
 *
 * Shared rate limiting logic for TOTP and backup code verification.
 */
import { BadRequestError } from '../../../plugins/error-handler.js';
import { LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS } from './constants.js';

/**
 * Check if user is currently locked out due to too many failed attempts.
 * Throws BadRequestError if locked.
 */
export function checkTotpRateLimit(user: { totpLockedUntil: Date | null }): void {
  if (user.totpLockedUntil && user.totpLockedUntil > new Date()) {
    const remainingMs = user.totpLockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new BadRequestError(
      `Too many failed attempts. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`
    );
  }
}

/**
 * Calculate new failed attempt count and lockout time.
 * Returns values to be passed to repository.incrementFailedAttempts().
 */
export function calculateFailedAttempt(currentAttempts: number): {
  newAttempts: number;
  lockUntil: Date | null;
} {
  const newAttempts = currentAttempts + 1;
  const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
  const lockUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null;

  return { newAttempts, lockUntil };
}
