/**
 * TotpRepository Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TotpRepository } from '../totp/totp.repository.js';

describe('TotpRepository', () => {
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    backupCode: {
      findMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    session: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      backupCode: {
        findMany: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };
  });

  // ============================================
  // User Operations
  // ============================================

  describe('findUserById', () => {
    it('should return user with TOTP fields', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        totpEnabled: false,
        totpSecret: null,
        totpSecretIv: null,
        totpEnabledAt: null,
        totpFailedAttempts: 0,
        totpLockedUntil: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const repository = new TotpRepository(mockPrisma as any);
      const result = await repository.findUserById('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const repository = new TotpRepository(mockPrisma as any);
      const result = await repository.findUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // TOTP Setup Operations
  // ============================================

  describe('saveTotpSetup', () => {
    it('should update user with encrypted secret and create backup codes in transaction', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.saveTotpSetup('user-123', {
        encryptedSecret: 'encrypted-secret',
        secretIv: 'iv-hex',
        backupCodeHashes: ['hash1', 'hash2'],
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.backupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totpSecret: 'encrypted-secret',
          totpSecretIv: 'iv-hex',
          totpEnabled: false,
          totpEnabledAt: null,
        },
      });
      expect(mockPrisma.backupCode.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-123', codeHash: 'hash1' },
          { userId: 'user-123', codeHash: 'hash2' },
        ],
      });
    });
  });

  describe('enableTotp', () => {
    it('should enable TOTP and reset failed attempts', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.enableTotp('user-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totpEnabled: true,
          totpEnabledAt: expect.any(Date),
          totpFailedAttempts: 0,
          totpLockedUntil: null,
        },
      });
    });
  });

  describe('disableTotp', () => {
    it('should clear TOTP data and revoke all device trust in transaction', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.disableTotp('user-123');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.backupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totpSecret: null,
          totpSecretIv: null,
          totpEnabled: false,
          totpEnabledAt: null,
          totpFailedAttempts: 0,
          totpLockedUntil: null,
        },
      });
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { trustedUntil: null },
      });
    });
  });

  describe('clearTotpSetup', () => {
    it('should clear pending setup data in transaction', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.clearTotpSetup('user-123');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.backupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totpSecret: null,
          totpSecretIv: null,
        },
      });
    });
  });

  // ============================================
  // Backup Codes
  // ============================================

  describe('getUnusedBackupCodes', () => {
    it('should return unused backup codes', async () => {
      const mockCodes = [
        { id: 'code-1', userId: 'user-123', codeHash: 'hash1', usedAt: null },
        { id: 'code-2', userId: 'user-123', codeHash: 'hash2', usedAt: null },
      ];
      mockPrisma.backupCode.findMany.mockResolvedValue(mockCodes);

      const repository = new TotpRepository(mockPrisma as any);
      const result = await repository.getUnusedBackupCodes('user-123');

      expect(mockPrisma.backupCode.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', usedAt: null },
      });
      expect(result).toEqual(mockCodes);
    });
  });

  describe('markBackupCodeUsed', () => {
    it('should mark backup code as used', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.markBackupCodeUsed('code-123');

      expect(mockPrisma.backupCode.update).toHaveBeenCalledWith({
        where: { id: 'code-123' },
        data: { usedAt: expect.any(Date) },
      });
    });
  });

  describe('markBackupCodeUsedAndResetAttempts', () => {
    it('should mark backup code as used and reset failed attempts atomically', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.markBackupCodeUsedAndResetAttempts('code-123', 'user-123');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.backupCode.update).toHaveBeenCalledWith({
        where: { id: 'code-123' },
        data: { usedAt: expect.any(Date) },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totpFailedAttempts: 0,
          totpLockedUntil: null,
        },
      });
    });
  });

  describe('countUnusedBackupCodes', () => {
    it('should return count of unused backup codes', async () => {
      mockPrisma.backupCode.count.mockResolvedValue(5);

      const repository = new TotpRepository(mockPrisma as any);
      const result = await repository.countUnusedBackupCodes('user-123');

      expect(mockPrisma.backupCode.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', usedAt: null },
      });
      expect(result).toBe(5);
    });
  });

  describe('replaceBackupCodes', () => {
    it('should delete old codes and create new ones in transaction', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.replaceBackupCodes('user-123', ['hash1', 'hash2']);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.backupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(mockPrisma.backupCode.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-123', codeHash: 'hash1' },
          { userId: 'user-123', codeHash: 'hash2' },
        ],
      });
    });
  });

  // ============================================
  // Rate Limiting
  // ============================================

  describe('incrementFailedAttempts', () => {
    it('should increment failed attempts without lockout', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.incrementFailedAttempts('user-123', 3, null);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totpFailedAttempts: 3,
          totpLockedUntil: null,
        },
      });
    });

    it('should set lockout time when provided', async () => {
      const lockUntil = new Date('2024-01-15T12:00:00Z');
      const repository = new TotpRepository(mockPrisma as any);

      await repository.incrementFailedAttempts('user-123', 5, lockUntil);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totpFailedAttempts: 5,
          totpLockedUntil: lockUntil,
        },
      });
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempts and clear lockout', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.resetFailedAttempts('user-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totpFailedAttempts: 0,
          totpLockedUntil: null,
        },
      });
    });
  });

  // ============================================
  // Device Trust
  // ============================================

  describe('getSessionTrust', () => {
    it('should return session with trust info', async () => {
      const mockSession = { id: 'session-123', trustedUntil: new Date() };
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);

      const repository = new TotpRepository(mockPrisma as any);
      const result = await repository.getSessionTrust('session-123');

      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        select: { trustedUntil: true },
      });
      expect(result).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const repository = new TotpRepository(mockPrisma as any);
      const result = await repository.getSessionTrust('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('setSessionTrust', () => {
    it('should update session trust expiry', async () => {
      const trustedUntil = new Date('2024-02-15T12:00:00Z');
      const repository = new TotpRepository(mockPrisma as any);

      await repository.setSessionTrust('session-123', trustedUntil);

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { trustedUntil },
      });
    });
  });

  describe('revokeSessionTrust', () => {
    it('should revoke trust for specific session owned by user', async () => {
      const repository = new TotpRepository(mockPrisma as any);

      await repository.revokeSessionTrust('session-123', 'user-123');

      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-123', userId: 'user-123' },
        data: { trustedUntil: null },
      });
    });
  });

  describe('countTrustedSessions', () => {
    it('should return count of trusted sessions', async () => {
      mockPrisma.session.count.mockResolvedValue(3);

      const repository = new TotpRepository(mockPrisma as any);
      const result = await repository.countTrustedSessions('user-123');

      expect(mockPrisma.session.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          trustedUntil: { gt: expect.any(Date) },
        },
      });
      expect(result).toBe(3);
    });
  });
});
