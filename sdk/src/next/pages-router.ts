/**
 * Pages Router instrumentation for Next.js
 *
 * Supports legacy Next.js Pages Router (pre-App Router)
 * Includes getServerSideProps, getStaticProps, and API Routes tracing
 */

import type { NextTraceContext, NextTraceOptions } from './types.js';
import {
  runWithTraceContextAsync,
  generateTraceId,
  generateSpanId,
  generateRequestId,
  extractTraceContextFromHeaders,
} from './context.js';

/**
 * Trace wrapper for getServerSideProps
 *
 * Usage:
 * export const getServerSideProps = traceGetServerSideProps(async (context) => {
 *   const data = await fetchData();
 *   return { props: { data } };
 * });
 */
export function traceGetServerSideProps<T extends (context: any) => Promise<any>>(
  handler: T,
  options: NextTraceOptions = {}
): T {
  return (async (context: any) => {
    const startTime = Date.now();

    // Extract trace context from request headers
    const headerRecord: Record<string, string | string[] | undefined> = {};
    if (context.req.headers) {
      for (const [key, value] of Object.entries(context.req.headers)) {
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
      method: context.req.method,
      path: context.resolvedUrl || context.req.url || '/',
      componentName: `getServerSideProps:${context.resolvedUrl}`,
      componentType: 'server',
      startTime,
      metadata: {
        ...existingContext.metadata,
        route: context.resolvedUrl,
        isPreview: context.preview ?? false,
      },
    };

    if (options.captureHeaders && context.req.headers) {
      const capturedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(context.req.headers)) {
        const lowerKey = String(key).toLowerCase();
        if (!options.excludeHeaders?.includes(lowerKey)) {
          capturedHeaders[key] = String(value);
        }
      }
      if (!traceContext.metadata) {
        traceContext.metadata = {};
      }
      (traceContext.metadata as any).headers = capturedHeaders;
    }

    return runWithTraceContextAsync(traceContext, async () => {
      try {
        const result = await handler(context);
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
 * Trace wrapper for getStaticProps
 *
 * Usage:
 * export const getStaticProps = traceGetStaticProps(async (context) => {
 *   const data = await fetchData();
 *   return { props: { data }, revalidate: 60 };
 * });
 */
export function traceGetStaticProps<T extends (context: any) => Promise<any>>(
  handler: T,
  options: NextTraceOptions = {}
): T {
  return (async (context: any) => {
    const startTime = Date.now();
    const generateTraceIdFn = options.generateTraceId || generateTraceId;
    const generateSpanIdFn = options.generateSpanId || generateSpanId;
    const generateRequestIdFn = options.generateRequestId || generateRequestId;

    const traceContext: NextTraceContext = {
      traceId: generateTraceIdFn(),
      spanId: generateSpanIdFn(),
      requestId: generateRequestIdFn(),
      method: 'GET',
      path: context.params?.slug ? `/${context.params.slug}` : '/',
      componentName: `getStaticProps:${context.params?.slug || 'index'}`,
      componentType: 'server',
      startTime,
      metadata: {
        params: context.params,
        isFallback: context.isFallback ?? false,
      },
    };

    return runWithTraceContextAsync(traceContext, async () => {
      try {
        const result = await handler(context);
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
 * Trace wrapper for getStaticPaths
 *
 * Usage:
 * export const getStaticPaths = traceGetStaticPaths(async () => {
 *   const paths = await getPaths();
 *   return { paths, fallback: true };
 * });
 */
export function traceGetStaticPaths<T extends () => Promise<any>>(
  handler: T,
  options: NextTraceOptions = {}
): T {
  return (async () => {
    const startTime = Date.now();
    const generateTraceIdFn = options.generateTraceId || generateTraceId;
    const generateSpanIdFn = options.generateSpanId || generateSpanId;
    const generateRequestIdFn = options.generateRequestId || generateRequestId;

    const traceContext: NextTraceContext = {
      traceId: generateTraceIdFn(),
      spanId: generateSpanIdFn(),
      requestId: generateRequestIdFn(),
      method: 'GET',
      path: '/[dynamic]',
      componentName: 'getStaticPaths',
      componentType: 'server',
      startTime,
    };

    return runWithTraceContextAsync(traceContext, async () => {
      try {
        const result = await handler();
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
 * Trace wrapper for Pages Router API handlers
 *
 * Usage:
 * export default tracePageApiRoute(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * });
 */
export function tracePageApiRoute<T extends (req: any, res: any) => Promise<void> | void>(
  handler: T,
  options: NextTraceOptions = {}
): T {
  return (async (req: any, res: any) => {
    const startTime = Date.now();

    // Extract trace context from request headers
    const headerRecord: Record<string, string | string[] | undefined> = {};
    if (req.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
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
      method: req.method,
      path: req.url || '/',
      apiRoute: req.url || '/',
      componentType: 'server',
      startTime,
      metadata: {
        ...existingContext.metadata,
        query: req.query,
      },
    };

    if (options.captureHeaders && req.headers) {
      const capturedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = String(key).toLowerCase();
        if (!options.excludeHeaders?.includes(lowerKey)) {
          capturedHeaders[key] = String(value);
        }
      }
      if (!traceContext.metadata) {
        traceContext.metadata = {};
      }
      (traceContext.metadata as any).headers = capturedHeaders;
    }

    // Wrap response to capture status code
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    res.json = function (data: any) {
      traceContext.statusCode = res.statusCode;
      return originalJson(data);
    };

    res.status = function (status: number) {
      traceContext.statusCode = status;
      return originalStatus(status);
    };

    return runWithTraceContextAsync(traceContext, async () => {
      try {
        await handler(req, res);
        traceContext.endTime = Date.now();

        if (options.onTrace) {
          await options.onTrace(traceContext);
        }
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
