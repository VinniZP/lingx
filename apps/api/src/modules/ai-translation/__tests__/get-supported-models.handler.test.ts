import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetSupportedModelsHandler } from '../queries/get-supported-models.handler.js';
import { GetSupportedModelsQuery } from '../queries/get-supported-models.query.js';
import type { AIProviderService } from '../services/ai-provider.service.js';

describe('GetSupportedModelsHandler', () => {
  const mockProviderService: { getSupportedModels: ReturnType<typeof vi.fn> } = {
    getSupportedModels: vi.fn(),
  };

  const createHandler = () =>
    new GetSupportedModelsHandler(mockProviderService as unknown as AIProviderService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return models for OPENAI provider', async () => {
    const handler = createHandler();

    const models = ['gpt-5.2', 'gpt-5.1', 'gpt-5-mini', 'gpt-5-nano'];
    mockProviderService.getSupportedModels.mockReturnValue(models);

    const query = new GetSupportedModelsQuery('OPENAI');

    const result = await handler.execute(query);

    expect(mockProviderService.getSupportedModels).toHaveBeenCalledWith('OPENAI');
    expect(result.models).toEqual(models);
  });

  it('should return models for ANTHROPIC provider', async () => {
    const handler = createHandler();

    const models = ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-5'];
    mockProviderService.getSupportedModels.mockReturnValue(models);

    const query = new GetSupportedModelsQuery('ANTHROPIC');

    const result = await handler.execute(query);

    expect(mockProviderService.getSupportedModels).toHaveBeenCalledWith('ANTHROPIC');
    expect(result.models).toEqual(models);
  });

  it('should return empty array for unknown provider', async () => {
    const handler = createHandler();

    mockProviderService.getSupportedModels.mockReturnValue([]);

    const query = new GetSupportedModelsQuery('UNKNOWN' as any);

    const result = await handler.execute(query);

    expect(result.models).toEqual([]);
  });
});
