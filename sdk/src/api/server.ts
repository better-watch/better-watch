/**
 * Trace Ingestion API Server
 */

import type {
  TraceIngestionConfig,
  TraceBatchRequest,
  TraceIngestionResponse,
  TraceStorageBackend,
} from './types.js';
import { validateBatchRequest, validateTracesInBatch } from './validation.js';
import { Authenticator } from './auth.js';
import { RateLimiter } from './rate-limiter.js';
import {
  InMemoryStorage,
  ClickHouseStorage,
  PostgreSQLStorage,
} from './storage.js';

/**
 * Trace Ingestion API Server
 */
export class TraceIngestionServer {
  private config: Required<TraceIngestionConfig>;
  private storage: TraceStorageBackend;
  private authenticator: Authenticator;
  private rateLimiter: RateLimiter;
  private requestCounter: number = 0;

  constructor(config: TraceIngestionConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
      maxTracesPerBatch: config.maxTracesPerBatch || 100,
      maxPayloadSize: config.maxPayloadSize || 1024 * 1024, // 1MB default
      rateLimit: {
        maxRequests: config.rateLimit?.maxRequests || 100,
        windowMs: config.rateLimit?.windowMs || 60000, // 1 minute default
        perProject: config.rateLimit?.perProject ?? true,
      },
      storage: config.storage || { type: 'memory' },
      auth: config.auth || {},
    };

    // Initialize storage backend
    this.storage = this.initializeStorage();

    // Initialize authenticator
    this.authenticator = new Authenticator(this.config.auth);

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      maxRequests: this.config.rateLimit.maxRequests ?? 100,
      windowMs: this.config.rateLimit.windowMs ?? 60000,
      perProject: this.config.rateLimit.perProject ?? true,
    });
  }

  private initializeStorage(): TraceStorageBackend {
    switch (this.config.storage.type) {
      case 'clickhouse':
        return new ClickHouseStorage(
          (this.config.storage.connection as string) || 'http://localhost:8123'
        );
      case 'postgresql':
        return new PostgreSQLStorage(
          (this.config.storage.connection as string) ||
            'postgresql://localhost/traces'
        );
      case 'memory':
      default:
        return new InMemoryStorage();
    }
  }

  /**
   * Process a batch trace ingestion request
   */
  async ingestTraces(payload: unknown, payloadSize?: number): Promise<TraceIngestionResponse> {
    this.requestCounter++;
    const requestId = `req-${Date.now()}-${this.requestCounter}`;

    // Validate payload size
    if (payloadSize && payloadSize > this.config.maxPayloadSize) {
      return {
        success: false,
        message: `Payload size exceeds maximum of ${this.config.maxPayloadSize} bytes`,
        accepted: 0,
        rejected: 0,
        requestId,
      };
    }

    // Validate request structure
    const structureErrors = validateBatchRequest(payload);
    if (structureErrors.length > 0) {
      const firstError = structureErrors[0];
      return {
        success: false,
        message: firstError.message,
        accepted: 0,
        rejected: 0,
        rejectionDetails: structureErrors.map((e) => ({
          reason: `${e.field}: ${e.message}`,
        })),
        requestId,
      };
    }

    const request = payload as TraceBatchRequest;

    // Authenticate
    const isAuthenticated = await this.authenticator.authenticate(
      request.apiKey,
      request.projectId
    );

    if (!isAuthenticated) {
      return {
        success: false,
        message: 'Authentication failed: Invalid API key or project ID',
        accepted: 0,
        rejected: 0,
        requestId,
      };
    }

    // Rate limiting
    const rateLimitKey = this.config.rateLimit.perProject
      ? `project:${request.projectId}`
      : `api-key:${request.apiKey}`;

    if (!this.rateLimiter.isAllowed(rateLimitKey)) {
      const resetTime = this.rateLimiter.getResetTime(rateLimitKey);
      return {
        success: false,
        message: `Rate limit exceeded. Resets at ${new Date(resetTime).toISOString()}`,
        accepted: 0,
        rejected: 0,
        requestId,
      };
    }

    // Check batch size
    if (request.traces.length > this.config.maxTracesPerBatch) {
      return {
        success: false,
        message: `Batch size exceeds maximum of ${this.config.maxTracesPerBatch} traces`,
        accepted: 0,
        rejected: request.traces.length,
        requestId,
      };
    }

    // Validate individual traces
    const traceValidationErrors = validateTracesInBatch(request);

    if (traceValidationErrors.length > 0) {
      const acceptedTraces = request.traces.filter(
        (_, index) =>
          !traceValidationErrors.some((e) => e.index === index)
      );

      // Store valid traces
      let acceptedCount = 0;
      if (acceptedTraces.length > 0) {
        try {
          acceptedCount = await this.storage.storeBatch(acceptedTraces);
        } catch (error) {
          return {
            success: false,
            message: `Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            accepted: 0,
            rejected: request.traces.length,
            requestId,
          };
        }
      }

      return {
        success: false,
        message: `${acceptedCount} traces accepted, ${traceValidationErrors.length} traces rejected`,
        accepted: acceptedCount,
        rejected: traceValidationErrors.length,
        acceptedIds: acceptedTraces.map((t) => t.id),
        rejectionDetails: traceValidationErrors.map((e) => ({
          id: request.traces[e.index].id,
          reason: e.errors.map((err) => `${err.field}: ${err.message}`).join('; '),
        })),
        requestId,
      };
    }

    // All traces are valid, store them
    try {
      const acceptedCount = await this.storage.storeBatch(request.traces);
      return {
        success: true,
        message: `All ${acceptedCount} traces ingested successfully`,
        accepted: acceptedCount,
        rejected: 0,
        acceptedIds: request.traces.map((t) => t.id),
        requestId,
      };
    } catch (error) {
      return {
        success: false,
        message: `Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        accepted: 0,
        rejected: request.traces.length,
        requestId,
      };
    }
  }

  /**
   * Get server configuration
   */
  getConfig(): TraceIngestionConfig {
    return { ...this.config };
  }

  /**
   * Get storage backend
   */
  getStorage(): TraceStorageBackend {
    return this.storage;
  }

  /**
   * Get authenticator
   */
  getAuthenticator(): Authenticator {
    return this.authenticator;
  }

  /**
   * Get rate limiter
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  /**
   * Shutdown server
   */
  async shutdown(): Promise<void> {
    await this.storage.close();
  }
}
