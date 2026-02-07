/**
 * Type definitions for Hono middleware tracing
 */

/**
 * Trace context for request-scoped tracing
 */
export interface TraceContext {
  /**
   * Unique trace ID for this request
   */
  traceId: string;

  /**
   * Span ID for this specific operation
   */
  spanId: string;

  /**
   * Parent span ID (for nested calls)
   */
  parentSpanId?: string;

  /**
   * W3C Trace Context parent
   */
  traceParent?: string;

  /**
   * W3C Trace State
   */
  traceState?: string;

  /**
   * Request metadata
   */
  requestId: string;

  /**
   * Method of the request
   */
  method: string;

  /**
   * URL path
   */
  path: string;

  /**
   * HTTP status code (set after response)
   */
  statusCode?: number;

  /**
   * Start timestamp (milliseconds)
   */
  startTime: number;

  /**
   * End timestamp (milliseconds)
   */
  endTime?: number;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Middleware options for trace context setup
 */
export interface HonoTraceOptions {
  /**
   * Include request headers in trace
   */
  captureHeaders?: boolean;

  /**
   * Headers to exclude from capture (e.g., Authorization, Cookie)
   */
  excludeHeaders?: string[];

  /**
   * Callback to handle trace context
   */
  onTrace?: (context: TraceContext) => void | Promise<void>;

  /**
   * Whether tracing is enabled
   */
  enabled?: boolean;

  /**
   * Custom trace ID generator
   */
  generateTraceId?: () => string;

  /**
   * Custom span ID generator
   */
  generateSpanId?: () => string;

  /**
   * Custom request ID generator
   */
  generateRequestId?: () => string;
}

/**
 * W3C Trace Context header format
 * https://www.w3.org/TR/trace-context/
 */
export interface W3CTraceContext {
  version: string;
  traceId: string;
  parentId: string;
  traceFlags: string;
}

/**
 * Hono context extension
 */
export interface HonoTraceContext {
  traceContext?: TraceContext;
}
