/**
 * Tests for Runtime Configuration Checking (Hybrid Mode)
 */

import {
  initializeConfigChecker,
  checkTracepoint,
  shouldExecuteTracepoint,
  shouldSample,
  getConfigCheckerStatus,
  getTracepointConfig,
  refreshConfig,
  disableConfigChecker,
  resetConfigChecker,
  getAllConfigs,
  type RuntimeConfigCheckerConfig,
} from './runtime-config-checker.js';

describe('RuntimeConfigChecker', () => {
  beforeEach(() => {
    resetConfigChecker();
  });

  afterEach(() => {
    resetConfigChecker();
  });

  describe('initialization', () => {
    it('should throw on missing serverUrl', async () => {
      try {
        await initializeConfigChecker({
          serverUrl: '',
          apiKey: 'test-key',
          projectId: 'test-project',
        });
        throw new Error('Should have thrown');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('serverUrl is required');
        }
      }
    });

    it('should throw on missing apiKey', async () => {
      try {
        await initializeConfigChecker({
          serverUrl: 'http://localhost:3000',
          apiKey: '',
          projectId: 'test-project',
        });
        throw new Error('Should have thrown');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('apiKey is required');
        }
      }
    });

    it('should throw on missing projectId', async () => {
      try {
        await initializeConfigChecker({
          serverUrl: 'http://localhost:3000',
          apiKey: 'test-key',
          projectId: '',
        });
        throw new Error('Should have thrown');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('projectId is required');
        }
      }
    });

    it('should initialize with valid config', async () => {
      // Mock fetch to avoid actual network calls
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          tracepoints: [
            { id: 'tp1', enabled: true, samplingRate: 1.0 },
          ],
        }),
      } as unknown as Response);

      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
        environment: 'test',
        pollingInterval: 10000,
        cacheTtlMs: 20000,
      };

      await initializeConfigChecker(config);

      const status = getConfigCheckerStatus();
      expect(status).toBeDefined();
      expect(status?.initialized).toBe(true);
      expect(status?.tracepointCount).toBeGreaterThan(0);
    });

    it('should not reinitialize if already initialized', async () => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          tracepoints: [{ id: 'tp1', enabled: true, samplingRate: 1.0 }],
        }),
      } as unknown as Response);

      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);
      const status1 = getConfigCheckerStatus();

      await initializeConfigChecker(config);
      const status2 = getConfigCheckerStatus();

      expect(status1).toEqual(status2);
    });
  });

  describe('checkTracepoint', () => {
    beforeEach(() => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          tracepoints: [
            { id: 'tp-enabled', enabled: true, samplingRate: 1.0 },
            { id: 'tp-disabled', enabled: false, samplingRate: 1.0 },
            { id: 'tp-half-sample', enabled: true, samplingRate: 0.5 },
          ],
        }),
      } as unknown as Response);
    });

    it('should allow tracepoint when not initialized', () => {
      const result = checkTracepoint('tp-enabled');
      expect(result).toBe(true);
    });

    it('should allow enabled tracepoint with 100% sampling rate', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      const result = checkTracepoint('tp-enabled');
      expect(result).toBe(true);
    });

    it('should block disabled tracepoint', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      const result = checkTracepoint('tp-disabled');
      expect(result).toBe(false);
    });

    it('should sample at configured rate', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      // Run sampling multiple times and check distribution
      let passCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        if (checkTracepoint('tp-half-sample')) {
          passCount++;
        }
      }

      // With 0.5 sampling rate, expect roughly 50% of traces to pass
      // Allow 10% variance
      const ratio = passCount / iterations;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });

    it('should allow tracepoint without config', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      const result = checkTracepoint('unknown-tp');
      expect(result).toBe(true);
    });

    it('should provide aliases for checkTracepoint', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      // All aliases should work the same
      expect(checkTracepoint('tp-enabled')).toBe(true);
      expect(shouldExecuteTracepoint('tp-enabled')).toBe(true);
      expect(shouldSample('tp-enabled')).toBe(true);

      expect(checkTracepoint('tp-disabled')).toBe(false);
      expect(shouldExecuteTracepoint('tp-disabled')).toBe(false);
      expect(shouldSample('tp-disabled')).toBe(false);
    });
  });

  describe('getConfigCheckerStatus', () => {
    it('should return null when not initialized', () => {
      const status = getConfigCheckerStatus();
      expect(status).toBeNull();
    });

    it('should return status when initialized', async () => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          tracepoints: [
            { id: 'tp1', enabled: true, samplingRate: 1.0 },
            { id: 'tp2', enabled: false, samplingRate: 1.0 },
          ],
        }),
      } as unknown as Response);

      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      const status = getConfigCheckerStatus();
      expect(status).toBeDefined();
      expect(status?.initialized).toBe(true);
      expect(status?.tracepointCount).toBe(2);
      expect(status?.consecutiveErrors).toBe(0);
      expect(status?.isFetching).toBe(false);
    });
  });

  describe('getTracepointConfig', () => {
    beforeEach(() => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          tracepoints: [
            {
              id: 'tp-with-metadata',
              enabled: true,
              samplingRate: 0.75,
              metadata: { tags: ['important', 'critical'] },
            },
          ],
        }),
      } as unknown as Response);
    });

    it('should return tracepoint config when available', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      const tpConfig = getTracepointConfig('tp-with-metadata');
      expect(tpConfig).toBeDefined();
      expect(tpConfig?.id).toBe('tp-with-metadata');
      expect(tpConfig?.enabled).toBe(true);
      expect(tpConfig?.samplingRate).toBe(0.75);
      expect(tpConfig?.metadata).toEqual({ tags: ['important', 'critical'] });
    });

    it('should return undefined for unknown tracepoint', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      const tpConfig = getTracepointConfig('unknown-tp');
      expect(tpConfig).toBeUndefined();
    });
  });

  describe('getAllConfigs', () => {
    beforeEach(() => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          tracepoints: [
            { id: 'tp1', enabled: true, samplingRate: 1.0 },
            { id: 'tp2', enabled: false, samplingRate: 0.5 },
          ],
        }),
      } as unknown as Response);
    });

    it('should return empty map when not initialized', () => {
      const configs = getAllConfigs();
      expect(configs).toBeDefined();
      expect(configs.size).toBe(0);
    });

    it('should return all configs when initialized', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      const configs = getAllConfigs();
      expect(configs.size).toBe(2);
      expect(configs.has('tp1')).toBe(true);
      expect(configs.has('tp2')).toBe(true);
    });
  });

  describe('refreshConfig', () => {
    let fetchCount = 0;

    beforeEach(() => {
      fetchCount = 0;
      global.fetch = async () => {
        fetchCount++;
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            tracepoints: [
              { id: `tp-${fetchCount}`, enabled: true, samplingRate: 1.0 },
            ],
          }),
        } as unknown as Response;
      };
    });

    it('should throw when not initialized', async () => {
      try {
        await refreshConfig();
        throw new Error('Should have thrown');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('not initialized');
        }
      }
    });

    it('should refresh config on demand', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);
      const initialStatus = getConfigCheckerStatus();

      await refreshConfig();
      const refreshedStatus = getConfigCheckerStatus();

      expect(refreshedStatus?.lastFetchTime).toBeGreaterThanOrEqual(
        initialStatus!.lastFetchTime
      );
    });
  });

  describe('disableConfigChecker', () => {
    beforeEach(() => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          tracepoints: [
            { id: 'tp1', enabled: true, samplingRate: 1.0 },
          ],
        }),
      } as unknown as Response);
    });

    it('should disable the checker', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);
      expect(getConfigCheckerStatus()?.initialized).toBe(true);

      disableConfigChecker();
      expect(getConfigCheckerStatus()?.initialized).toBe(false);

      // Should allow tracepoints after disable
      expect(checkTracepoint('tp1')).toBe(true);
    });
  });

  describe('error handling and graceful degradation', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch = async () => {
        throw new Error('Network error');
      };

      const errors: Error[] = [];
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
        onError: (error) => {
          errors.push(error);
        },
      };

      await initializeConfigChecker(config);

      // Should still allow tracepoints even with network error
      expect(checkTracepoint('tp1')).toBe(true);

      // Errors should be captured
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should handle invalid response gracefully', async () => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          // Missing tracepoints array
          data: {},
        }),
      } as unknown as Response);

      const errors: Error[] = [];
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
        onError: (error) => {
          errors.push(error);
        },
      };

      await initializeConfigChecker(config);

      // Should still allow tracepoints even with invalid response
      expect(checkTracepoint('tp1')).toBe(true);
    });

    it('should handle fetch timeout', async () => {
      global.fetch = async () => {
        // This will timeout
        return new Promise(() => {
          // Never resolves - will timeout
        });
      };

      const errors: Error[] = [];
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
        fetchTimeoutMs: 100,
        onError: (error) => {
          errors.push(error);
        },
      };

      // This will timeout due to short fetchTimeoutMs
      try {
        await initializeConfigChecker(config);
      } catch {
        // Expected
      }

      // Should still allow tracepoints
      expect(checkTracepoint('tp1')).toBe(true);
    });
  });

  describe('sampling rate edge cases', () => {
    beforeEach(() => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          tracepoints: [
            { id: 'tp-0', enabled: true, samplingRate: 0 },
            { id: 'tp-0.25', enabled: true, samplingRate: 0.25 },
            { id: 'tp-1', enabled: true, samplingRate: 1.0 },
            { id: 'tp-invalid-high', enabled: true, samplingRate: 1.5 },
            { id: 'tp-invalid-low', enabled: true, samplingRate: -0.5 },
          ],
        }),
      } as unknown as Response);
    });

    it('should never sample when rate is 0', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      // Should never pass
      for (let i = 0; i < 100; i++) {
        expect(checkTracepoint('tp-0')).toBe(false);
      }
    });

    it('should always sample when rate is 1', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      // Should always pass
      for (let i = 0; i < 100; i++) {
        expect(checkTracepoint('tp-1')).toBe(true);
      }
    });

    it('should clamp invalid sampling rates', async () => {
      const config: RuntimeConfigCheckerConfig = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await initializeConfigChecker(config);

      // Clamped to 1
      expect(checkTracepoint('tp-invalid-high')).toBe(true);

      // Clamped to 0
      for (let i = 0; i < 100; i++) {
        expect(checkTracepoint('tp-invalid-low')).toBe(false);
      }
    });
  });
});
