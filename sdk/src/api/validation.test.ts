/**
 * Tests for validation module
 */

import { describe, it, expect } from 'vitest';
import {
  validateTraceEvent,
  validateBatchRequest,
  validateTracesInBatch,
} from './validation.js';
import type { TraceBatchRequest, TraceEvent } from './types.js';

describe('Validation', () => {
  describe('validateTraceEvent', () => {
    it('should accept valid trace event', () => {
      const trace: TraceEvent = {
        id: 'trace-1',
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: 10,
        type: 'entry',
        timestamp: new Date().toISOString(),
      };

      const errors = validateTraceEvent(trace);

      expect(errors).toHaveLength(0);
    });

    it('should require trace to be an object', () => {
      const errors = validateTraceEvent('not an object');

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('trace');
    });

    it('should require id field', () => {
      const trace = {
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: 10,
        type: 'entry',
        timestamp: new Date().toISOString(),
      };

      const errors = validateTraceEvent(trace);

      expect(errors.some((e) => e.field === 'id')).toBe(true);
    });

    it('should require projectId field', () => {
      const trace: Omit<TraceEvent, 'projectId'> = {
        id: 'trace-1',
        filePath: 'src/index.ts',
        lineNumber: 10,
        type: 'entry',
        timestamp: new Date().toISOString(),
      };

      const errors = validateTraceEvent(trace);

      expect(errors.some((e) => e.field === 'projectId')).toBe(true);
    });

    it('should require lineNumber to be positive', () => {
      const trace = {
        id: 'trace-1',
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: -1,
        type: 'entry',
        timestamp: new Date().toISOString(),
      };

      const errors = validateTraceEvent(trace);

      expect(errors.some((e) => e.field === 'lineNumber')).toBe(true);
    });

    it('should require valid type', () => {
      const trace = {
        id: 'trace-1',
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: 10,
        type: 'invalid',
        timestamp: new Date().toISOString(),
      };

      const errors = validateTraceEvent(trace);

      expect(errors.some((e) => e.field === 'type')).toBe(true);
    });

    it('should require valid ISO 8601 timestamp', () => {
      const trace = {
        id: 'trace-1',
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: 10,
        type: 'entry',
        timestamp: 'not-a-date',
      };

      const errors = validateTraceEvent(trace);

      expect(errors.some((e) => e.field === 'timestamp')).toBe(true);
    });

    it('should allow optional columnNumber', () => {
      const trace: TraceEvent = {
        id: 'trace-1',
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: 10,
        columnNumber: 5,
        type: 'entry',
        timestamp: new Date().toISOString(),
      };

      const errors = validateTraceEvent(trace);

      expect(errors).toHaveLength(0);
    });

    it('should reject negative columnNumber', () => {
      const trace = {
        id: 'trace-1',
        projectId: 'project-1',
        filePath: 'src/index.ts',
        lineNumber: 10,
        columnNumber: -1,
        type: 'entry',
        timestamp: new Date().toISOString(),
      };

      const errors = validateTraceEvent(trace);

      expect(errors.some((e) => e.field === 'columnNumber')).toBe(true);
    });
  });

  describe('validateBatchRequest', () => {
    it('should accept valid batch request', () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key',
        projectId: 'project-1',
        traces: [
          {
            id: 'trace-1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const errors = validateBatchRequest(request);

      expect(errors).toHaveLength(0);
    });

    it('should require apiKey', () => {
      const request = {
        projectId: 'project-1',
        traces: [],
      };

      const errors = validateBatchRequest(request);

      expect(errors.some((e) => e.field === 'apiKey')).toBe(true);
    });

    it('should require projectId', () => {
      const request = {
        apiKey: 'test-key',
        traces: [],
      };

      const errors = validateBatchRequest(request);

      expect(errors.some((e) => e.field === 'projectId')).toBe(true);
    });

    it('should require traces array', () => {
      const request = {
        apiKey: 'test-key',
        projectId: 'project-1',
      };

      const errors = validateBatchRequest(request);

      expect(errors.some((e) => e.field === 'traces')).toBe(true);
    });

    it('should require non-empty traces array', () => {
      const request = {
        apiKey: 'test-key',
        projectId: 'project-1',
        traces: [],
      };

      const errors = validateBatchRequest(request);

      expect(errors.some((e) => e.field === 'traces')).toBe(true);
    });

    it('should allow optional clientVersion', () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key',
        projectId: 'project-1',
        traces: [
          {
            id: 'trace-1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
        ],
        clientVersion: '1.0.0',
      };

      const errors = validateBatchRequest(request);

      expect(errors).toHaveLength(0);
    });
  });

  describe('validateTracesInBatch', () => {
    it('should validate all traces in batch', () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key',
        projectId: 'project-1',
        traces: [
          {
            id: 'trace-1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'trace-2',
            projectId: 'project-1',
            filePath: 'src/other.ts',
            lineNumber: 20,
            type: 'exit',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const results = validateTracesInBatch(request);

      expect(results).toHaveLength(0);
    });

    it('should identify invalid traces by index', () => {
      const request: TraceBatchRequest = {
        apiKey: 'test-key',
        projectId: 'project-1',
        traces: [
          {
            id: 'trace-1',
            projectId: 'project-1',
            filePath: 'src/index.ts',
            lineNumber: 10,
            type: 'entry',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'trace-2',
            projectId: 'project-1',
            filePath: 'src/other.ts',
            lineNumber: -5, // Invalid
            type: 'exit',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'trace-3',
            projectId: 'project-1',
            filePath: 'src/another.ts',
            lineNumber: 30,
            type: 'invalid-type', // Invalid
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const results = validateTracesInBatch(request);

      expect(results).toHaveLength(2);
      expect(results[0].index).toBe(1);
      expect(results[1].index).toBe(2);
    });
  });
});
