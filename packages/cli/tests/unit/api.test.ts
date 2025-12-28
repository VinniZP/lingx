import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, ApiError } from '../../src/lib/api.js';

describe('ApiClient', () => {
  let client: ApiClient;
  const mockCredentials = {
    apiUrl: 'http://localhost:3001',
    apiKey: 'lf_test_api_key_123',
  };

  beforeEach(() => {
    client = new ApiClient(mockCredentials);
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make GET request with X-API-Key header', async () => {
    const mockResponse = { id: '1', name: 'Test' };
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await client.get('/api/test');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-Key': 'lf_test_api_key_123',
        }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should make POST request with body', async () => {
    const mockResponse = { id: '1', created: true };
    const requestBody = { name: 'New Item' };

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockResponse,
    } as Response);

    const result = await client.post('/api/items', requestBody);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-Key': 'lf_test_api_key_123',
        }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should make PUT request with body', async () => {
    const mockResponse = { id: '1', updated: true };
    const requestBody = { name: 'Updated Item' };

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await client.put('/api/items/1', requestBody);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/items/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should make DELETE request', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    const result = await client.delete('/api/items/1');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/items/1',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
    expect(result).toBeUndefined();
  });

  it('should throw ApiError on non-ok response', async () => {
    const errorResponse = { code: 'UNAUTHORIZED', message: 'Invalid API key' };

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => errorResponse,
    } as Response);

    await expect(client.get('/api/test')).rejects.toThrow(ApiError);

    try {
      await client.get('/api/test');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(401);
      expect((error as ApiError).code).toBe('UNAUTHORIZED');
      expect((error as ApiError).message).toBe('Invalid API key');
    }
  });

  it('should handle json parse error gracefully', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('JSON parse error');
      },
    } as Response);

    await expect(client.get('/api/test')).rejects.toThrow(ApiError);

    try {
      await client.get('/api/test');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe('UNKNOWN_ERROR');
    }
  });
});

describe('ApiError', () => {
  it('should create error with status code and code', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
  });
});
