/**
 * Client Components instrumentation for Next.js
 *
 * Provides utilities to trace Client Components and client-side operations
 * in Next.js 13+ App Router
 */

import type { NextTraceOptions, ClientComponentContext } from './types.js';

/**
 * Client-side trace context (stored in memory, browser-based)
 */
interface ClientTraceStorage {
  traceId: string;
  spanId: string;
  requestId: string;
  startTime: number;
}

let clientTrace: ClientTraceStorage | null = null;

/**
 * Initialize client-side trace context from server
 * Call this in your root Client Component or layout
 *
 * Usage:
 * 'use client';
 * import { initializeClientTrace } from '@trace-inject/next';
 * export default function RootLayout() {
 *   useEffect(() => {
 *     initializeClientTrace();
 *   }, []);
 *   // ...
 * }
 */
export function initializeClientTrace(traceId?: string, spanId?: string, requestId?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  clientTrace = {
    traceId: traceId || generateClientTraceId(),
    spanId: spanId || generateClientSpanId(),
    requestId: requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
  };
}

/**
 * Get current client trace context
 */
export function getClientTraceContext(): ClientTraceStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!clientTrace) {
    clientTrace = {
      traceId: generateClientTraceId(),
      spanId: generateClientSpanId(),
      requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
    };
  }

  return clientTrace;
}

/**
 * Generate a client trace ID
 */
export function generateClientTraceId(): string {
  return Array.from({ length: 16 })
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a client span ID
 */
export function generateClientSpanId(): string {
  return Array.from({ length: 8 })
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Trace a client component render
 *
 * Usage:
 * 'use client';
 * export function MyComponent() {
 *   useEffect(() => {
 *     traceComponentRender('MyComponent');
 *   }, []);
 *   // ...
 * }
 */
export function traceComponentRender(
  componentName: string,
  metadata?: Record<string, unknown>
): ClientComponentContext {
  const context = getClientTraceContext();
  if (!context) {
    throw new Error('Client trace context not initialized');
  }

  const spanId = generateClientSpanId();

  const componentContext: ClientComponentContext = {
    traceId: context.traceId,
    spanId,
    parentSpanId: context.spanId,
    requestId: context.requestId,
    method: 'GET',
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    componentType: 'client',
    componentName,
    startTime: Date.now(),
    metadata,
  };

  return componentContext;
}

/**
 * Trace a client-side data fetch
 *
 * Usage:
 * const result = await traceClientFetch('getUser', fetch('/api/user'));
 */
export async function traceClientFetch<T>(
  fetchName: string,
  fetchPromise: Promise<T>,
  options: NextTraceOptions = {}
): Promise<T> {
  const context = getClientTraceContext();
  if (!context) {
    return fetchPromise;
  }

  const startTime = Date.now();
  const spanId = generateClientSpanId();

  const fetchContext: ClientComponentContext = {
    traceId: context.traceId,
    spanId,
    parentSpanId: context.spanId,
    requestId: context.requestId,
    method: 'GET',
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    componentType: 'client',
    componentName: `fetch:${fetchName}`,
    startTime,
  };

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
}

/**
 * Trace a client-side function call
 *
 * Usage:
 * const result = await traceClientFunction('onClick', () => {
 *   // event handler logic
 * });
 */
export async function traceClientFunction<T>(
  functionName: string,
  fn: () => T | Promise<T>,
  options: NextTraceOptions = {}
): Promise<T> {
  const context = getClientTraceContext();
  if (!context) {
    return fn();
  }

  const startTime = Date.now();
  const spanId = generateClientSpanId();

  const functionContext: ClientComponentContext = {
    traceId: context.traceId,
    spanId,
    parentSpanId: context.spanId,
    requestId: context.requestId,
    method: 'GET',
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    componentType: 'client',
    componentName: functionName,
    startTime,
  };

  try {
    const result = await fn();
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
}

/**
 * Track route navigation
 *
 * Usage:
 * 'use client';
 * import { useRouter } from 'next/navigation';
 * import { trackRouteTransition } from '@trace-inject/next';
 *
 * export function NavigationLink() {
 *   const router = useRouter();
 *   const handleClick = () => {
 *     trackRouteTransition('/new-page');
 *     router.push('/new-page');
 *   };
 *   // ...
 * }
 */
export function trackRouteTransition(
  nextPath: string,
  metadata?: Record<string, unknown>
): ClientComponentContext {
  const context = getClientTraceContext();
  if (!context) {
    throw new Error('Client trace context not initialized');
  }

  const spanId = generateClientSpanId();

  const navigationContext: ClientComponentContext = {
    traceId: context.traceId,
    spanId,
    parentSpanId: context.spanId,
    requestId: context.requestId,
    method: 'GET',
    path: nextPath,
    componentType: 'client',
    componentName: 'routeTransition',
    startTime: Date.now(),
    metadata: {
      fromPath: typeof window !== 'undefined' ? window.location.pathname : '/',
      toPath: nextPath,
      ...metadata,
    },
  };

  return navigationContext;
}

/**
 * Send client trace to backend
 *
 * Usage:
 * await sendClientTrace(context, 'http://localhost:3000/api/traces');
 */
export async function sendClientTrace(
  context: ClientComponentContext,
  endpoint: string
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': context.traceId,
        'traceparent': `00-${context.traceId}-${context.spanId}-01`,
      },
      body: JSON.stringify(context),
    });
  } catch (error) {
    console.error('Failed to send client trace:', error);
  }
}

/**
 * Create a hook for component tracing
 *
 * Usage:
 * const useComponentTrace = createUseComponentTraceHook();
 *
 * export function MyComponent() {
 *   const traceContext = useComponentTrace('MyComponent');
 *   // ...
 * }
 */
export function createUseComponentTraceHook() {
  return function useComponentTrace(componentName: string): ClientComponentContext {
    if (typeof window === 'undefined') {
      throw new Error('useComponentTrace can only be used in Client Components');
    }

    const context = traceComponentRender(componentName);
    return context;
  };
}

/**
 * Setup automatic client trace reporting
 *
 * Usage:
 * setupClientTraceReporting('http://localhost:3000/api/traces');
 */
export function setupClientTraceReporting(endpoint: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Report trace on unload
  window.addEventListener('beforeunload', () => {
    const context = getClientTraceContext();
    if (context) {
      // Use sendBeacon for reliability on page unload
      navigator.sendBeacon(endpoint, JSON.stringify({
        traceId: context.traceId,
        spanId: context.spanId,
        requestId: context.requestId,
        duration: Date.now() - context.startTime,
      }));
    }
  });
}

/**
 * Clear client trace context
 */
export function clearClientTrace(): void {
  clientTrace = null;
}
