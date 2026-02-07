/**
 * Tests for Trace Ingestion API Server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TraceIngestionServer } from './server.js';
import type { TraceEvent, TraceBatchRequest } from './types.js';

describe('TraceIngestionServer', () => {
  let server: TraceIngestionServer;

  beforeEach(() => {
    server = new TraceIngestionServer({
      maxTracesPerBatch: 100,
      maxPayloadSize: 1024 * 1024,
      rateLimit: {
        maxRequests: 10,
        windowMs: 60000,
        perProject: true,
      },
      auth: {
        apiKeys: {
          'test-key-1': 'project-1',
          'test-key-2': 'project-2',
        },
      },
    });
  });

  afterEach(async () => {
    await server.shutdown();
  });

  describe('Basic ingestion', () => {
    it('should ingest valid traces successfully', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
            functionName: 'main',
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(true);
      expect(response.accepted).toBe(1);
      expect(response.rejected).toBe(0);
    });

    it('should handle multiple traces in a batch', async () => {
      const traces: TraceEvent[] = Array.from({ length: 5 }, (_, i) => ({
        id: `trace-${i}`,
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: 10 + i,
        type: 'entry' as const,
        timestamp: new Date().toISOString(),
      }));

      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces,
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(true);
      expect(response.accepted).toBe(5);
      expect(response.rejected).toBe(0);
    });
  });

  describe('Authentication', () => {
    it('should reject requests with invalid API key', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'invalid-key',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(false);
      expect(response.message).toContain('Authentication failed');
    });

    it('should reject requests with mismatched project ID', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-2',
        traces: [
          {
            id: '1',
            projectId: 'project-2',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(false);
      expect(response.message).toContain('Authentication failed');
    });

    it('should allow adding new API keys dynamically', async () => {
      server.getAuthenticator().addApiKey('new-key', 'project-1');

      const request: TraceBatchRequest = {
        apiKey: 'new-key',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should reject requests with missing required fields', async () => {
      const request = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        // missing traces
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(false);
      expect(response.message).toContain('Traces must be an array');
    });

    it('should reject traces with missing required fields', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            projectId: 'project-1',
            filePath: 'src/other.ts',
            lineNumber: -1, // Invalid: must be positive
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.accepted).toBe(1);
      expect(response.rejected).toBe(1);
      expect(response.rejectionDetails).toBeDefined();
      expect(response.rejectionDetails![0].reason).toContain('lineNumber');
    });

    it('should reject invalid timestamp', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: 'not-a-date',
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(false);
      expect(response.rejected).toBe(1);
    });

    it('should reject invalid trace type', async () => {
      const request = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'invalid-type',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('should allow requests within rate limit', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(true);
    });

    it('should reject requests exceeding rate limit', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        request.traces[0].id = `trace-${i}`;
        const response = await server.ingestTraces(request);
        expect(response.success).toBe(true);
      }

      // The 11th request should be rejected
      request.traces[0].id = 'trace-11';
      const response = await server.ingestTraces(request);

      expect(response.success).toBe(false);
      expect(response.message).toContain('Rate limit exceeded');
    });

    it('should track rate limits per project', async () => {
      const request1: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const request2: TraceBatchRequest = {
        apiKey: 'test-key-2',
        projectId: 'project-2',
        traces: [
          {
            id: '2',
            projectId: 'project-2',
            filePath: 'src/other.ts',
            lineNumber: 20,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      // Both should succeed as they're different projects
      const response1 = await server.ingestTraces(request1);
      const response2 = await server.ingestTraces(request2);

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
    });
  });

  describe('Batch size limits', () => {
    it('should reject batches exceeding max size', async () => {
      const traces: TraceEvent[] = Array.from({ length: 101 }, (_, i) => ({
        id: `trace-${i}`,
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: 10,
        type: 'entry' as const,
        timestamp: new Date().toISOString(),
      }));

      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces,
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(false);
      expect(response.message).toContain('Batch size exceeds maximum');
    });

    it('should reject empty trace batches', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(false);
      expect(response.message).toContain('Traces array must not be empty');
    });
  });

  describe('Payload size limits', () => {
    it('should reject payloads exceeding max size', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await server.ingestTraces(
        request,
        2 * 1024 * 1024 // 2MB, exceeds 1MB limit
      );

      expect(response.success).toBe(false);
      expect(response.message).toContain('Payload size exceeds maximum');
    });
  });

  describe('Storage integration', () => {
    it('should store traces in the configured backend', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: 'test-1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'test-2',
            projectId: 'project-1',
            filePath: 'src/other.ts',
            lineNumber: 20,
            type: 'exit',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await server.ingestTraces(request);

      expect(response.success).toBe(true);
      expect(response.accepted).toBe(2);

      // Query the stored traces
      const storage = server.getStorage();
      const traces = await storage.queryTraces('project-1');

      expect(traces).toHaveLength(2);
      expect(traces[0].id).toBe('test-1');
      expect(traces[1].id).toBe('test-2');
    });
  });

  describe('Request ID tracking', () => {
    it('should provide unique request IDs', async () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key-1',
        projectId: 'project-1',
        traces: [
          {
            id: '1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response1 = await server.ingestTraces(request);
      const response2 = await server.ingestTraces(request);

      expect(response1.requestId).toBeDefined();
      expect(response2.requestId).toBeDefined();
      expect(response1.requestId).not.toBe(response2.requestId);
    });
  });
});
