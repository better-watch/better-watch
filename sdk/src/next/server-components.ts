/**
 * Server Components instrumentation for Next.js
 *
 * Provides utilities to trace Server Components and Server-Only functions
 * in Next.js 13+ App Router
 */

import type { NextTraceOptions, ServerComponentContext } from './types.js';
import { getTraceContext, runWithTraceContextAsync, generateSpanId } from './context.js';

/**
 * Trace wrapper for Server Components
 *
 * Usage:
 * export default traceServerComponent('MyComponent', async (props) => {
 *   const data = await fetchData();
 *   return <div>{data}</div>;
 * });
 */
export function traceServerComponent<T extends (props: any) => Promise<any> | any>(
  componentName: string,
  component: T,
  options: NextTraceOptions = {}
): T {
  return (async (props: any) => {
    const startTime = Date.now();

    // Get or create trace context
    const parentContext = getTraceContext();

    if (!parentContext) {
      throw new Error('Trace context not initialized. Ensure middleware is properly configured.');
    }

    const serverComponentContext: ServerComponentContext = {
      ...parentContext,
      spanId: generateSpanId(),
      parentSpanId: parentContext.spanId,
      componentType: 'server',
      componentName,
      path: `${parentContext.path}#${componentName}`,
      startTime,
      metadata: {
        ...parentContext.metadata,
        componentProps: options.captureBody ? props : undefined,
      },
    };

    return runWithTraceContextAsync(serverComponentContext, async () => {
      try {
        const result = await component(props);
        serverComponentContext.endTime = Date.now();

        if (options.onTrace) {
          await options.onTrace(serverComponentContext);
        }

        return result;
      } catch (error) {
        serverComponentContext.endTime = Date.now();
        serverComponentContext.error = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };

        if (options.onTrace) {
          await options.onTrace(serverComponentContext);
        }

        throw error;
      }
    });
  }) as T;
}

/**
 * Trace wrapper for server-only functions
 *
 * Usage:
 * export const getUser = traceServerFunction('getUser', async (id) => {
 *   return db.query(`SELECT * FROM users WHERE id = ?`, [id]);
 * });
 */
export function traceServerFunction<T extends (...args: any[]) => Promise<any> | any>(
  functionName: string,
  fn: T,
  options: NextTraceOptions = {}
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();

    // Get or create trace context
    const parentContext = getTraceContext();

    if (!parentContext) {
      throw new Error(`Trace context not available for server function: ${functionName}`);
    }

    const functionContext: ServerComponentContext = {
      ...parentContext,
      spanId: generateSpanId(),
      parentSpanId: parentContext.spanId,
      componentType: 'server',
      componentName: functionName,
      path: `${parentContext.path}#${functionName}`,
      startTime,
      metadata: {
        ...parentContext.metadata,
        functionArgs: options.captureBody ? args : undefined,
      },
    };

    return runWithTraceContextAsync(functionContext, async () => {
      try {
        const result = await fn(...args);
        functionContext.endTime = Date.now();

        if (options.onTrace) {
          await options.onTrace(functionContext);
        }

        return result;
      } catch (error) {
        functionContext.endTime = Date.now();
        functionContext.error = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };

        if (options.onTrace) {
          await options.onTrace(functionContext);
        }

        throw error;
      }
    });
  }) as T;
}

/**
 * Trace a data fetch in a Server Component
 *
 * Usage:
 * const data = await traceDataFetch('getUserData', fetch(url, { cache: 'revalidate' }));
 */
export async function traceDataFetch<T>(
  fetchName: string,
  fetchPromise: Promise<T>,
  options: NextTraceOptions = {}
): Promise<T> {
  const startTime = Date.now();
  const parentContext = getTraceContext();

  if (!parentContext) {
    // If no context, just return the promise
    return fetchPromise;
  }

  const fetchContext: ServerComponentContext = {
    ...parentContext,
    spanId: generateSpanId(),
    parentSpanId: parentContext.spanId,
    componentType: 'server',
    componentName: `fetch:${fetchName}`,
    path: `${parentContext.path}#fetch:${fetchName}`,
    startTime,
  };

  return runWithTraceContextAsync(fetchContext, async () => {
    try {
      const result = await fetchPromise;
      fetchContext.endTime = Date.now();

      if (options.onTrace) {
        await options.onTrace(fetchContext);
      }

      return result;
    } catch (error) {
      fetchContext.endTime = Date.now();
      fetchContext.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };

      if (options.onTrace) {
        await options.onTrace(fetchContext);
      }

      throw error;
    }
  });
}

/**
 * Get current Server Component trace context
 */
export function getServerComponentTraceContext(): ServerComponentContext | undefined {
  const context = getTraceContext();
  if (context && context.componentType === 'server') {
    return context as ServerComponentContext;
  }
  return undefined;
}

/**
 * Check if we're in a Server Component context
 */
export function isInServerComponent(): boolean {
  const context = getTraceContext();
  return context ? context.componentType === 'server' : false;
}

/**
 * Get the current request trace ID (useful for logging)
 */
export function getRequestTraceId(): string {
  const context = getTraceContext();
  return context ? context.traceId : 'unknown';
}

/**
 * Get the current request ID (useful for logging)
 */
export function getRequestId(): string {
  const context = getTraceContext();
  return context ? context.requestId : 'unknown';
}
