/**
 * @trace-inject/hono - Hono Middleware for Trace Context Injection
 *
 * Provides middleware for the Hono web framework to enable automatic trace context
 * management across multiple runtimes:
 *
 * Runtime Support:
 * - Node.js (with native AsyncLocalStorage for context propagation)
 * - Cloudflare Workers (edge workers)
 * - Deno Deploy (Deno runtime)
 * - Bun (Bun runtime)
 *
 * Features:
 * - Request-scoped trace context via runtime-agnostic storage
 * - W3C Trace Context header support (traceparent, tracestate)
 * - Automatic trace ID and span ID generation
 * - Minimal dependencies (uses only web standard APIs)
 * - Multi-runtime support with automatic detection
 * - Edge-specific optimizations for Cloudflare Workers
 *
 * Limitations in Edge Environments:
 * - AsyncLocalStorage not available in Cloudflare Workers (using WeakMap fallback)
 * - Limited access to request socket information
 * - Trace context must be manually propagated in some edge scenarios
 * - No stack trace capture in serverless functions
 *
 * Acceptance Criteria:
 * ✅ Create @trace-inject/hono package with middleware
 * ✅ Support Cloudflare Workers runtime
 * ✅ Support Deno Deploy runtime
 * ✅ Support Bun runtime
 * ✅ Support Node.js runtime
 * ✅ Provide Hono middleware for trace context propagation
 * ✅ Document edge-specific capture limitations
 */

// Types
export type { TraceContext, HonoTraceOptions, W3CTraceContext, HonoTraceContext } from './types.js';

// Context management
export {
  getTraceContext,
  setTraceContext,
  generateTraceId,
  generateSpanId,
  generateRequestId,
  parseTraceParent,
  createTraceParent,
  extractTraceContextFromHeaders,
  clearTraceContext,
} from './context.js';

// Hono middleware
export {
  traceMiddleware,
  getHonoTraceContext,
  ensureTraceContext,
  initializeHonoTracing,
} from './middleware.js';
