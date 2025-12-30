/**
 * User DTO - transforms Prisma User model to API response format
 */
import type { User } from '@prisma/client';
import type { UserResponse } from '@localeflow/shared';

/**
 * Transform Prisma User to UserResponse
 * Converts Date to ISO string and excludes password
 */
export function toUserDto(user: Omit<User, 'password'>): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Transform nullable user
 */
export function toUserDtoOrNull(user: Omit<User, 'password'> | null): UserResponse | null {
  return user ? toUserDto(user) : null;
}
