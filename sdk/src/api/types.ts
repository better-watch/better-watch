/**
 * Type definitions for the Trace Ingestion API
 */

import type { CapturedVariables } from '../capture/types.js';

/**
 * Single trace event
 */
export interface TraceEvent {
  /**
   * Unique identifier for this trace event
   */
  id: string;

  /**
   * Project ID associated with the trace
   */
  projectId: string;

  /**
   * Source file path
   */
  filePath: string;

  /**
   * Line number where trace occurred
   */
  lineNumber: number;

  /**
   * Column number where trace occurred
   */
  columnNumber?: number;

  /**
   * Function name containing the trace point
   */
  functionName?: string;

  /**
   * Type of trace point (before, after, entry, exit)
   */
  type: 'before' | 'after' | 'entry' | 'exit';

  /**
   * Timestamp when trace was captured (ISO 8601)
   */
  timestamp: string;

  /**
   * Variables captured at this trace point
   */
  variables?: CapturedVariables;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;

  /**
   * Request/session ID for correlation
   */
  sessionId?: string;

  /**
   * Stack trace if available
   */
  stackTrace?: string;
}

/**
 * Batch request for trace ingestion
 */
export interface TraceBatchRequest {
  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Array of trace events
   */
  traces: TraceEvent[];

  /**
   * Optional client version
   */
  clientVersion?: string;
}

/**
 * Response from trace ingestion
 */
export interface TraceIngestionResponse {
  /**
   * Success indicator
   */
  success: boolean;

  /**
   * Message describing the result
   */
  message: string;

  /**
   * Number of traces accepted
   */
  accepted: number;

  /**
   * Number of traces rejected
   */
  rejected: number;

  /**
   * IDs of traces that were accepted
   */
  acceptedIds?: string[];

  /**
   * Details about rejected traces
   */
  rejectionDetails?: Array<{
    id?: string;
    reason: string;
  }>;

  /**
   * Request ID for tracking/debugging
   */
  requestId?: string;
}

/**
 * Configuration for the trace ingestion API
 */
export interface TraceIngestionConfig {
  /**
   * Port to listen on (default: 3000)
   */
  port?: number;

  /**
   * Host to bind to (default: 'localhost')
   */
  host?: string;

  /**
   * Maximum traces per batch (default: 100)
   */
  maxTracesPerBatch?: number;

  /**
   * Maximum payload size in bytes (default: 1MB)
   */
  maxPayloadSize?: number;

  /**
   * Rate limit configuration
   */
  rateLimit?: {
    /**
     * Maximum requests per time window
     */
    maxRequests?: number;

    /**
     * Time window in milliseconds (default: 60000 = 1 minute)
     */
    windowMs?: number;

    /**
     * Per-project limits
     */
    perProject?: boolean;
  };

  /**
   * Storage backend configuration
   */
  storage?: {
    /**
     * Type of storage backend
     */
    type: 'clickhouse' | 'postgresql' | 'memory';

    /**
     * Connection string or configuration
     */
    connection?: string | Record<string, unknown>;
  };

  /**
   * Authentication providers
   */
  auth?: {
    /**
     * Map of API keys to project IDs
     */
    apiKeys?: Record<string, string>;

    /**
     * Custom authentication function
     */
    validate?: (apiKey: string, projectId: string) => Promise<boolean>;
  };
}

/**
 * Validation error details
 */
export interface ValidationError {
  /**
   * Field that failed validation
   */
  field: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Validation rule that failed
   */
  rule?: string;
}

/**
 * Storage backend interface
 */
export interface TraceStorageBackend {
  /**
   * Store a single trace event
   */
  storeTrace(trace: TraceEvent): Promise<void>;

  /**
   * Store multiple trace events
   */
  storeBatch(traces: TraceEvent[]): Promise<number>;

  /**
   * Query traces
   */
  queryTraces(
    projectId: string,
    options?: {
      startTime?: string;
      endTime?: string;
      functionName?: string;
      limit?: number;
    }
  ): Promise<TraceEvent[]>;

  /**
   * Close/cleanup storage connection
   */
  close(): Promise<void>;
}
