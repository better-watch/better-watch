/**
 * Express middleware for trace context injection
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
 * Express middleware for trace context
 *
 * @param options - Configuration options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { traceMiddleware } from '@trace-inject/node';
 *
 * const app = express();
 * app.use(traceMiddleware());
 * ```
 */
export function traceMiddleware(options: MiddlewareOptions = {}) {
  const {
    enabled = true,
    generateTraceId: customGenerateTraceId = generateTraceId,
    generateSpanId: customGenerateSpanId = generateSpanId,
    generateRequestId: customGenerateRequestId = generateRequestId,
    onTrace,
    captureHeaders = false,
    excludeHeaders = ['authorization', 'cookie', 'x-api-key'],
  } = options;

  // Return middleware - uses any to avoid importing Express as a hard dependency
  return async (req: any, res: any, next: any) => {
    if (!enabled) {
      return next();
    }

    try {
      // Extract trace context from incoming headers
      const incomingContext = extractTraceContextFromHeaders(
        req.headers as Record<string, string | string[] | undefined>
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
        method: req.method,
        path: req.path || req.url,
        startTime: Date.now(),
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          ...(captureHeaders && {
            headers: Object.fromEntries(
              Object.entries(req.headers)
                .filter(([key]) => !excludeHeaders.includes(key.toLowerCase()))
                .map(([key, value]) => [key, value])
            ),
          }),
        },
      };

      // Attach to request for direct access if needed
      (req as any).__traceContext = traceContext;

      // Set response headers for trace propagation
      res.set('traceparent', traceParent);
      if (traceContext.traceState) {
        res.set('tracestate', traceContext.traceState);
      }

      // Capture response details when response is finished
      res.on('finish', () => {
        traceContext.statusCode = res.statusCode;
        traceContext.endTime = Date.now();

        // Call trace handler if provided
        if (onTrace) {
          try {
            Promise.resolve(onTrace(traceContext)).catch(() => {
              // Silently ignore errors in trace handler
            });
          } catch {
            // Ignore
          }
        }
      });

      // Run the rest of the middleware with trace context
      runWithTraceContextAsync(traceContext, () => {
        return new Promise<void>((resolve, reject) => {
          next((error?: any) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }).catch(next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Get trace context from Express request
 * Can be called within route handlers and async operations
 */
export function getExpressTraceContext(req?: any): TraceContext | undefined {
  // If request is provided, try to get from it
  if (req && req.__traceContext) {
    return req.__traceContext;
  }

  // Otherwise use async local storage
  return getTraceContext();
}

/**
 * Middleware to attach trace context to Express request object
 * This allows easy access via req.__traceContext or getExpressTraceContext(req)
 */
export function attachTraceContextMiddleware(req: any, _res: any, next: any) {
  req.__traceContext = getTraceContext();
  next();
}

/**
 * Decorator for Express route handlers to ensure trace context
 * Usage: router.get('/path', ensureTraceContext, myHandler)
 */
export function ensureTraceContext(req: any, _res: any, next: any) {
  const context = getExpressTraceContext(req);
  if (!context) {
    return next(new Error('Trace context not available'));
  }
  next();
}

/**
 * Initialize Express tracing on an application
 */
export function initializeExpressTracing(app: any, options: MiddlewareOptions = {}) {
  app.use(traceMiddleware(options));
}
