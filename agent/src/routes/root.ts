import { Hono } from 'hono';
import { Context } from 'hono';

/**
 * Root Routes
 *
 * Provides endpoints for the root path of the application:
 * - GET / - API information and welcome message
 * - GET /version - Application version information
 * - GET /info - Detailed application information
 *
 * These endpoints serve as entry points for API discovery and health verification.
 */

export function createRootRoutes(): Hono {
  const routes = new Hono();

  /**
   * Root Endpoint
   * GET /
   *
   * Provides a welcome message and basic API information.
   * Used for verifying the API is running and accessible.
   */
  routes.get('/', (c: Context) => {
    return c.json(
      {
        message: 'Welcome to HONO Server with Datadog Dynamic Instrumentation',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
      },
      200
    );
  });

  /**
   * Version Endpoint
   * GET /version
   *
   * Returns the current version of the application.
   * Used for version verification and compatibility checks.
   */
  routes.get('/version', (c: Context) => {
    return c.json(
      {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
      200
    );
  });

  /**
   * Application Info Endpoint
   * GET /info
   *
   * Returns detailed information about the application.
   * Includes name, description, version, and runtime information.
   */
  routes.get('/info', (c: Context) => {
    return c.json(
      {
        name: 'HONO Server with Datadog Dynamic Instrumentation',
        description:
          'Production-ready Hono web server with comprehensive Datadog dynamic instrumentation for distributed tracing, performance monitoring, and observability',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        runtime: {
          node: process.version,
          platform: process.platform,
        },
        timestamp: new Date().toISOString(),
      },
      200
    );
  });

  return routes;
}

export default createRootRoutes;
