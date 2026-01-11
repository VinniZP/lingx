/**
 * Shared test utilities for profile module tests.
 * Contains mock factories and common test data.
 */
import type { MultipartFile } from '@fastify/multipart';
import { vi, type Mock } from 'vitest';

/**
 * Mock repository type for type-safe test assertions.
 */
export interface MockRepository {
  findById: Mock;
  findByIdSimple: Mock;
  findByEmail: Mock;
  updateProfile: Mock;
  updateAvatar: Mock;
  updatePreferences: Mock;
  isProjectMember: Mock;
  createEmailVerification: Mock;
  findEmailVerificationByToken: Mock;
  deleteEmailVerification: Mock;
  deleteUserEmailVerifications: Mock;
  completeEmailChange: Mock;
  transaction: Mock;
}

/**
 * Create a mock ProfileRepository with all methods stubbed.
 */
export function createMockRepository(): MockRepository {
  return {
    findById: vi.fn(),
    findByIdSimple: vi.fn(),
    findByEmail: vi.fn(),
    updateProfile: vi.fn(),
    updateAvatar: vi.fn(),
    updatePreferences: vi.fn(),
    isProjectMember: vi.fn(),
    createEmailVerification: vi.fn(),
    findEmailVerificationByToken: vi.fn(),
    deleteEmailVerification: vi.fn(),
    deleteUserEmailVerifications: vi.fn(),
    completeEmailChange: vi.fn(),
    transaction: vi.fn(),
  };
}

/**
 * Mock event bus type for type-safe test assertions.
 */
export interface MockEventBus {
  publish: Mock;
  publishAll: Mock;
}

/**
 * Create a mock EventBus with all methods stubbed.
 */
export function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };
}

/**
 * Mock email service type for type-safe test assertions.
 */
export interface MockEmailService {
  sendEmailVerification: Mock;
  sendEmailChangeNotification: Mock;
  sendPasswordResetEmail: Mock;
}

/**
 * Create a mock EmailService with all methods stubbed.
 */
export function createMockEmailService(): MockEmailService {
  return {
    sendEmailVerification: vi.fn(),
    sendEmailChangeNotification: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  };
}

/**
 * Mock file storage type for type-safe test assertions.
 */
export interface MockFileStorage {
  init: Mock;
  saveAvatar: Mock;
  deleteFile: Mock;
  deleteAvatar: Mock;
  getUploadDir: Mock;
}

/**
 * Create a mock FileStorageService with all methods stubbed.
 */
export function createMockFileStorage(): MockFileStorage {
  return {
    init: vi.fn(),
    saveAvatar: vi.fn(),
    deleteFile: vi.fn(),
    deleteAvatar: vi.fn(),
    getUploadDir: vi.fn(),
  };
}

/**
 * Create a mock MultipartFile for avatar upload tests.
 */
export function createMockFile(): MultipartFile {
  return {
    type: 'file',
    fieldname: 'avatar',
    filename: 'avatar.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    file: {},
    fields: {},
    toBuffer: vi.fn(),
  } as unknown as MultipartFile;
}

/**
 * Mock user data type.
 */
export interface MockUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
  password: string | null;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      email: boolean;
      inApp: boolean;
      digestFrequency: 'never' | 'daily' | 'weekly';
    };
    defaultProjectId: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base mock user object for tests.
 * Extend or override properties as needed for specific test cases.
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    avatarUrl: null,
    password: 'hashed-password',
    preferences: {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        inApp: true,
        digestFrequency: 'weekly',
      },
      defaultProjectId: null,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Mock user with email verifications type.
 */
export interface MockUserWithVerifications extends MockUser {
  emailVerifications: Array<{
    id: string;
    userId: string;
    newEmail: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
}

/**
 * Mock user with email verifications for profile queries.
 */
export function createMockUserWithVerifications(
  overrides?: Partial<MockUserWithVerifications>
): MockUserWithVerifications {
  return {
    ...createMockUser(),
    emailVerifications: [],
    ...overrides,
  };
}
