/**
 * DeleteCredentialHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasskeyDeletedEvent } from '../events/passkey-deleted.event.js';
import { DeleteCredentialCommand } from '../webauthn/commands/delete-credential.command.js';
import { DeleteCredentialHandler } from '../webauthn/commands/delete-credential.handler.js';

describe('DeleteCredentialHandler', () => {
  let mockRepository: {
    findCredentialById: ReturnType<typeof vi.fn>;
    findUserForPasswordCheck: ReturnType<typeof vi.fn>;
    countCredentials: ReturnType<typeof vi.fn>;
    deleteCredential: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findCredentialById: vi.fn(),
      findUserForPasswordCheck: vi.fn(),
      countCredentials: vi.fn(),
      deleteCredential: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () =>
    new DeleteCredentialHandler(mockRepository as any, mockEventBus as any);

  it('should delete credential and return remaining count', async () => {
    mockRepository.findCredentialById.mockResolvedValue({
      id: 'cred-123',
      userId: 'user-123',
      name: 'My Passkey',
    });
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: 'hashed' });
    mockRepository.countCredentials.mockResolvedValue(3);

    const handler = createHandler();
    const command = new DeleteCredentialCommand('user-123', 'cred-123');

    const result = await handler.execute(command);

    expect(result.remainingCount).toBe(2);
    expect(mockRepository.deleteCredential).toHaveBeenCalledWith('cred-123');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(PasskeyDeletedEvent));
  });

  it('should throw NotFoundError when credential not found', async () => {
    mockRepository.findCredentialById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new DeleteCredentialCommand('user-123', 'non-existent');

    await expect(handler.execute(command)).rejects.toThrow('Passkey not found');
  });

  it('should throw BadRequestError when deleting last passkey as passwordless user', async () => {
    mockRepository.findCredentialById.mockResolvedValue({
      id: 'cred-123',
      userId: 'user-123',
      name: 'My Only Passkey',
    });
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: null }); // Passwordless
    mockRepository.countCredentials.mockResolvedValue(1); // Last passkey

    const handler = createHandler();
    const command = new DeleteCredentialCommand('user-123', 'cred-123');

    await expect(handler.execute(command)).rejects.toThrow('Cannot delete your only passkey');
    expect(mockRepository.deleteCredential).not.toHaveBeenCalled();
  });

  it('should allow deleting last passkey if user has password', async () => {
    mockRepository.findCredentialById.mockResolvedValue({
      id: 'cred-123',
      userId: 'user-123',
      name: 'My Passkey',
    });
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: 'hashed' }); // Has password
    mockRepository.countCredentials.mockResolvedValue(1); // Last passkey

    const handler = createHandler();
    const command = new DeleteCredentialCommand('user-123', 'cred-123');

    const result = await handler.execute(command);

    expect(result.remainingCount).toBe(0);
    expect(mockRepository.deleteCredential).toHaveBeenCalled();
  });
});
