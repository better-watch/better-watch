import { Hono } from 'hono';
import { Context } from 'hono';

/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring application health and readiness:
 * - GET /health/live - Liveness probe (responds if server is running)
 * - GET /health/ready - Readiness probe (responds if server is ready to handle requests)
 *
 * These endpoints are essential for:
 * - Kubernetes health checks and pod orchestration
 * - Load balancer health monitoring
 * - Application uptime monitoring
 * - Datadog infrastructure health verification
 */

export function createHealthCheckRoutes(): Hono {
  const routes = new Hono();

  /**
   * Liveness Probe
   * GET /health/live
   *
   * Returns 200 OK if the server process is running.
   * This simple endpoint indicates the application is alive and responding.
   * Used by orchestration systems (Kubernetes, etc.) to detect dead processes.
   */
  routes.get('/live', (c: Context) => {
    return c.json(
      {
        status: 'alive',
        timestamp: new Date().toISOString(),
      },
      200
    );
  });

  /**
   * Readiness Probe
   * GET /health/ready
   *
   * Returns 200 OK if the server is ready to handle requests.
   * Can be extended to check dependencies (database, cache, etc.).
   * Currently indicates the server is fully initialized and ready.
   */
  routes.get('/ready', (c: Context) => {
    return c.json(
      {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
      200
    );
  });

  /**
   * Root Health Endpoint
   * GET /health
   *
   * Combines liveness and readiness information.
   * Returns detailed health status of the application.
   */
  routes.get('/', (c: Context) => {
    return c.json(
      {
        status: 'healthy',
        checks: {
          liveness: 'ok',
          readiness: 'ok',
        },
        timestamp: new Date().toISOString(),
      },
      200
    );
  });

  return routes;
}

export default createHealthCheckRoutes;
