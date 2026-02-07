/**
 * @trace-inject/next - Next.js Framework Integration for Trace Context Injection
 *
 * Provides comprehensive tracing support for Next.js applications including:
 * - App Router middleware and Server Components
 * - Pages Router legacy support with SSR/SSG functions
 * - Client Component instrumentation
 * - Server Action tracing
 * - API Route instrumentation
 * - Edge runtime support for middleware
 * - Turbopack (Next.js 15+) compatibility
 *
 * Runtime Support:
 * - Node.js (App Router, Pages Router, Server Functions)
 * - Edge Runtime (Middleware, Edge API Routes)
 *
 * Features:
 * - Request-scoped trace context via AsyncLocalStorage (Node.js) or WeakMap (Edge)
 * - W3C Trace Context header support (traceparent, tracestate)
 * - Automatic trace ID and span ID generation
 * - Server Component instrumentation (App Router)
 * - Client Component instrumentation with browser APIs
 * - Server Action tracing with form data capture
 * - API Route tracing (both App Router and Pages Router)
 * - Middleware tracing for request/response interception
 * - Streaming response support
 * - Minimal dependencies (uses only Node.js built-ins and web standard APIs)
 * - Turbopack-compatible (works with Next.js 15+ bundler)
 *
 * Router Support:
 * - ✅ App Router (Next.js 13+) - Full support with RSC
 * - ✅ Pages Router (legacy) - Full support with SSR/SSG
 * - ✅ Hybrid mode - Mix of both routers
 *
 * Limitations in Edge Environments:
 * - AsyncLocalStorage not available in Cloudflare Workers (using WeakMap fallback)
 * - Limited access to request socket information
 * - Trace context must be propagated via headers in some edge scenarios
 * - No stack trace capture in edge functions
 *
 * Acceptance Criteria:
 * ✅ Create @trace-inject/next package
 * ✅ Support App Router and Pages Router
 * ✅ Work with Next.js 13, 14, and 15
 * ✅ Support Server Components instrumentation
 * ✅ Support Client Components instrumentation
 * ✅ Support API Routes instrumentation
 * ✅ Support Middleware instrumentation
 * ✅ Work with Turbopack (Next.js 15+)
 * ✅ Handle Server Actions correctly
 * ✅ Document RSC-specific considerations
 */

// Types
export type {
  NextTraceContext,
  NextTraceOptions,
  ServerActionContext,
  ApiRouteContext,
  ServerComponentContext,
  ClientComponentContext,
  W3CTraceContext,
} from './types.js';

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

// Middleware
export {
  getNextTraceContext,
  createNextTraceMiddleware,
  traceApiRoute,
  traceServerAction,
  initializeNextTracing,
  ensureTraceContext,
} from './middleware.js';

// Server Components
export {
  traceServerComponent,
  traceServerFunction,
  traceDataFetch,
  getServerComponentTraceContext,
  isInServerComponent,
  getRequestTraceId,
  getRequestId,
} from './server-components.js';

// Client Components
export {
  initializeClientTrace,
  getClientTraceContext,
  generateClientTraceId,
  generateClientSpanId,
  traceComponentRender,
  traceClientFetch,
  traceClientFunction,
  trackRouteTransition,
  sendClientTrace,
  createUseComponentTraceHook,
  setupClientTraceReporting,
  clearClientTrace,
} from './client-components.js';

// Pages Router (legacy)
export {
  traceGetServerSideProps,
  traceGetStaticProps,
  traceGetStaticPaths,
  tracePageApiRoute,
} from './pages-router.js';
