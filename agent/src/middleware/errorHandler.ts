import tracer from 'dd-trace';
import { Context } from 'hono';

/**
 * Error Handler Middleware
 *
 * Centralized error handling middleware that:
 * - Creates Datadog error spans with full context
 * - Logs errors with stack traces
 * - Returns standardized error responses
 * - Ensures proper error tracing for debugging
 */

export function errorHandler(err: Error, c: Context) {
  const span = tracer.startSpan('error.handler');

  try {
    const path = c.req.path;
    const method = c.req.method;
    const timestamp = new Date().toISOString();
    const statusCode = 500;

    // Tag span with error information
    span.setTag('error', true);
    span.setTag('error.message', err.message);
    span.setTag('error.kind', err.name || 'Error');
    span.setTag('http.path', path);
    span.setTag('http.method', method);
    span.setTag('http.status_code', statusCode);

    // Include stack trace if available
    if (err.stack) {
      span.setTag('error.stack', err.stack);
    }

    // Log error to console
    console.error({
      message: err.message,
      path,
      method,
      timestamp,
      stack: err.stack,
    });

    // Return error response
    return c.json(
      {
        error: err.message,
        timestamp,
      },
      statusCode
    );
  } finally {
    // Ensure span is finished in all code paths
    span.finish();
  }
}
