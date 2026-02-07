/**
 * Client-side Remix routing instrumentation
 *
 * Provides utilities for tracing client-side route transitions,
 * navigation, and React component lifecycle in Remix applications
 */

/// <reference lib="dom" />
import type { RemixTraceContext } from './types.js';

/**
 * Client-side trace context for route transitions
 */
export interface ClientTraceContext extends RemixTraceContext {
  /**
   * Navigation start timestamp
   */
  navigationStart?: number;

  /**
   * Navigation end timestamp
   */
  navigationEnd?: number;

  /**
   * Component render start time
   */
  renderStart?: number;

  /**
   * Component render end time
   */
  renderEnd?: number;

  /**
   * Previous route ID before navigation
   */
  previousRouteId?: string;

  /**
   * Navigation type (push, replace, etc.)
   */
  navigationType?: 'push' | 'replace' | 'reload';
}

/**
 * Store for client-side trace contexts
 * Uses Map to store contexts by route ID
 */
const clientTraceContextMap = new Map<string, ClientTraceContext>();

/**
 * Get client-side trace context for a route
 */
export function getClientTraceContext(routeId: string): ClientTraceContext | undefined {
  return clientTraceContextMap.get(routeId);
}

/**
 * Set client-side trace context for a route
 */
export function setClientTraceContext(routeId: string, context: ClientTraceContext): void {
  clientTraceContextMap.set(routeId, context);
}

/**
 * Clear client-side trace context for a route
 */
export function clearClientTraceContext(routeId: string): void {
  clientTraceContextMap.delete(routeId);
}

/**
 * Create a client-side trace context for a route transition
 * Should be called when a route change is initiated
 */
export function createClientTraceContext(
  routeId: string,
  previousRouteId?: string,
  navigationType: 'push' | 'replace' | 'reload' = 'push'
): ClientTraceContext {
  const traceId = generateClientTraceId();
  const spanId = generateClientSpanId();

  const context: ClientTraceContext = {
    traceId,
    spanId,
    routeId,
    previousRouteId,
    navigationType,
    navigationStart: Date.now(),
    requestId: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    method: 'GET',
    path: routeId,
    startTime: Date.now(),
    metadata: {
      isClientNavigation: true,
      navigationType,
    },
  };

  setClientTraceContext(routeId, context);
  return context;
}

/**
 * Generate a client-side trace ID
 */
export function generateClientTraceId(): string {
  // Use browser's high-resolution timer for better entropy
  const time = performance.now().toString(16);
  const random = Math.random().toString(16).substring(2);
  return (time + random).padEnd(32, '0').substring(0, 32);
}

/**
 * Generate a client-side span ID
 */
export function generateClientSpanId(): string {
  const random = Math.random().toString(16).substring(2);
  return (Date.now().toString(16) + random).padEnd(16, '0').substring(0, 16);
}

/**
 * Track route transition with tracing
 *
 * @param newRouteId - The new route ID being navigated to
 * @param previousRouteId - The previous route ID (optional)
 * @param callback - Callback function to execute during navigation
 * @returns Result of the callback
 *
 * @example
 * ```typescript
 * function NavigationLink({ to, children }) {
 *   const handleClick = () => {
 *     trackRouteTransition(to, location.pathname, async () => {
 *       // Navigation logic
 *     });
 *   };
 *   return <a onClick={handleClick}>{children}</a>;
 * }
 * ```
 */
export async function trackRouteTransition<T>(
  newRouteId: string,
  previousRouteId?: string,
  callback?: () => Promise<T>
): Promise<T | undefined> {
  const context = createClientTraceContext(newRouteId, previousRouteId);

  try {
    if (callback) {
      const result = await callback();
      context.navigationEnd = Date.now();
      return result;
    }
  } finally {
    if (!context.navigationEnd) {
      context.navigationEnd = Date.now();
    }
  }
}

/**
 * Track component render performance
 *
 * @param componentName - Name of the component
 * @param routeId - The route ID this component belongs to
 * @param callback - The render function
 * @returns Result of the render
 *
 * @example
 * ```typescript
 * export default function MyComponent() {
 *   return trackComponentRender('MyComponent', location.pathname, () => {
 *     return <div>Content</div>;
 *   });
 * }
 * ```
 */
export function trackComponentRender<T>(
  componentName: string,
  routeId: string,
  callback: () => T
): T {
  const context = getClientTraceContext(routeId) || createClientTraceContext(routeId);

  if (!context.renderStart) {
    context.renderStart = Date.now();
  }

  try {
    return callback();
  } finally {
    context.renderEnd = Date.now();
  }
}

/**
 * Track async data fetching on the client
 *
 * @param operationName - Name of the operation
 * @param routeId - The route ID
 * @param fetcher - The async fetcher function
 * @returns Promise with the fetched data
 *
 * @example
 * ```typescript
 * const data = await trackClientDataFetch(
 *   'loadUserData',
 *   '/user/:id',
 *   async () => {
 *     const response = await fetch('/api/user');
 *     return response.json();
 *   }
 * );
 * ```
 */
export async function trackClientDataFetch<T>(
  operationName: string,
  routeId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const context = getClientTraceContext(routeId) || createClientTraceContext(routeId);

  const fetchStartTime = Date.now();

  try {
    const result = await fetcher();

    // Record operation timing
    if (!context.metadata) {
      context.metadata = {};
    }

    const operations = (context.metadata.clientOperations || []) as any[];
    operations.push({
      name: operationName,
      duration: Date.now() - fetchStartTime,
      timestamp: fetchStartTime,
    });

    context.metadata.clientOperations = operations;

    return result;
  } catch (error) {
    // Record failed operation
    if (!context.metadata) {
      context.metadata = {};
    }

    const operations = (context.metadata.clientOperations || []) as any[];
    operations.push({
      name: operationName,
      duration: Date.now() - fetchStartTime,
      timestamp: fetchStartTime,
      error: error instanceof Error ? error.message : String(error),
    });

    context.metadata.clientOperations = operations;
    throw error;
  }
}

/**
 * Create a React hook for tracing route changes
 * Returns a hook function that can be called in useEffect
 *
 * @example
 * ```typescript
 * import { useRouteTracing } from '@trace-inject/remix/client';
 *
 * export default function MyComponent() {
 *   useRouteTracing();
 *   return <div>Content</div>;
 * }
 * ```
 */
export function createUseRouteTracing() {
  return function useRouteTracing() {
    // This hook is typically used in route components
    // The actual implementation would depend on how you access the current route

    const trackRouteChange = (routeId: string, previousRouteId?: string) => {
      createClientTraceContext(routeId, previousRouteId);
    };

    return { trackRouteChange, getContext: getClientTraceContext };
  };
}

/**
 * Send client-side trace data to the server
 *
 * @param context - The trace context to send
 * @param endpoint - The server endpoint to send to
 *
 * @example
 * ```typescript
 * const context = getClientTraceContext(routeId);
 * if (context) {
 *   await sendClientTrace(context, '/api/traces');
 * }
 * ```
 */
export async function sendClientTrace(
  context: ClientTraceContext,
  endpoint: string = '/api/traces'
): Promise<void> {
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'traceparent': context.traceParent || '',
        'x-trace-id': context.traceId,
      },
      body: JSON.stringify({
        traceId: context.traceId,
        spanId: context.spanId,
        routeId: context.routeId,
        navigationStart: context.navigationStart,
        navigationEnd: context.navigationEnd,
        renderStart: context.renderStart,
        renderEnd: context.renderEnd,
        navigationType: context.navigationType,
        metadata: context.metadata,
      }),
    });
  } catch (error) {
    // Silently fail - don't interrupt page load
    console.debug('Failed to send client trace:', error);
  }
}

/**
 * Setup automatic client-side trace reporting
 * Should be called once during app initialization
 *
 * @param endpoint - Server endpoint to report traces to
 * @param options - Configuration options
 */
export function setupClientTraceReporting(
  endpoint: string = '/api/traces',
  options: {
    /**
     * Send traces on page unload
     */
    sendOnUnload?: boolean;

    /**
     * Send traces after route transitions
     */
    sendOnNavigation?: boolean;

    /**
     * Batch traces before sending (number of traces)
     */
    batchSize?: number;

    /**
     * Auto-send interval (milliseconds)
     */
    flushInterval?: number;
  } = {}
) {
  const {
    sendOnUnload = true,
    sendOnNavigation = true,
    batchSize = 5,
    flushInterval = 10000,
  } = options;

  const batchedTraces: ClientTraceContext[] = [];

  const flushBatch = async () => {
    if (batchedTraces.length > 0) {
      const tracesToSend = batchedTraces.splice(0);
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traces: tracesToSend }),
        });
      } catch (error) {
        console.debug('Failed to flush traces:', error);
      }
    }
  };

  // Periodic flush
  const flushIntervalId = setInterval(flushBatch, flushInterval);

  // Flush on page unload
  if (sendOnUnload) {
    window.addEventListener('beforeunload', () => {
      clearInterval(flushIntervalId);
      // Use synchronous fetch with keepalive for beforeunload
      const contexts = Array.from(clientTraceContextMap.values());
      if (contexts.length > 0) {
        navigator.sendBeacon(
          endpoint,
          JSON.stringify({ traces: contexts })
        );
      }
    });
  }

  // Flush after navigation
  if (sendOnNavigation) {
    // This would be integrated with Remix's useTransition or useNavigate
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function(data: any, unused: string, url?: string | URL) {
      originalPushState(data, unused, url);
      // Collect current traces and queue them
      clientTraceContextMap.forEach((context) => {
        batchedTraces.push(context);
        if (batchedTraces.length >= batchSize) {
          flushBatch().catch(console.debug);
        }
      });
    };
  }
}
