/**
 * Type definitions for Next.js middleware tracing
 */

import type { TraceContext } from '../node/types.js';

/**
 * Next.js specific trace context
 */
export interface NextTraceContext extends TraceContext {
  /**
   * Component type (Server/Client/Client-Action)
   */
  componentType?: 'server' | 'client' | 'action';

  /**
   * Server Action name (if applicable)
   */
  actionName?: string;

  /**
   * API route path (if applicable)
   */
  apiRoute?: string;

  /**
   * Page/Component name
   */
  componentName?: string;

  /**
   * Whether this is a streaming response
   */
  isStreaming?: boolean;

  /**
   * Error details (if request failed)
   */
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Middleware options for Next.js trace context setup
 */
export interface NextTraceOptions {
  /**
   * Whether to capture stack traces (expensive, disabled by default)
   */
  captureStackTrace?: boolean;

  /**
   * Include request body in trace (be careful with sensitive data)
   */
  captureBody?: boolean;

  /**
   * Include request headers in trace
   */
  captureHeaders?: boolean;

  /**
   * Headers to exclude from capture (e.g., Authorization, Cookie)
   */
  excludeHeaders?: string[];

  /**
   * Callback to handle trace context
   */
  onTrace?: (context: NextTraceContext) => void | Promise<void>;

  /**
   * Whether tracing is enabled
   */
  enabled?: boolean;

  /**
   * Custom trace ID generator
   */
  generateTraceId?: () => string;

  /**
   * Custom span ID generator
   */
  generateSpanId?: () => string;

  /**
   * Custom request ID generator
   */
  generateRequestId?: () => string;

  /**
   * Enable Server Component instrumentation
   */
  instrumentServerComponents?: boolean;

  /**
   * Enable Client Component instrumentation
   */
  instrumentClientComponents?: boolean;

  /**
   * Enable API Route instrumentation
   */
  instrumentApiRoutes?: boolean;

  /**
   * Enable Server Action instrumentation
   */
  instrumentServerActions?: boolean;

  /**
   * Enable middleware instrumentation
   */
  instrumentMiddleware?: boolean;

  /**
   * Enable edge runtime support (for middleware and edge functions)
   */
  enableEdgeSupport?: boolean;
}

/**
 * Server Action context
 */
export interface ServerActionContext extends NextTraceContext {
  componentType: 'action';
  actionName: string;
  formData?: Record<string, unknown>;
}

/**
 * API Route context
 */
export interface ApiRouteContext extends NextTraceContext {
  apiRoute: string;
  statusCode?: number;
}

/**
 * Server Component context
 */
export interface ServerComponentContext extends NextTraceContext {
  componentType: 'server';
  componentName: string;
  props?: Record<string, unknown>;
}

/**
 * Client Component context
 */
export interface ClientComponentContext extends NextTraceContext {
  componentType: 'client';
  componentName: string;
}

/**
 * Re-export W3C types
 */
export type { W3CTraceContext } from '../node/types.js';
