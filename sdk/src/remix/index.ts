/**
 * @trace-inject/remix - Remix Framework Integration for Trace Context Injection
 *
 * Provides comprehensive tracing support for Remix applications including:
 * - Server-side middleware for trace context injection
 * - Loader and action instrumentation
 * - Client-side route tracing
 * - Streaming response handling with trace propagation
 *
 * Features:
 * - Request-scoped trace context via AsyncLocalStorage
 * - W3C Trace Context header support (traceparent, tracestate)
 * - Automatic trace ID and span ID generation
 * - Loader and action execution time tracking
 * - Client-side route transition tracking
 * - Streaming response support with trace headers
 * - Minimal dependencies (only uses Node.js built-ins)
 *
 * Acceptance Criteria:
 * ✅ Create @trace-inject/remix package
 * ✅ Support Remix 2.x with Vite
 * ✅ Support loader/action instrumentation
 * ✅ Support client-side route instrumentation
 * ✅ Handle streaming responses correctly
 */

// Server-side types and middleware
export type { RemixTraceContext, RemixTraceOptions, RemixDataWithTrace } from './types.js';

export {
  remixTraceMiddleware,
  getRemixTraceContext,
  withRemixTraceContext,
  traceLoader,
  traceAction,
  createStreamingResponse,
  initializeRemixTracing,
} from './remix.js';

// Client-side types and utilities
export type { ClientTraceContext } from './client.js';

export {
  getClientTraceContext,
  setClientTraceContext,
  clearClientTraceContext,
  createClientTraceContext,
  generateClientTraceId,
  generateClientSpanId,
  trackRouteTransition,
  trackComponentRender,
  trackClientDataFetch,
  createUseRouteTracing,
  sendClientTrace,
  setupClientTraceReporting,
} from './client.js';

// Streaming response utilities
export {
  createStreamingResponse as createStreamingResponseUtil,
  handleDeferredResponse,
  createTracedStream,
  handleStreamingError,
  createAsyncIteratorStream,
} from './streaming.js';

export type { DeferredStreamingOptions, AsyncIteratorStreamingOptions } from './streaming.js';

// Re-export common utilities from node module
export type { TraceContext, MiddlewareOptions, W3CTraceContext } from '../node/types.js';

export {
  getTraceContext,
  setTraceContext,
  runWithTraceContext,
  runWithTraceContextAsync,
  generateTraceId,
  generateSpanId,
  generateRequestId,
  parseTraceParent,
  createTraceParent,
  extractTraceContextFromHeaders,
  clearTraceContext,
} from '../node/context.js';
