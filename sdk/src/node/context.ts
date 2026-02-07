/**
 * Async context management for request-scoped tracing
 *
 * Uses AsyncLocalStorage (Node.js 12.17+) to maintain trace context
 * across async boundaries without explicit passing
 */

import { AsyncLocalStorage } from 'async_hooks';
import type { TraceContext, W3CTraceContext } from './types.js';

/**
 * Async local storage for trace context
 * This allows each async operation to have its own context
 */
const traceContextStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Get the current trace context (thread-local / async-local)
 */
export function getTraceContext(): TraceContext | undefined {
  return traceContextStorage.getStore();
}

/**
 * Set the current trace context
 */
export function setTraceContext(context: TraceContext): void {
  traceContextStorage.run(context, () => {});
}

/**
 * Run a callback with a specific trace context
 * This ensures all async operations within the callback use this context
 */
export function runWithTraceContext<T>(
  context: TraceContext,
  callback: () => T
): T {
  return traceContextStorage.run(context, callback);
}

/**
 * Run an async callback with a specific trace context
 */
export async function runWithTraceContextAsync<T>(
  context: TraceContext,
  callback: () => Promise<T>
): Promise<T> {
  return traceContextStorage.run(context, callback);
}

/**
 * Generate a trace ID (hexadecimal, 32 characters)
 * Compatible with W3C Trace Context format
 */
export function generateTraceId(): string {
  // Generate 16 random bytes as hexadecimal (32 chars)
  return Array.from({ length: 16 })
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a span ID (hexadecimal, 16 characters)
 * Compatible with W3C Trace Context format
 */
export function generateSpanId(): string {
  // Generate 8 random bytes as hexadecimal (16 chars)
  return Array.from({ length: 8 })
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a request ID
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse W3C Trace Context from traceparent header
 * Format: version-traceId-parentId-traceFlags
 * Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */
export function parseTraceParent(traceParent: string): W3CTraceContext | null {
  try {
    const parts = traceParent.split('-');
    if (parts.length !== 4) {
      return null;
    }

    const [version, traceId, parentId, traceFlags] = parts;

    // Validate format
    if (version.length !== 2 || traceId.length !== 32 || parentId.length !== 16 || traceFlags.length !== 2) {
      return null;
    }

    return {
      version,
      traceId,
      parentId,
      traceFlags,
    };
  } catch {
    return null;
  }
}

/**
 * Create W3C Trace Context traceparent header
 */
export function createTraceParent(
  traceId: string,
  spanId: string,
  traceFlags: string = '01'
): string {
  return `00-${traceId}-${spanId}-${traceFlags}`;
}

/**
 * Extract trace context from request headers
 */
export function extractTraceContextFromHeaders(
  headers: Record<string, string | string[] | undefined>
): Partial<TraceContext> {
  const traceContext: Partial<TraceContext> = {};

  // Check for W3C Trace Context traceparent header
  const traceParent = headers['traceparent'];
  if (traceParent) {
    const traceParentStr = Array.isArray(traceParent) ? traceParent[0] : traceParent;
    const parsed = parseTraceParent(traceParentStr);
    if (parsed) {
      traceContext.traceId = parsed.traceId;
      traceContext.parentSpanId = parsed.parentId;
      traceContext.traceParent = traceParentStr;
    }
  }

  // Check for tracestate header
  const traceState = headers['tracestate'];
  if (traceState) {
    traceContext.traceState = Array.isArray(traceState) ? traceState[0] : traceState;
  }

  // Fallback to X-Trace-ID header if traceparent not found
  if (!traceContext.traceId) {
    const xTraceId = headers['x-trace-id'];
    if (xTraceId) {
      traceContext.traceId = Array.isArray(xTraceId) ? xTraceId[0] : xTraceId;
    }
  }

  return traceContext;
}

/**
 * Clear the current trace context
 * Useful for cleanup
 */
export function clearTraceContext(): void {
  const context = getTraceContext();
  if (context) {
    // AsyncLocalStorage doesn't have a clear method, but running with undefined works
    traceContextStorage.run(undefined as any, () => {});
  }
}
