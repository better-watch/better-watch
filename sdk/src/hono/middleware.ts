/**
 * Hono middleware for trace context injection
 *
 * Supports multiple runtimes:
 * - Node.js (with AsyncLocalStorage fallback)
 * - Cloudflare Workers
 * - Deno Deploy
 * - Bun
 *
 * Automatically creates trace context for each request and propagates it
 */

import type { HonoTraceOptions, TraceContext } from './types.js';
import {
  getTraceContext,
  setTraceContext,
  generateTraceId,
  generateSpanId,
  generateRequestId,
  extractTraceContextFromHeaders,
  createTraceParent,
  clearTraceContext,
} from './context.js';

/**
 * Detect runtime environment
 */
function detectRuntime(): 'node' | 'cloudflare' | 'deno' | 'bun' {
  // Check for Cloudflare Workers
  if (typeof global !== 'undefined' && (global as any).crypto?.subtle) {
    // Cloudflare Workers have crypto.subtle
    if (typeof (global as any).Request !== 'undefined' && (global as any).Request.prototype.clone) {
      return 'cloudflare';
    }
  }

  // Check for Deno
  if (typeof (global as any).Deno !== 'undefined') {
    return 'deno';
  }

  // Check for Bun
  if (typeof (global as any).Bun !== 'undefined') {
    return 'bun';
  }

  // Default to Node.js
  return 'node';
}

/**
 * Create Hono middleware for trace context
 *
 * @param options - Configuration options
 * @returns Hono middleware function
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { traceMiddleware } from '@trace-inject/hono';
 *
 * const app = new Hono();
 * app.use(traceMiddleware());
 * ```
 */
export function traceMiddleware(options: HonoTraceOptions = {}) {
  const {
    enabled = true,
    generateTraceId: customGenerateTraceId = generateTraceId,
    generateSpanId: customGenerateSpanId = generateSpanId,
    generateRequestId: customGenerateRequestId = generateRequestId,
    onTrace,
    captureHeaders = false,
    excludeHeaders = ['authorization', 'cookie', 'x-api-key'],
  } = options;

  const runtime = detectRuntime();

  // Return middleware - using any to avoid Hono hard dependency
  return async (c: any, next: any) => {
    if (!enabled) {
      return next();
    }

    // Get request from Hono context
    const request = c.req?.raw || c.request;
    const headers = c.req?.header ? buildHeadersFromHono(c) : request?.headers;

    if (!headers) {
      return next();
    }

    // Extract trace context from incoming headers
    const incomingContext = extractTraceContextFromHeaders(headers);

    // Create trace context for this request
    const traceId = incomingContext.traceId || customGenerateTraceId();
    const spanId = customGenerateSpanId();
    const parentSpanId = incomingContext.parentSpanId;
    const traceParent = incomingContext.traceParent || createTraceParent(traceId, spanId);

    // Extract request details based on Hono API
    const method = c.req?.method || request?.method || 'UNKNOWN';
    const path = c.req?.path || request?.url?.split('?')[0] || '/';
    let ip = c.req?.header('x-forwarded-for') || c.req?.header('cf-connecting-ip');
    if (!ip && runtime === 'node' && request?.socket?.remoteAddress) {
      ip = request.socket.remoteAddress;
    }

    const traceContext: TraceContext = {
      traceId,
      spanId,
      parentSpanId,
      traceParent,
      traceState: incomingContext.traceState,
      requestId: customGenerateRequestId(),
      method,
      path,
      startTime: Date.now(),
      metadata: {
        runtime,
        ip,
        userAgent: c.req?.header('user-agent'),
        ...(captureHeaders && {
          headers: captureHeadersSafely(headers, excludeHeaders),
        }),
      },
    };

    // Store trace context in Hono context
    c.set('traceContext', traceContext);
    if (request) {
      setTraceContext(traceContext, request);
    }

    // Set response headers for trace propagation
    c.header('traceparent', traceParent);
    if (traceContext.traceState) {
      c.header('tracestate', traceContext.traceState);
    }

    // Execute next middleware/handler
    const response = await next();

    // Capture response details
    traceContext.statusCode = response?.status || 200;
    traceContext.endTime = Date.now();

    // Call trace handler if provided
    if (onTrace) {
      try {
        await Promise.resolve(onTrace(traceContext));
      } catch {
        // Silently ignore errors in trace handler
      }
    }

    // Cleanup
    if (request) {
      clearTraceContext(request);
    }

    return response;
  };
}

/**
 * Get trace context from Hono context
 */
export function getHonoTraceContext(c?: any): TraceContext | undefined {
  // If Hono context is provided, try to get from it
  if (c && c.get) {
    return c.get('traceContext');
  }

  // Otherwise use fallback
  return getTraceContext();
}

/**
 * Hono middleware to ensure trace context is available
 */
export function ensureTraceContext(c: any, next: any) {
  const context = getHonoTraceContext(c);
  if (!context) {
    return c.text('Trace context not available', 500);
  }
  return next();
}

/**
 * Helper to build headers object from Hono context
 */
function buildHeadersFromHono(c: any): Record<string, string | string[]> {
  const headers: Record<string, string | string[]> = {};

  // For Hono, iterate through available headers
  try {
    const raw = c.req?.raw;
    if (raw?.headers instanceof Headers || raw?.headers) {
      // Web API Headers
      for (const [key, value] of raw.headers) {
        headers[key] = value;
      }
    } else if (c.req?.header) {
      // Hono's header method is sparse, so we can't get all headers easily
      // Try to get common ones
      const commonHeaders = [
        'content-type',
        'content-length',
        'traceparent',
        'tracestate',
        'x-trace-id',
        'x-forwarded-for',
        'cf-connecting-ip',
        'user-agent',
        'authorization',
        'cookie',
        'x-api-key',
      ];

      for (const key of commonHeaders) {
        const value = c.req.header(key);
        if (value) {
          headers[key] = value;
        }
      }
    }
  } catch {
    // Ignore errors when building headers
  }

  return headers;
}

/**
 * Safely capture headers, excluding sensitive ones
 */
function captureHeadersSafely(
  headers: Record<string, string | string[] | undefined> | Headers,
  excludeHeaders: string[]
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const excludeLower = excludeHeaders.map(h => h.toLowerCase());

  try {
    if (headers instanceof Map || (typeof (headers as any).get === 'function')) {
      // Headers object (web API)
      const headersObj = headers as any;
      const entries = headersObj.entries?.();
      if (entries) {
        for (const [key, value] of entries) {
          if (!excludeLower.includes(key.toLowerCase())) {
            result[key] = value;
          }
        }
      }
    } else {
      // Object headers
      for (const [key, value] of Object.entries(headers)) {
        if (!excludeLower.includes(key.toLowerCase()) && value !== undefined) {
          result[key] = value;
        }
      }
    }
  } catch {
    // Ignore errors when capturing headers
  }

  return result;
}

/**
 * Initialize Hono tracing on an application
 */
export function initializeHonoTracing(app: any, options: HonoTraceOptions = {}) {
  app.use(traceMiddleware(options));
}
