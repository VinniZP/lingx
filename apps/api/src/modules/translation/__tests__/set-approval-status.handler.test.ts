import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { SetApprovalStatusCommand } from '../commands/set-approval-status.command.js';
import { SetApprovalStatusHandler } from '../commands/set-approval-status.handler.js';
import { TranslationApprovedEvent } from '../events/translation-approved.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('SetApprovalStatusHandler', () => {
  const mockRepository: {
    getProjectIdByTranslationId: ReturnType<typeof vi.fn>;
    findTranslationById: ReturnType<typeof vi.fn>;
    findKeyById: ReturnType<typeof vi.fn>;
    setApprovalStatus: ReturnType<typeof vi.fn>;
  } = {
    getProjectIdByTranslationId: vi.fn(),
    findTranslationById: vi.fn(),
    findKeyById: vi.fn(),
    setApprovalStatus: vi.fn(),
  };

  const mockAccessService: {
    verifyProjectAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyProjectAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const mockLogger: { warn: ReturnType<typeof vi.fn> } = {
    warn: vi.fn(),
  };

  let handler: SetApprovalStatusHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SetApprovalStatusHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should approve translation and emit event', async () => {
    const command = new SetApprovalStatusCommand('translation-1', 'APPROVED', 'user-1');

    const mockTranslation = {
      id: 'translation-1',
      keyId: 'key-1',
      language: 'es',
      value: 'Hola',
      status: 'APPROVED',
    };
    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
    };

    mockRepository.getProjectIdByTranslationId.mockResolvedValue('project-1');
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.findTranslationById.mockResolvedValue(mockTranslation);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.setApprovalStatus.mockResolvedValue({ ...mockTranslation, status: 'APPROVED' });

    const result = await handler.execute(command);

    expect(result.status).toBe('APPROVED');
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.setApprovalStatus).toHaveBeenCalledWith(
      'translation-1',
      'APPROVED',
      'user-1'
    );
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TranslationApprovedEvent));
  });

  it('should reject translation and emit event', async () => {
    const command = new SetApprovalStatusCommand('translation-1', 'REJECTED', 'user-1');

    const mockTranslation = {
      id: 'translation-1',
      keyId: 'key-1',
      language: 'es',
      value: 'Hola',
      status: 'REJECTED',
    };
    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
    };

    mockRepository.getProjectIdByTranslationId.mockResolvedValue('project-1');
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.findTranslationById.mockResolvedValue(mockTranslation);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.setApprovalStatus.mockResolvedValue({ ...mockTranslation, status: 'REJECTED' });

    const result = await handler.execute(command);

    expect(result.status).toBe('REJECTED');
  });

  it('should throw when translation not found', async () => {
    const command = new SetApprovalStatusCommand('non-existent', 'APPROVED', 'user-1');

    mockRepository.getProjectIdByTranslationId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow('Translation');
    expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
  });

  it('should throw when user lacks MANAGER or OWNER role', async () => {
    const command = new SetApprovalStatusCommand('translation-1', 'APPROVED', 'user-1');

    mockRepository.getProjectIdByTranslationId.mockResolvedValue('project-1');
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new Error('Forbidden: requires MANAGER or OWNER role')
    );

    await expect(handler.execute(command)).rejects.toThrow(
      'Forbidden: requires MANAGER or OWNER role'
    );
    expect(mockRepository.setApprovalStatus).not.toHaveBeenCalled();
  });

  it('should log warning when key not found for event', async () => {
    const command = new SetApprovalStatusCommand('translation-1', 'APPROVED', 'user-1');

    const mockTranslation = {
      id: 'translation-1',
      keyId: 'key-1',
      language: 'es',
      value: 'Hola',
    };

    mockRepository.getProjectIdByTranslationId.mockResolvedValue('project-1');
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.findTranslationById.mockResolvedValue(mockTranslation);
    mockRepository.findKeyById.mockResolvedValue(null);
    mockRepository.setApprovalStatus.mockResolvedValue({ ...mockTranslation, status: 'APPROVED' });

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { translationId: 'translation-1' },
      'Skipped TranslationApprovedEvent: key not found for translation'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
