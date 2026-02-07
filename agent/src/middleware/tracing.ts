import tracer from 'dd-trace';
import { Context } from 'hono';
import { Next } from 'hono';

/**
 * Custom Tracing Middleware
 *
 * Creates Datadog APM spans for every HTTP request, enabling comprehensive
 * distributed tracing without requiring modifications to individual route handlers.
 *
 * For each request, the middleware:
 * - Creates a span with operation name "http.request"
 * - Tags with request metadata (method, URL, path, client IP)
 * - Processes the request through the next middleware/handler
 * - Tags the response with status code
 * - Handles errors appropriately
 * - Ensures spans are always finished (success and error cases)
 */

export async function customTracingMiddleware(c: Context, next: Next) {
  // Create span for this HTTP request
  const span = tracer.startSpan('http.request');

  try {
    // Extract request information
    const method = c.req.method;
    const url = c.req.url;
    const path = c.req.path;
    const clientIp =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-client-ip') ||
      'unknown';

    // Set resource tag as "METHOD PATH"
    span.setTag('resource', `${method} ${path}`);

    // Tag span with request metadata
    span.setTag('http.method', method);
    span.setTag('http.url', url);
    span.setTag('http.path', path);
    span.setTag('http.client_ip', clientIp);

    // Call next middleware/handler to process the request
    await next();

    // After request completes, tag with response status code
    span.setTag('http.status_code', c.res.status);
  } catch (error) {
    // Handle errors during request processing
    span.setTag('error', true);

    if (error instanceof Error) {
      span.setTag('error.message', error.message);
    }

    // Tag error response with 500 status
    span.setTag('http.status_code', 500);

    // Rethrow the error to be handled by error handler middleware
    throw error;
  } finally {
    // Always finish the span, whether request succeeded or failed
    span.finish();
  }
}
