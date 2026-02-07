/**
 * Next.js middleware for trace context injection
 *
 * Supports both App Router (middleware.ts) and pages/_middleware.ts
 * Works with edge runtime and Node.js runtime
 */

// Types for NextRequest and NextResponse
// Note: next is a peer dependency, so we use any to avoid hard dependency
type NextRequest = any;
type NextResponse = any;
import type { NextTraceContext, NextTraceOptions } from './types.js';
import {
  getTraceContext,
  setTraceContext,
  runWithTraceContextAsync,
  generateTraceId,
  generateSpanId,
  generateRequestId,
  extractTraceContextFromHeaders,
} from './context.js';

/**
 * Get trace context for a Next.js request
 */
export function getNextTraceContext(): NextTraceContext | undefined {
  return getTraceContext();
}

/**
 * Create trace middleware for Next.js
 * Use in middleware.ts (App Router) or pages/_middleware.ts (Pages Router)
 */
export function createNextTraceMiddleware(options: NextTraceOptions = {}) {
  const {
    enabled = true,
    generateTraceId: customGenerateTraceId,
    generateSpanId: customGenerateSpanId,
    generateRequestId: customGenerateRequestId,
    onTrace,
    captureHeaders = false,
    excludeHeaders = [],
  } = options;

  const traceIdGenerator = customGenerateTraceId || generateTraceId;
  const spanIdGenerator = customGenerateSpanId || generateSpanId;
  const requestIdGenerator = customGenerateRequestId || generateRequestId;

  return async (request: NextRequest) => {
    if (!enabled) {
      return undefined;
    }

    const startTime = Date.now();

    // Extract existing trace context from headers
    const headerRecord = Object.fromEntries(request.headers.entries());
    const existingContext = extractTraceContextFromHeaders(headerRecord);

    // Create trace context
    const traceContext: NextTraceContext = {
      traceId: existingContext.traceId || traceIdGenerator(),
      spanId: spanIdGenerator(),
      parentSpanId: existingContext.parentSpanId,
      traceParent: existingContext.traceParent,
      traceState: existingContext.traceState,
      requestId: requestIdGenerator(),
      method: request.method,
      path: request.nextUrl.pathname,
      startTime,
    };

    // Capture headers if enabled
    if (captureHeaders) {
      const capturedHeaders: Record<string, string> = {};
      for (const [key, value] of request.headers.entries()) {
        const lowerKey = key.toLowerCase();
        if (!excludeHeaders.includes(lowerKey)) {
          capturedHeaders[key] = value;
        }
      }
      traceContext.metadata = { headers: capturedHeaders };
    }

    // Run handler with trace context
    return runWithTraceContextAsync(traceContext, async () => {
      // Call onTrace callback if provided
      if (onTrace) {
        await onTrace(traceContext);
      }

      return undefined;
    });
  };
}

/**
 * Trace wrapper for Next.js API route handlers
 */
export function traceApiRoute<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  options: NextTraceOptions = {}
): T {
  return (async (...args: any[]) => {
    const request = args[0];
    const startTime = Date.now();

    // Extract trace context from request headers
    const headerRecord: Record<string, string | string[] | undefined> = {};
    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        headerRecord[key] = value as string | string[] | undefined;
      }
    }

    const existingContext = extractTraceContextFromHeaders(headerRecord);
    const generateTraceIdFn = options.generateTraceId || generateTraceId;
    const generateSpanIdFn = options.generateSpanId || generateSpanId;
    const generateRequestIdFn = options.generateRequestId || generateRequestId;

    const traceContext: NextTraceContext = {
      traceId: existingContext.traceId || generateTraceIdFn(),
      spanId: generateSpanIdFn(),
      parentSpanId: existingContext.parentSpanId,
      traceParent: existingContext.traceParent,
      traceState: existingContext.traceState,
      requestId: generateRequestIdFn(),
      method: request.method,
      path: request.url || request.nextUrl?.pathname || '/',
      apiRoute: request.url || request.nextUrl?.pathname || '/',
      startTime,
      componentType: 'server',
    };

    if (options.captureHeaders && request.headers) {
      const capturedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        const lowerKey = String(key).toLowerCase();
        if (!options.excludeHeaders?.includes(lowerKey)) {
          capturedHeaders[key] = String(value);
        }
      }
      traceContext.metadata = { headers: capturedHeaders };
    }

    return runWithTraceContextAsync(traceContext, async () => {
      try {
        const result = await handler(...args);

        // Capture status code if it's a Response
        if (result instanceof Response) {
          traceContext.statusCode = result.status;
        } else if (result && typeof result === 'object' && 'status' in result) {
          traceContext.statusCode = (result as any).status;
        }

        traceContext.endTime = Date.now();

        if (options.onTrace) {
          await options.onTrace(traceContext);
        }

        return result;
      } catch (error) {
        traceContext.endTime = Date.now();
        traceContext.error = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };

        if (options.onTrace) {
          await options.onTrace(traceContext);
        }

        throw error;
      }
    });
  }) as T;
}

/**
 * Trace wrapper for Server Actions
 */
export function traceServerAction<T extends (...args: any[]) => Promise<any>>(
  actionName: string,
  action: T,
  options: NextTraceOptions = {}
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const generateTraceIdFn = options.generateTraceId || generateTraceId;
    const generateSpanIdFn = options.generateSpanId || generateSpanId;
    const generateRequestIdFn = options.generateRequestId || generateRequestId;

    // Try to extract trace context from request headers if available
    let existingContext: Partial<NextTraceContext> = {};
    const currentContext = getTraceContext();
    if (currentContext) {
      existingContext = {
        traceId: currentContext.traceId,
        parentSpanId: currentContext.spanId,
        traceParent: currentContext.traceParent,
        traceState: currentContext.traceState,
      };
    }

    const traceContext: NextTraceContext = {
      traceId: existingContext.traceId || generateTraceIdFn(),
      spanId: generateSpanIdFn(),
      parentSpanId: existingContext.parentSpanId,
      traceParent: existingContext.traceParent,
      traceState: existingContext.traceState,
      requestId: generateRequestIdFn(),
      method: 'POST',
      path: `/action/${actionName}`,
      actionName,
      componentType: 'action',
      startTime,
      metadata: {
        args: options.captureBody ? args : undefined,
      },
    };

    return runWithTraceContextAsync(traceContext, async () => {
      try {
        const result = await action(...args);
        traceContext.endTime = Date.now();

        if (options.onTrace) {
          await options.onTrace(traceContext);
        }

        return result;
      } catch (error) {
        traceContext.endTime = Date.now();
        traceContext.error = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };

        if (options.onTrace) {
          await options.onTrace(traceContext);
        }

        throw error;
      }
    });
  }) as T;
}

/**
 * Initialize Next.js tracing for App Router
 * Call this in your middleware.ts file
 */
export async function initializeNextTracing(
  request: NextRequest,
  options: NextTraceOptions = {}
): Promise<{ response: NextResponse | undefined; context: NextTraceContext | undefined }> {
  const middleware = createNextTraceMiddleware(options);
  const response = await middleware(request);

  return {
    response: response as NextResponse | undefined,
    context: getTraceContext(),
  };
}

/**
 * Helper to ensure trace context exists
 */
export function ensureTraceContext(options: NextTraceOptions = {}): NextTraceContext {
  let context = getTraceContext();

  if (!context) {
    const generateTraceIdFn = options.generateTraceId || generateTraceId;
    const generateSpanIdFn = options.generateSpanId || generateSpanId;
    const generateRequestIdFn = options.generateRequestId || generateRequestId;

    context = {
      traceId: generateTraceIdFn(),
      spanId: generateSpanIdFn(),
      requestId: generateRequestIdFn(),
      method: 'UNKNOWN',
      path: '/',
      startTime: Date.now(),
    };

    setTraceContext(context);
  }

  return context;
}
