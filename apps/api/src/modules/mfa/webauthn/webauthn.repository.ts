/**
 * WebAuthn Repository
 *
 * Data access layer for WebAuthn/Passkey operations.
 * Abstracts Prisma operations for credential management and passwordless status.
 */
import type { PrismaClient } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface UserWithCredentials {
  id: string;
  email: string;
  name: string | null;
  password: string | null;
  webauthnCredentials: Array<{
    credentialId: string;
    transports: string[];
  }>;
}

export interface WebAuthnCredentialRecord {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: bigint;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  aaguid: string | null;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface CreateCredentialData {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: bigint;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  aaguid: string;
  name: string;
}

// ============================================
// Repository
// ============================================

export class WebAuthnRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================
  // User Operations
  // ============================================

  /**
   * Find user by ID with credentials for registration exclusion
   */
  async findUserById(userId: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        webauthnCredentials: {
          select: { credentialId: true, transports: true },
        },
      },
    });
  }

  /**
   * Find user by email with credentials for authentication
   */
  async findUserByEmail(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        webauthnCredentials: {
          select: { credentialId: true, transports: true },
        },
      },
    });
  }

  /**
   * Find user with password field only (for passwordless check)
   */
  async findUserForPasswordCheck(userId: string): Promise<{ password: string | null } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
  }

  // ============================================
  // Credential Operations
  // ============================================

  /**
   * Find credential by WebAuthn credential ID (for authentication verification)
   */
  async findCredentialByCredentialId(
    credentialId: string
  ): Promise<(WebAuthnCredentialRecord & { user: { id: string } }) | null> {
    return this.prisma.webAuthnCredential.findUnique({
      where: { credentialId },
      include: { user: true },
    });
  }

  /**
   * Find credential by internal ID (for deletion)
   */
  async findCredentialById(id: string, userId: string): Promise<WebAuthnCredentialRecord | null> {
    return this.prisma.webAuthnCredential.findFirst({
      where: { id, userId },
    });
  }

  /**
   * List all credentials for a user
   */
  async listCredentials(userId: string): Promise<WebAuthnCredentialRecord[]> {
    return this.prisma.webAuthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new credential
   */
  async createCredential(data: CreateCredentialData): Promise<WebAuthnCredentialRecord> {
    return this.prisma.webAuthnCredential.create({
      data,
    });
  }

  /**
   * Update credential counter after authentication
   */
  async updateCredentialCounter(id: string, counter: bigint): Promise<void> {
    await this.prisma.webAuthnCredential.update({
      where: { id },
      data: {
        counter,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<void> {
    await this.prisma.webAuthnCredential.delete({
      where: { id },
    });
  }

  /**
   * Count credentials for a user
   */
  async countCredentials(userId: string): Promise<number> {
    return this.prisma.webAuthnCredential.count({
      where: { userId },
    });
  }

  // ============================================
  // Passwordless Operations
  // ============================================

  /**
   * Remove password and mark user as passwordless
   */
  async setPasswordless(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: null,
        passwordlessAt: new Date(),
      },
    });
  }

  /**
   * Check if user is passwordless
   */
  async isPasswordless(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    return user?.password === null;
  }
}
