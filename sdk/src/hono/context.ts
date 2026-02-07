/**
 * Async context management for request-scoped tracing
 *
 * Provides runtime-agnostic trace context handling that works across
 * Node.js, Cloudflare Workers, Deno Deploy, and Bun
 */

import type { TraceContext, W3CTraceContext } from './types.js';

/**
 * WeakMap to store trace context per request
 * Works across all runtimes (Node.js, Cloudflare Workers, Deno, Bun)
 */
const contextMap = new WeakMap<object, TraceContext>();

/**
 * Fallback global context for edge environments without WeakMap support
 */
let globalContext: TraceContext | undefined;

/**
 * Get the current trace context
 * @param request Optional request object to retrieve context for
 */
export function getTraceContext(request?: object): TraceContext | undefined {
  if (request) {
    return contextMap.get(request);
  }
  return globalContext;
}

/**
 * Set the trace context for a request
 */
export function setTraceContext(context: TraceContext, request?: object): void {
  if (request) {
    contextMap.set(request, context);
  } else {
    globalContext = context;
  }
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
  headers: Record<string, string | string[] | undefined> | Headers
): Partial<TraceContext> {
  const traceContext: Partial<TraceContext> = {};

  // Handle both object headers and Headers interface (for web APIs)
  const headerValue = (key: string): string | undefined => {
    if (headers instanceof Map || (typeof headers.get === 'function')) {
      // Headers object (web API)
      return (headers as any).get(key);
    }
    // Object headers
    const value = (headers as Record<string, string | string[] | undefined>)[key];
    return Array.isArray(value) ? value[0] : value;
  };

  // Check for W3C Trace Context traceparent header
  const traceParent = headerValue('traceparent');
  if (traceParent) {
    const parsed = parseTraceParent(traceParent);
    if (parsed) {
      traceContext.traceId = parsed.traceId;
      traceContext.parentSpanId = parsed.parentId;
      traceContext.traceParent = traceParent;
    }
  }

  // Check for tracestate header
  const traceState = headerValue('tracestate');
  if (traceState) {
    traceContext.traceState = traceState;
  }

  // Fallback to X-Trace-ID header if traceparent not found
  if (!traceContext.traceId) {
    const xTraceId = headerValue('x-trace-id');
    if (xTraceId) {
      traceContext.traceId = xTraceId;
    }
  }

  return traceContext;
}

/**
 * Clear the trace context
 */
export function clearTraceContext(request?: object): void {
  if (request) {
    contextMap.delete(request);
  } else {
    globalContext = undefined;
  }
}
