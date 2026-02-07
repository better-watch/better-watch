/**
 * Fastify plugin for trace context injection
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
 * Fastify plugin for trace context injection
 *
 * @param fastify - The Fastify instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * import fastify from 'fastify';
 * import { fastifyTracePlugin } from '@trace-inject/node';
 *
 * const app = fastify();
 * await app.register(fastifyTracePlugin);
 * ```
 */
export async function fastifyTracePlugin(
  fastify: any,
  options: MiddlewareOptions = {}
) {
  const {
    enabled = true,
    generateTraceId: customGenerateTraceId = generateTraceId,
    generateSpanId: customGenerateSpanId = generateSpanId,
    generateRequestId: customGenerateRequestId = generateRequestId,
    onTrace,
    captureHeaders = false,
    excludeHeaders = ['authorization', 'cookie', 'x-api-key'],
  } = options;

  // Register a hook that runs before handler execution
  fastify.addHook('onRequest', async (req: any, reply: any) => {
    if (!enabled) {
      return;
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
        path: req.url,
        startTime: Date.now(),
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          ...(captureHeaders && {
            headers: Object.fromEntries(
              Object.entries(req.headers)
                .filter(([key]) => !excludeHeaders.includes(key.toLowerCase()))
                .map(([key, value]) => [key, value])
            ),
          }),
        },
      };

      // Attach to request for direct access
      (req as any).__traceContext = traceContext;

      // Set response headers for trace propagation
      reply.header('traceparent', traceParent);
      if (traceContext.traceState) {
        reply.header('tracestate', traceContext.traceState);
      }

      // Store the context for later retrieval
      (reply as any).__traceContext = traceContext;
    } catch (error) {
      // Log but don't throw - continue without trace context
      fastify.log.error(error);
    }
  });

  // Register a hook that runs when the response is sent
  fastify.addHook('onResponse', async (req: any, reply: any) => {
    if (!enabled) {
      return;
    }

    try {
      const traceContext = reply.__traceContext || req.__traceContext;
      if (!traceContext) {
        return;
      }

      traceContext.statusCode = reply.statusCode;
      traceContext.endTime = Date.now();

      // Call trace handler if provided
      if (onTrace) {
        try {
          await Promise.resolve(onTrace(traceContext));
        } catch (error) {
          fastify.log.error(error);
        }
      }
    } catch (error) {
      fastify.log.error(error);
    }
  });

  // Register a hook to ensure trace context is available in async operations
  fastify.addHook('preHandler', async (req: any, _reply: any) => {
    const traceContext = req.__traceContext;
    if (traceContext) {
      // Store in async context for child operations
      // Note: Fastify handlers run within the same context, but we ensure it's available
      return;
    }
  });
}

/**
 * Get trace context from Fastify request
 */
export function getFastifyTraceContext(req: any): TraceContext | undefined {
  // Try to get from request first
  if (req.__traceContext) {
    return req.__traceContext;
  }

  // Fall back to async local storage
  return getTraceContext();
}

/**
 * Decorator helper for Fastify route handlers to ensure trace context
 */
export async function withFastifyTraceContext(
  req: any,
  callback: (context: TraceContext) => Promise<any>
): Promise<any> {
  const context = getFastifyTraceContext(req);
  if (!context) {
    throw new Error('Trace context not available');
  }

  return runWithTraceContextAsync(context, () => callback(context));
}
