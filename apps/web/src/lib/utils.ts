import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract initials from a name or email for avatar fallback display.
 * Returns up to 2 uppercase characters.
 */
export function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return '?';

  // If it looks like an email, use first 2 characters
  if (nameOrEmail.includes('@')) {
    return nameOrEmail.slice(0, 2).toUpperCase();
  }

  // Otherwise extract initials from name parts
  return nameOrEmail
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
