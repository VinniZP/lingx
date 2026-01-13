import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { BatchApprovalCommand } from '../commands/batch-approval.command.js';
import { BatchApprovalHandler } from '../commands/batch-approval.handler.js';
import { TranslationsBatchApprovedEvent } from '../events/translation-approved.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('BatchApprovalHandler', () => {
  const mockRepository: {
    verifyTranslationsBelongToSameProject: ReturnType<typeof vi.fn>;
    batchSetApprovalStatus: ReturnType<typeof vi.fn>;
  } = {
    verifyTranslationsBelongToSameProject: vi.fn(),
    batchSetApprovalStatus: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
    verifyProjectAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
    verifyProjectAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  let handler: BatchApprovalHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new BatchApprovalHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  it('should batch approve translations and emit event', async () => {
    const translationIds = ['t1', 't2', 't3'];
    const command = new BatchApprovalCommand('branch-1', translationIds, 'APPROVED', 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.verifyTranslationsBelongToSameProject.mockResolvedValue('project-1');
    mockRepository.batchSetApprovalStatus.mockResolvedValue(3);

    const result = await handler.execute(command);

    expect(result).toBe(3);
    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.batchSetApprovalStatus).toHaveBeenCalledWith(
      translationIds,
      'APPROVED',
      'user-1'
    );
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TranslationsBatchApprovedEvent));
  });

  it('should batch reject translations and emit event', async () => {
    const translationIds = ['t1', 't2'];
    const command = new BatchApprovalCommand('branch-1', translationIds, 'REJECTED', 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.verifyTranslationsBelongToSameProject.mockResolvedValue('project-1');
    mockRepository.batchSetApprovalStatus.mockResolvedValue(2);

    const result = await handler.execute(command);

    expect(result).toBe(2);
    expect(mockRepository.batchSetApprovalStatus).toHaveBeenCalledWith(
      translationIds,
      'REJECTED',
      'user-1'
    );
  });

  it('should throw when user lacks MANAGER or OWNER role', async () => {
    const command = new BatchApprovalCommand('branch-1', ['t1'], 'APPROVED', 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new Error('Forbidden: requires MANAGER or OWNER role')
    );

    await expect(handler.execute(command)).rejects.toThrow(
      'Forbidden: requires MANAGER or OWNER role'
    );
    expect(mockRepository.batchSetApprovalStatus).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw when translations belong to different project', async () => {
    const command = new BatchApprovalCommand('branch-1', ['t1', 't2'], 'APPROVED', 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.verifyTranslationsBelongToSameProject.mockResolvedValue('project-2');

    await expect(handler.execute(command)).rejects.toThrow(
      'Some translations do not belong to this project'
    );
    expect(mockRepository.batchSetApprovalStatus).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw when translations do not belong to any project', async () => {
    const command = new BatchApprovalCommand('branch-1', ['t1'], 'APPROVED', 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.verifyTranslationsBelongToSameProject.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(
      'Some translations do not belong to this project'
    );
  });
});
