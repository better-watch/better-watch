/**
 * Type definitions for Remix framework tracing
 */

import type { TraceContext, MiddlewareOptions } from '../node/types.js';

/**
 * Remix-specific trace context with loader/action metadata
 */
export interface RemixTraceContext extends TraceContext {
  /**
   * Remix route ID
   */
  routeId?: string;

  /**
   * Loader execution time (milliseconds)
   */
  loaderTime?: number;

  /**
   * Action execution time (milliseconds)
   */
  actionTime?: number;

  /**
   * Whether this is a client-side navigation
   */
  isClientNavigation?: boolean;

  /**
   * Remix request action (if applicable)
   */
  action?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

/**
 * Options for Remix trace integration
 */
export interface RemixTraceOptions extends MiddlewareOptions {
  /**
   * Include loader execution time in traces
   */
  captureLoaderTime?: boolean;

  /**
   * Include action execution time in traces
   */
  captureActionTime?: boolean;

  /**
   * Capture request body for actions
   */
  captureActionBody?: boolean;

  /**
   * Custom callback for loader traces
   */
  onLoaderTrace?: (context: RemixTraceContext) => void | Promise<void>;

  /**
   * Custom callback for action traces
   */
  onActionTrace?: (context: RemixTraceContext) => void | Promise<void>;

  /**
   * Custom callback for route traces
   */
  onRouteTrace?: (context: RemixTraceContext) => void | Promise<void>;
}

/**
 * Data passed to loader and action functions
 * Contains trace context for instrumentation
 */
export interface RemixDataWithTrace<T = unknown> {
  /**
   * The original loader/action data
   */
  data: T;

  /**
   * The trace context for this operation
   */
  traceContext: RemixTraceContext;
}
