/**
 * Remix middleware for trace context injection
 *
 * Automatically creates trace context for each request and
 * propagates it through loaders, actions, and route handlers
 * using AsyncLocalStorage
 */

import type { RemixTraceContext, RemixTraceOptions } from './types.js';
import {
  getTraceContext,
  runWithTraceContextAsync,
  generateTraceId,
  generateSpanId,
  generateRequestId,
  extractTraceContextFromHeaders,
  createTraceParent,
} from '../node/context.js';

/**
 * Remix middleware for trace context
 *
 * @param options - Configuration options
 * @returns Remix middleware function compatible with Express
 *
 * @example
 * ```typescript
 * import { remixTraceMiddleware } from '@trace-inject/remix';
 * import { createRequestHandler } from '@remix-run/express';
 *
 * app.use(remixTraceMiddleware());
 * app.all('*', createRequestHandler({ build }));
 * ```
 */
export function remixTraceMiddleware(options: RemixTraceOptions = {}) {
  const {
    enabled = true,
    generateTraceId: customGenerateTraceId = generateTraceId,
    generateSpanId: customGenerateSpanId = generateSpanId,
    generateRequestId: customGenerateRequestId = generateRequestId,
    onTrace,
    captureHeaders = false,
    excludeHeaders = ['authorization', 'cookie', 'x-api-key'],
  } = options;

  // Return Express-compatible middleware
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

      const traceContext: RemixTraceContext = {
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
          isRemix: true,
        },
      };

      // Detect if this is a client navigation (Remix client-side route transition)
      const xRemixRequest = req.headers['x-remix-request'];
      if (xRemixRequest) {
        traceContext.isClientNavigation = true;
        traceContext.metadata = {
          ...traceContext.metadata,
          remixRequest: xRemixRequest,
        };
      }

      // Detect action request (POST, PUT, PATCH, DELETE)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        traceContext.action = req.method as any;
      }

      // Attach to request for access in loaders/actions
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
 * Get trace context from Remix request
 * Can be called within loaders, actions, and route components
 */
export function getRemixTraceContext(req?: any): RemixTraceContext | undefined {
  // If request is provided, try to get from it
  if (req && req.__traceContext) {
    return req.__traceContext;
  }

  // Otherwise use async local storage
  return getTraceContext() as RemixTraceContext | undefined;
}

/**
 * Helper to run code with Remix trace context
 */
export async function withRemixTraceContext<T>(
  req: any,
  callback: (context: RemixTraceContext) => Promise<T>
): Promise<T> {
  const context = getRemixTraceContext(req);
  if (!context) {
    throw new Error('Trace context not available');
  }

  return runWithTraceContextAsync(context, () => callback(context));
}

/**
 * Wrap a Remix loader function with trace instrumentation
 *
 * @param loaderFn - The original loader function
 * @param options - Trace options
 * @returns Wrapped loader function with trace context
 *
 * @example
 * ```typescript
 * export const loader = traceLoader(async ({ params, request }) => {
 *   const context = getRemixTraceContext(request);
 *   console.log('Loading:', context?.routeId);
 *   return { data: 'value' };
 * }, { onLoaderTrace: console.log });
 * ```
 */
export function traceLoader<T extends Record<string, any> = any>(
  loaderFn: (args: T) => Promise<any> | any,
  options: RemixTraceOptions = {}
) {
  const { onLoaderTrace, captureLoaderTime = true } = options;

  return async (args: T) => {
    const request = args.request as any;
    const context = getRemixTraceContext(request);

    if (!context) {
      return loaderFn(args);
    }

    const loaderStartTime = Date.now();

    try {
      return await runWithTraceContextAsync(context, async () => {
        const result = await loaderFn(args);

        if (captureLoaderTime) {
          context.loaderTime = Date.now() - loaderStartTime;
        }

        // Extract route ID from request if available
        if (request.__remixMatches) {
          const match = request.__remixMatches[request.__remixMatches.length - 1];
          if (match) {
            context.routeId = match.route.id;
          }
        }

        if (onLoaderTrace) {
          try {
            await Promise.resolve(onLoaderTrace(context));
          } catch {
            // Silently ignore errors
          }
        }

        return result;
      });
    } catch (error) {
      if (captureLoaderTime) {
        context.loaderTime = Date.now() - loaderStartTime;
      }
      throw error;
    }
  };
}

/**
 * Wrap a Remix action function with trace instrumentation
 *
 * @param actionFn - The original action function
 * @param options - Trace options
 * @returns Wrapped action function with trace context
 *
 * @example
 * ```typescript
 * export const action = traceAction(async ({ request, params }) => {
 *   const context = getRemixTraceContext(request);
 *   console.log('Action:', context?.action);
 *   return { success: true };
 * }, { onActionTrace: console.log });
 * ```
 */
export function traceAction<T extends Record<string, any> = any>(
  actionFn: (args: T) => Promise<any> | any,
  options: RemixTraceOptions = {}
) {
  const { onActionTrace, captureActionTime = true, captureActionBody = false } = options;

  return async (args: T) => {
    const request = args.request as any;
    const context = getRemixTraceContext(request);

    if (!context) {
      return actionFn(args);
    }

    const actionStartTime = Date.now();

    try {
      // Capture action body if requested
      if (captureActionBody && request.method !== 'GET') {
        try {
          const clonedRequest = request.clone();
          const body = await clonedRequest.text();
          context.metadata = {
            ...context.metadata,
            actionBody: body.length > 1000 ? `${body.slice(0, 1000)}...` : body,
          };
        } catch {
          // Ignore if body cannot be read
        }
      }

      return await runWithTraceContextAsync(context, async () => {
        const result = await actionFn(args);

        if (captureActionTime) {
          context.actionTime = Date.now() - actionStartTime;
        }

        // Extract route ID from request if available
        if (request.__remixMatches) {
          const match = request.__remixMatches[request.__remixMatches.length - 1];
          if (match) {
            context.routeId = match.route.id;
          }
        }

        if (onActionTrace) {
          try {
            await Promise.resolve(onActionTrace(context));
          } catch {
            // Silently ignore errors
          }
        }

        return result;
      });
    } catch (error) {
      if (captureActionTime) {
        context.actionTime = Date.now() - actionStartTime;
      }
      throw error;
    }
  };
}

/**
 * Create a streaming response helper for Remix
 * Handles trace context propagation for streaming responses
 *
 * @param response - The Response object to stream
 * @param context - The trace context
 * @returns The modified response with trace headers
 *
 * @example
 * ```typescript
 * export const loader = traceLoader(async ({ request }) => {
 *   const context = getRemixTraceContext(request);
 *   const response = new Response(readableStream);
 *   return createStreamingResponse(response, context);
 * });
 * ```
 */
export function createStreamingResponse(response: Response, context: RemixTraceContext): Response {
  // Add trace context headers to streaming response
  response.headers.set('traceparent', context.traceParent || '');
  if (context.traceState) {
    response.headers.set('tracestate', context.traceState);
  }

  // Add custom headers for trace metadata
  response.headers.set('x-trace-id', context.traceId);
  response.headers.set('x-request-id', context.requestId);

  return response;
}

/**
 * Initialize Remix tracing on an Express application
 * This should be called before the Remix request handler
 */
export function initializeRemixTracing(app: any, options: RemixTraceOptions = {}) {
  app.use(remixTraceMiddleware(options));
}
