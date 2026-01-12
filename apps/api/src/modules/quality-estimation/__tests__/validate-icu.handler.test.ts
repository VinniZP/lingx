import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import { ValidateICUHandler } from '../queries/validate-icu.handler.js';
import { ValidateICUQuery } from '../queries/validate-icu.query.js';

describe('ValidateICUHandler', () => {
  const mockQualityService: { validateICUSyntax: ReturnType<typeof vi.fn> } = {
    validateICUSyntax: vi.fn(),
  };

  const createHandler = () =>
    new ValidateICUHandler(mockQualityService as unknown as QualityEstimationService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return valid result for correct ICU syntax', async () => {
    const handler = createHandler();

    mockQualityService.validateICUSyntax.mockResolvedValue({ valid: true });

    const query = new ValidateICUQuery('Hello {name}!');

    const result = await handler.execute(query);

    expect(mockQualityService.validateICUSyntax).toHaveBeenCalledWith('Hello {name}!');
    expect(result).toEqual({ valid: true });
  });

  it('should return invalid result with error for incorrect ICU syntax', async () => {
    const handler = createHandler();

    mockQualityService.validateICUSyntax.mockResolvedValue({
      valid: false,
      error: 'Unclosed brace at position 6',
    });

    const query = new ValidateICUQuery('Hello {name');

    const result = await handler.execute(query);

    expect(mockQualityService.validateICUSyntax).toHaveBeenCalledWith('Hello {name');
    expect(result).toEqual({
      valid: false,
      error: 'Unclosed brace at position 6',
    });
  });

  it('should handle complex plural ICU syntax', async () => {
    const handler = createHandler();

    mockQualityService.validateICUSyntax.mockResolvedValue({ valid: true });

    const pluralSyntax = '{count, plural, =0 {No items} one {# item} other {# items}}';
    const query = new ValidateICUQuery(pluralSyntax);

    await handler.execute(query);

    expect(mockQualityService.validateICUSyntax).toHaveBeenCalledWith(pluralSyntax);
  });
});
