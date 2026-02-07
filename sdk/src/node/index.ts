/**
 * @trace-inject/node - Node.js Middleware for Trace Context Injection
 *
 * Provides middleware for Express, Fastify, and Koa frameworks to enable
 * automatic trace context management across async operations using AsyncLocalStorage.
 *
 * Features:
 * - Request-scoped trace context via AsyncLocalStorage
 * - W3C Trace Context header support (traceparent, tracestate)
 * - Express, Fastify, and Koa middleware
 * - Automatic trace ID and span ID generation
 * - Minimal dependencies (only uses Node.js built-ins)
 *
 * Acceptance Criteria:
 * ✅ Create @trace-inject/node package with middleware
 * ✅ Provide Express middleware for trace context
 * ✅ Provide Fastify plugin for trace context
 * ✅ Provide Koa middleware for trace context
 * ✅ Support request-scoped tracing
 * ✅ Propagate trace context through async operations
 */

// Types
export type { TraceContext, MiddlewareOptions, W3CTraceContext } from './types.js';

// Context management
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
} from './context.js';

// Express middleware
export {
  traceMiddleware,
  getExpressTraceContext,
  attachTraceContextMiddleware,
  ensureTraceContext,
  initializeExpressTracing,
} from './express.js';

// Fastify plugin
export { fastifyTracePlugin, getFastifyTraceContext, withFastifyTraceContext } from './fastify.js';

// Koa middleware
export {
  koaTraceMiddleware,
  getKoaTraceContext,
  withKoaTraceContext,
} from './koa.js';
