/**
 * WebAuthnRepository Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebAuthnRepository } from '../webauthn/webauthn.repository.js';

describe('WebAuthnRepository', () => {
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    webAuthnCredential: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      webAuthnCredential: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    };
  });

  // ============================================
  // User Operations
  // ============================================

  describe('findUserById', () => {
    it('should return user with credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        webauthnCredentials: [{ credentialId: 'cred-1', transports: ['usb'] }],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.findUserById('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: {
          webauthnCredentials: {
            select: { credentialId: true, transports: true },
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.findUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should return user with credentials by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        webauthnCredentials: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.findUserByEmail('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          webauthnCredentials: {
            select: { credentialId: true, transports: true },
          },
        },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findUserForPasswordCheck', () => {
    it('should return user with password field only', async () => {
      const mockUser = { password: 'hashed-password' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.findUserForPasswordCheck('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { password: true },
      });
      expect(result).toEqual(mockUser);
    });
  });

  // ============================================
  // Credential Operations
  // ============================================

  describe('findCredentialByCredentialId', () => {
    it('should return credential with user info', async () => {
      const mockCredential = {
        id: 'id-1',
        credentialId: 'cred-123',
        publicKey: 'public-key-base64',
        counter: BigInt(5),
        transports: ['usb'],
        user: { id: 'user-123' },
      };
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(mockCredential);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.findCredentialByCredentialId('cred-123');

      expect(mockPrisma.webAuthnCredential.findUnique).toHaveBeenCalledWith({
        where: { credentialId: 'cred-123' },
        include: { user: true },
      });
      expect(result).toEqual(mockCredential);
    });

    it('should return null for non-existent credential', async () => {
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.findCredentialByCredentialId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findCredentialById', () => {
    it('should return credential by internal ID', async () => {
      const mockCredential = {
        id: 'id-1',
        userId: 'user-123',
        credentialId: 'cred-123',
      };
      mockPrisma.webAuthnCredential.findFirst.mockResolvedValue(mockCredential);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.findCredentialById('id-1', 'user-123');

      expect(mockPrisma.webAuthnCredential.findFirst).toHaveBeenCalledWith({
        where: { id: 'id-1', userId: 'user-123' },
      });
      expect(result).toEqual(mockCredential);
    });
  });

  describe('listCredentials', () => {
    it('should return all credentials for user ordered by creation date', async () => {
      const mockCredentials = [
        { id: 'id-1', name: 'Credential 1', createdAt: new Date() },
        { id: 'id-2', name: 'Credential 2', createdAt: new Date() },
      ];
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue(mockCredentials);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.listCredentials('user-123');

      expect(mockPrisma.webAuthnCredential.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCredentials);
    });
  });

  describe('createCredential', () => {
    it('should create new credential', async () => {
      const credentialData = {
        userId: 'user-123',
        credentialId: 'cred-123',
        publicKey: 'public-key-base64',
        counter: BigInt(0),
        transports: ['usb', 'nfc'],
        deviceType: 'multiDevice',
        backedUp: true,
        aaguid: 'aaguid-value',
        name: 'My Passkey',
      };
      const mockCreated = {
        ...credentialData,
        id: 'id-1',
        createdAt: new Date(),
        lastUsedAt: null,
      };
      mockPrisma.webAuthnCredential.create.mockResolvedValue(mockCreated);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.createCredential(credentialData);

      expect(mockPrisma.webAuthnCredential.create).toHaveBeenCalledWith({
        data: credentialData,
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateCredentialCounter', () => {
    it('should update counter and last used time', async () => {
      const repository = new WebAuthnRepository(mockPrisma as any);

      await repository.updateCredentialCounter('id-1', BigInt(10));

      expect(mockPrisma.webAuthnCredential.update).toHaveBeenCalledWith({
        where: { id: 'id-1' },
        data: {
          counter: BigInt(10),
          lastUsedAt: expect.any(Date),
        },
      });
    });
  });

  describe('deleteCredential', () => {
    it('should delete credential by ID', async () => {
      const repository = new WebAuthnRepository(mockPrisma as any);

      await repository.deleteCredential('id-1');

      expect(mockPrisma.webAuthnCredential.delete).toHaveBeenCalledWith({
        where: { id: 'id-1' },
      });
    });
  });

  describe('countCredentials', () => {
    it('should return count of user credentials', async () => {
      mockPrisma.webAuthnCredential.count.mockResolvedValue(3);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.countCredentials('user-123');

      expect(mockPrisma.webAuthnCredential.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(result).toBe(3);
    });
  });

  // ============================================
  // Passwordless Operations
  // ============================================

  describe('setPasswordless', () => {
    it('should remove password and set passwordless timestamp', async () => {
      const repository = new WebAuthnRepository(mockPrisma as any);

      await repository.setPasswordless('user-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          password: null,
          passwordlessAt: expect.any(Date),
        },
      });
    });
  });

  describe('isPasswordless', () => {
    it('should return true when user has no password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ password: null });

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.isPasswordless('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { password: true },
      });
      expect(result).toBe(true);
    });

    it('should return false when user has password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ password: 'hashed' });

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.isPasswordless('user-123');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const repository = new WebAuthnRepository(mockPrisma as any);
      const result = await repository.isPasswordless('non-existent');

      expect(result).toBe(false);
    });
  });
});
