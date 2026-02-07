/**
 * Tests for RemoteConfigFetcher
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoteConfigFetcher } from './remote-config-fetcher.js';
import type { StoredTracepointConfig } from './config-types.js';

// Mock fetch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = vi.fn();

/**
 * Create a sample tracepoint config for testing
 */
function createSampleTracepoint(id: string, enabled = true): StoredTracepointConfig {
  return {
    id,
    projectId: 'test-project',
    environment: 'test',
    filePath: `/src/test-${id}.ts`,
    type: 'entry',
    code: 'console.log("test");',
    enabled,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

describe('RemoteConfigFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if remoteUrl is missing', () => {
      expect(() => {
        new RemoteConfigFetcher({
          remoteUrl: '',
        });
      }).toThrow('RemoteConfigFetcher: remoteUrl is required');
    });

    it('should throw error if remoteUrl is invalid', () => {
      expect(() => {
        new RemoteConfigFetcher({
          remoteUrl: 'not-a-url',
        });
      }).toThrow('RemoteConfigFetcher: Invalid remoteUrl');
    });

    it('should create instance with valid URL', () => {
      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
      });
      expect(fetcher).toBeDefined();
    });

    it('should set default configuration values', () => {
      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
      });
      const state = fetcher.getCacheState();
      expect(state).toBeNull(); // No cache initially
    });
  });

  describe('fetch', () => {
    it('should fetch configuration from remote server', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleConfig,
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        logging: false,
      });

      const result = await fetcher.fetch();

      expect(result.config).toEqual(sampleConfig);
      expect(result.source).toBe('remote');
      expect(result.fetchedAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should handle response with tracepoints property', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracepoints: sampleConfig,
          version: 'v1.0.0',
          fetchedAt: new Date().toISOString(),
        }),
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        logging: false,
      });

      const result = await fetcher.fetch();

      expect(result.config).toEqual(sampleConfig);
      expect(result.version).toBe('v1.0.0');
      expect(result.source).toBe('remote');
    });

    it('should use cached config when cache is valid', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleConfig,
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        cacheTtlMs: 60000, // 1 minute
        logging: false,
      });

      // First fetch
      const result1 = await fetcher.fetch();
      expect(result1.source).toBe('remote');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledTimes(1);

      // Second fetch should use cache
      const result2 = await fetcher.fetch();
      expect(result2.source).toBe('cache');
      expect(result2.config).toEqual(sampleConfig);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it('should retry on network failure', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];

      // First two calls fail, third succeeds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => sampleConfig,
        });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        maxRetries: 3,
        retryDelayMs: 10, // Short delay for testing
        logging: false,
      });

      const result = await fetcher.fetch();

      expect(result.config).toEqual(sampleConfig);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockRejectedValue(new Error('Network error'));

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        maxRetries: 2,
        retryDelayMs: 10,
        logging: false,
      });

      await expect(fetcher.fetch()).rejects.toThrow('Failed to fetch remote configuration');
    });

    it('should throw error on invalid response format', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'format' }),
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        logging: false,
      });

      await expect(fetcher.fetch()).rejects.toThrow('Invalid response format');
    });

    it('should throw error on server error response', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        logging: false,
      });

      await expect(fetcher.fetch()).rejects.toThrow('Remote server returned 500');
    });
  });

  describe('authentication', () => {
    it('should add API key authentication header', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleConfig,
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        auth: {
          type: 'api-key',
          token: 'sk_test123',
        },
        logging: false,
      });

      await fetcher.fetch();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'ApiKey sk_test123',
          }),
        })
      );
    });

    it('should add bearer token authentication header', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleConfig,
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        auth: {
          type: 'bearer',
          token: 'eyJhbGc...',
        },
        logging: false,
      });

      await fetcher.fetch();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer eyJhbGc...',
          }),
        })
      );
    });

    it('should add custom authentication header', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleConfig,
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        auth: {
          type: 'custom',
          token: 'my-token',
          headerName: 'X-Custom-Auth',
          headerFormat: 'Token {token}',
        },
        logging: false,
      });

      await fetcher.fetch();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Auth': 'Token my-token',
          }),
        })
      );
    });
  });

  describe('query parameters', () => {
    it('should add projectId and environment to query params', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleConfig,
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        projectId: 'project-123',
        environment: 'production',
        logging: false,
      });

      await fetcher.fetch();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callUrl = ((global as any).fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('projectId=project-123');
      expect(callUrl).toContain('environment=production');
    });
  });

  describe('schema validation', () => {
    it('should validate configuration schema', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'tp-1',
            enabled: 'invalid', // Should be boolean
            filePath: '/src/test.ts',
            type: 'entry',
            code: 'console.log("test");',
          },
        ],
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        validateSchema: true,
        logging: false,
      });

      await expect(fetcher.fetch()).rejects.toThrow('enabled must be a boolean');
    });

    it('should skip schema validation if disabled', async () => {
      const invalidConfig = { invalid: 'data' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [invalidConfig],
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        validateSchema: false,
        logging: false,
      });

      const result = await fetcher.fetch();
      expect(result.config).toEqual([invalidConfig]);
    });
  });

  describe('merge', () => {
    it('should merge local and remote configs with remote precedence', () => {
      const local = [
        createSampleTracepoint('tp-1', false),
        createSampleTracepoint('tp-2', true),
        createSampleTracepoint('tp-3', true),
      ];

      const remote = [
        createSampleTracepoint('tp-1', true), // Override: enable
        createSampleTracepoint('tp-4', true), // New: add
      ];

      const merged = RemoteConfigFetcher.merge(local, remote);

      expect(merged).toHaveLength(4);
      expect(merged.find((t) => t.id === 'tp-1')).toEqual(
        expect.objectContaining({
          id: 'tp-1',
          enabled: true, // From remote
        })
      );
      expect(merged.find((t) => t.id === 'tp-2')).toEqual(
        expect.objectContaining({
          id: 'tp-2',
          enabled: true, // From local (no remote override)
        })
      );
      expect(merged.find((t) => t.id === 'tp-3')).toEqual(
        expect.objectContaining({
          id: 'tp-3',
          enabled: true, // From local
        })
      );
      expect(merged.find((t) => t.id === 'tp-4')).toEqual(
        expect.objectContaining({
          id: 'tp-4',
          enabled: true, // From remote (new)
        })
      );
    });

    it('should handle empty local config', () => {
      const remote = [createSampleTracepoint('tp-1')];
      const merged = RemoteConfigFetcher.merge([], remote);
      expect(merged).toEqual(remote);
    });

    it('should handle empty remote config', () => {
      const local = [createSampleTracepoint('tp-1')];
      const merged = RemoteConfigFetcher.merge(local, []);
      expect(merged).toEqual(local);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValue({
        ok: true,
        json: async () => sampleConfig,
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        cacheTtlMs: 60000,
        logging: false,
      });

      // First fetch
      await fetcher.fetch();
      expect(fetcher.getCacheState()).not.toBeNull();

      // Clear cache
      fetcher.clearCache();
      expect(fetcher.getCacheState()).toBeNull();

      // Next fetch should call remote again
      await fetcher.fetch();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledTimes(2);
    });

    it('should re-fetch when cache expires', async () => {
      const sampleConfig = [createSampleTracepoint('tp-1')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValue({
        ok: true,
        json: async () => sampleConfig,
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        cacheTtlMs: 0, // Immediate expiration
        logging: false,
      });

      // First fetch
      const result1 = await fetcher.fetch();
      expect(result1.source).toBe('remote');

      // Small delay to ensure cache expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second fetch should re-fetch from remote
      const result2 = await fetcher.fetch();
      expect(result2.source).toBe('remote');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('timeout handling', () => {
    it('should timeout on slow responses', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockImplementationOnce(
        () =>
          new Promise(() => {
            // Never resolve - simulates hanging request
          })
      );

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        timeoutMs: 100,
        maxRetries: 1,
        retryDelayMs: 10,
        logging: false,
      });

      await expect(fetcher.fetch()).rejects.toThrow();
    });
  });

  describe('version tracking', () => {
    it('should track config version', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tracepoints: [createSampleTracepoint('tp-1')],
          version: 'abc123def456',
        }),
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        logging: false,
      });

      const result = await fetcher.fetch();

      expect(result.version).toBe('abc123def456');
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        maxRetries: 0,
        logging: false,
      });

      await expect(fetcher.fetch()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch.mockRejectedValueOnce(new Error('Network failed'));

      const fetcher = new RemoteConfigFetcher({
        remoteUrl: 'https://config.example.com/api/config',
        maxRetries: 0,
        logging: false,
      });

      await expect(fetcher.fetch()).rejects.toThrow('Failed to fetch remote configuration');
    });
  });
});
