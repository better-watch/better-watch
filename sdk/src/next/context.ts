/**
 * Async context management for Next.js request-scoped tracing
 *
 * Uses AsyncLocalStorage (Node.js 12.17+) to maintain trace context
 * across async boundaries without explicit passing.
 * For edge runtime, uses a WeakMap-based fallback (Cloudflare Workers).
 */

import type { NextTraceContext } from './types.js';

/**
 * Detect runtime environment
 */
function isEdgeRuntime(): boolean {
  if (typeof globalThis !== 'undefined') {
    // Cloudflare Workers, Vercel Edge Runtime
    if ('caches' in globalThis || 'crypto' in globalThis) {
      return true;
    }
  }
  return false;
}

/**
 * AsyncLocalStorage for Node.js runtime
 */
let traceContextStorage: any = null;

// Initialize AsyncLocalStorage for Node.js (not in edge runtime)
if (!isEdgeRuntime()) {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const asyncHooks = require('async_hooks') as any;
    traceContextStorage = new asyncHooks.AsyncLocalStorage();
  } catch {
    // Fallback when AsyncLocalStorage is unavailable
  }
}

/**
 * WeakMap-based context storage for edge runtime
 */
const edgeContextMap = new WeakMap<object, NextTraceContext>();
let edgeContextKey: object | null = null;

/**
 * Get the current trace context (thread-local / async-local)
 */
export function getTraceContext(): NextTraceContext | undefined {
  if (traceContextStorage) {
    return traceContextStorage.getStore();
  }

  // Fallback for edge runtime
  if (edgeContextKey && edgeContextMap.has(edgeContextKey)) {
    return edgeContextMap.get(edgeContextKey);
  }

  return undefined;
}

/**
 * Set the current trace context
 */
export function setTraceContext(context: NextTraceContext): void {
  if (traceContextStorage) {
    traceContextStorage.run(context, () => {});
  } else {
    // Fallback for edge runtime
    if (!edgeContextKey) {
      edgeContextKey = {};
    }
    edgeContextMap.set(edgeContextKey, context);
  }
}

/**
 * Run a callback with a specific trace context
 */
export function runWithTraceContext<T>(context: NextTraceContext, callback: () => T): T {
  if (traceContextStorage) {
    return traceContextStorage.run(context, callback);
  }

  // Fallback for edge runtime
  const oldKey = edgeContextKey;
  edgeContextKey = {};
  edgeContextMap.set(edgeContextKey, context);

  try {
    return callback();
  } finally {
    edgeContextKey = oldKey;
  }
}

/**
 * Run an async callback with a specific trace context
 */
export async function runWithTraceContextAsync<T>(
  context: NextTraceContext,
  callback: () => Promise<T>
): Promise<T> {
  if (traceContextStorage) {
    return traceContextStorage.run(context, callback);
  }

  // Fallback for edge runtime
  const oldKey = edgeContextKey;
  edgeContextKey = {};
  edgeContextMap.set(edgeContextKey, context);

  try {
    return await callback();
  } finally {
    edgeContextKey = oldKey;
  }
}

/**
 * Generate a trace ID (hexadecimal, 32 characters)
 */
export function generateTraceId(): string {
  return Array.from({ length: 16 })
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a span ID (hexadecimal, 16 characters)
 */
export function generateSpanId(): string {
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
 */
export function parseTraceParent(traceParent: string) {
  try {
    const parts = traceParent.split('-');
    if (parts.length !== 4) {
      return null;
    }

    const [version, traceId, parentId, traceFlags] = parts;

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
export function createTraceParent(traceId: string, spanId: string, traceFlags: string = '01'): string {
  return `00-${traceId}-${spanId}-${traceFlags}`;
}

/**
 * Extract trace context from request headers
 */
export function extractTraceContextFromHeaders(
  headers: Record<string, string | string[] | undefined>
): Partial<NextTraceContext> {
  const traceContext: Partial<NextTraceContext> = {};

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

  // Fallback to X-Trace-ID header
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
 */
export function clearTraceContext(): void {
  if (traceContextStorage) {
    traceContextStorage.run(undefined as any, () => {});
  } else {
    edgeContextKey = null;
  }
}
