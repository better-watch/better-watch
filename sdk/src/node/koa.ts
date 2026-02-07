/**
 * Koa middleware for trace context injection
 *
 * Automatically creates trace context for each request and
 * propagates it through async operations via AsyncLocalStorage
 */

import type { TraceContext, MiddlewareOptions } from './types.js';
import {
  getTraceContext,
  runWithTraceContextAsync,
  generateTraceId,
  generateSpanId,
  generateRequestId,
  extractTraceContextFromHeaders,
  createTraceParent,
} from './context.js';

/**
 * Koa middleware for trace context
 *
 * @param options - Configuration options
 * @returns Koa middleware function
 *
 * @example
 * ```typescript
 * import Koa from 'koa';
 * import { koaTraceMiddleware } from '@trace-inject/node';
 *
 * const app = new Koa();
 * app.use(koaTraceMiddleware());
 * ```
 */
export function koaTraceMiddleware(options: MiddlewareOptions = {}): any {
  const {
    enabled = true,
    generateTraceId: customGenerateTraceId = generateTraceId,
    generateSpanId: customGenerateSpanId = generateSpanId,
    generateRequestId: customGenerateRequestId = generateRequestId,
    onTrace,
    captureHeaders = false,
    excludeHeaders = ['authorization', 'cookie', 'x-api-key'],
  } = options;

  return async (ctx: any, next: any) => {
    if (!enabled) {
      return next();
    }

    // Extract trace context from incoming headers
    const incomingContext = extractTraceContextFromHeaders(
      ctx.headers as Record<string, string | string[] | undefined>
    );

    // Create trace context for this request
    const traceId = incomingContext.traceId || customGenerateTraceId();
    const spanId = customGenerateSpanId();
    const parentSpanId = incomingContext.parentSpanId;
    const traceParent = incomingContext.traceParent || createTraceParent(traceId, spanId);

    const traceContext: TraceContext = {
      traceId,
      spanId,
      parentSpanId,
      traceParent,
      traceState: incomingContext.traceState,
      requestId: customGenerateRequestId(),
      method: ctx.method,
      path: ctx.path,
      startTime: Date.now(),
      metadata: {
        ip: ctx.ip,
        userAgent: ctx.get('user-agent'),
        ...(captureHeaders && {
          headers: Object.fromEntries(
            Object.entries(ctx.headers)
              .filter(([key]) => !excludeHeaders.includes(key.toLowerCase()))
              .map(([key, value]) => [key, value])
          ),
        }),
      },
    };

    // Attach to context for direct access
    ctx.traceContext = traceContext;

    // Set response headers for trace propagation
    ctx.set('traceparent', traceParent);
    if (traceContext.traceState) {
      ctx.set('tracestate', traceContext.traceState);
    }

    // Run the rest of the middleware with trace context
    await runWithTraceContextAsync(traceContext, () => next());

    // Update trace context with response details
    traceContext.statusCode = ctx.status;
    traceContext.endTime = Date.now();

    // Call trace handler if provided
    if (onTrace) {
      try {
        await Promise.resolve(onTrace(traceContext));
      } catch (error) {
        // Silently ignore errors in trace handler
      }
    }
  };
}

/**
 * Get trace context from Koa context
 */
export function getKoaTraceContext(ctx: any): TraceContext | undefined {
  // Try to get from context first
  if (ctx.traceContext) {
    return ctx.traceContext;
  }

  // Fall back to async local storage
  return getTraceContext();
}

/**
 * Helper to run code with Koa trace context
 */
export async function withKoaTraceContext(
  ctx: any,
  callback: (context: TraceContext) => Promise<any>
): Promise<any> {
  const context = getKoaTraceContext(ctx);
  if (!context) {
    throw new Error('Trace context not available');
  }

  return runWithTraceContextAsync(context, () => callback(context));
}
