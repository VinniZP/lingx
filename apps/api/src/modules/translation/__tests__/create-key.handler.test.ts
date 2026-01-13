import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { CreateKeyCommand } from '../commands/create-key.command.js';
import { CreateKeyHandler } from '../commands/create-key.handler.js';
import { KeyCreatedEvent } from '../events/key-created.event.js';
import type {
  KeyWithTranslations,
  TranslationRepository,
} from '../repositories/translation.repository.js';

describe('CreateKeyHandler', () => {
  const mockRepository: {
    createKey: ReturnType<typeof vi.fn>;
  } = {
    createKey: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  let handler: CreateKeyHandler;

  const createMockKey = (overrides: Partial<KeyWithTranslations> = {}): KeyWithTranslations => ({
    id: 'key-1',
    name: 'common.greeting',
    namespace: null,
    description: null,
    branchId: 'branch-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceFile: null,
    sourceLine: null,
    sourceComponent: null,
    translations: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CreateKeyHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  it('should create key and emit event', async () => {
    const command = new CreateKeyCommand('branch-1', 'common.greeting', null, null, 'user-1');
    const mockKey = createMockKey();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.createKey.mockResolvedValue(mockKey);

    const result = await handler.execute(command);

    expect(result).toEqual(mockKey);
    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockRepository.createKey).toHaveBeenCalledWith({
      branchId: 'branch-1',
      name: 'common.greeting',
      namespace: null,
      description: undefined,
    });
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(KeyCreatedEvent));
  });

  it('should create key with namespace', async () => {
    const command = new CreateKeyCommand(
      'branch-1',
      'notFound',
      'errors',
      'Error message for 404',
      'user-1'
    );
    const mockKey = createMockKey({
      name: 'notFound',
      namespace: 'errors',
      description: 'Error message for 404',
    });

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.createKey.mockResolvedValue(mockKey);

    const result = await handler.execute(command);

    expect(result.namespace).toBe('errors');
    expect(result.description).toBe('Error message for 404');
    expect(mockRepository.createKey).toHaveBeenCalledWith({
      branchId: 'branch-1',
      name: 'notFound',
      namespace: 'errors',
      description: 'Error message for 404',
    });
  });

  it('should throw when user lacks branch access', async () => {
    const command = new CreateKeyCommand('branch-1', 'test.key', null, null, 'user-1');

    mockAccessService.verifyBranchAccess.mockRejectedValue(
      new Error('Not authorized to access this branch')
    );

    await expect(handler.execute(command)).rejects.toThrow('Not authorized to access this branch');
    expect(mockRepository.createKey).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw when key name already exists', async () => {
    const command = new CreateKeyCommand('branch-1', 'existing.key', null, null, 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.createKey.mockRejectedValue(
      new Error('Key with this name already exists in the branch/namespace')
    );

    await expect(handler.execute(command)).rejects.toThrow(
      'Key with this name already exists in the branch/namespace'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
