import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import { ReindexTMCommand } from '../commands/reindex-tm.command.js';
import { ReindexTMHandler } from '../commands/reindex-tm.handler.js';

// Mock the queue module
vi.mock('../../../lib/queues.js', () => ({
  translationMemoryQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
  },
}));

// Import after mock
import { translationMemoryQueue } from '../../../lib/queues.js';

describe('ReindexTMHandler', () => {
  const mockAccessService: {
    verifyProjectAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyProjectAccess: vi.fn(),
  };

  let handler: ReindexTMHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ReindexTMHandler(mockAccessService as unknown as AccessService);
  });

  it('should verify project access with required roles', async () => {
    const command = new ReindexTMCommand('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });

    await handler.execute(command);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
  });

  it('should allow OWNER to trigger reindex', async () => {
    const command = new ReindexTMCommand('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });

    const result = await handler.execute(command);

    expect(translationMemoryQueue.add).toHaveBeenCalledWith('bulk-index', {
      type: 'bulk-index',
      projectId: 'project-1',
    });
    expect(result).toEqual({
      message: 'Reindex job queued',
      jobId: 'job-123',
    });
  });

  it('should allow MANAGER to trigger reindex', async () => {
    const command = new ReindexTMCommand('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });

    const result = await handler.execute(command);

    expect(translationMemoryQueue.add).toHaveBeenCalledWith('bulk-index', {
      type: 'bulk-index',
      projectId: 'project-1',
    });
    expect(result).toEqual({
      message: 'Reindex job queued',
      jobId: 'job-123',
    });
  });

  it('should throw ForbiddenError for insufficient permissions', async () => {
    const command = new ReindexTMCommand('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Insufficient permissions for this operation')
    );

    await expect(handler.execute(command)).rejects.toThrow(
      'Insufficient permissions for this operation'
    );
    expect(translationMemoryQueue.add).not.toHaveBeenCalled();
  });

  it('should throw when user lacks project access', async () => {
    const command = new ReindexTMCommand('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Not authorized to access this project')
    );

    await expect(handler.execute(command)).rejects.toThrow('Not authorized to access this project');
    expect(translationMemoryQueue.add).not.toHaveBeenCalled();
  });

  it('should propagate queue failure error', async () => {
    const command = new ReindexTMCommand('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    vi.mocked(translationMemoryQueue.add).mockRejectedValue(new Error('Queue connection failed'));

    await expect(handler.execute(command)).rejects.toThrow('Queue connection failed');
  });

  it('should handle undefined job.id gracefully', async () => {
    const command = new ReindexTMCommand('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    vi.mocked(translationMemoryQueue.add).mockResolvedValue({ id: undefined } as never);

    const result = await handler.execute(command);

    // job.id as string results in undefined when job.id is undefined
    expect(result).toEqual({
      message: 'Reindex job queued',
      jobId: undefined,
    });
  });
});
