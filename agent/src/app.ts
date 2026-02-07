import { Hono } from 'hono';
import { customTracingMiddleware } from './middleware/tracing';
import { errorHandler } from './middleware/errorHandler';
import { serverConfig } from './config/server';
import { createRootRoutes } from './routes/root';
import { createHealthCheckRoutes } from './routes/health';
import { createUserRoutes } from './routes/users';
import { createDataRoutes } from './routes/data';

/**
 * Hono App Configuration
 *
 * Configures and returns a fully instrumented Hono application instance with:
 * - Datadog distributed tracing via custom tracing middleware
 * - Centralized error handling middleware
 * - CORS support based on server configuration
 * - Request/response processing with proper middleware ordering
 *
 * Middleware execution order:
 * 1. Custom Tracing Middleware - Creates spans for all requests
 * 2. Error Handler Middleware - Catches and logs errors
 * 3. Route handlers - Application-specific logic
 */

export function createApp(): Hono {
  const app = new Hono();

  // Apply custom tracing middleware for distributed tracing
  // This must be applied before route handlers to trace all requests
  app.use(customTracingMiddleware);

  // Apply error handler middleware
  // Catches errors from route handlers and provides standardized error responses
  app.onError((err, c) => {
    return errorHandler(err, c);
  });

  // Register root routes
  // Provides API information, version, and general application info
  const rootRoutes = createRootRoutes();
  app.route('/', rootRoutes);

  // Register health check routes
  // These endpoints are essential for monitoring and orchestration
  const healthCheckRoutes = createHealthCheckRoutes();
  app.route('/health', healthCheckRoutes);

  // Register user management routes
  // Provides REST API for user CRUD operations with validation
  const userRoutes = createUserRoutes();
  app.route('/users', userRoutes);

  // Register data processing routes
  // Provides REST API for data CRUD operations and processing workflows
  const dataRoutes = createDataRoutes();
  app.route('/data', dataRoutes);

  return app;
}

export default createApp;
