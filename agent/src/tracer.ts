import tracer from 'dd-trace';

/**
 * Initialize Datadog APM tracer
 *
 * This module must be imported at the very start of the application,
 * before any other modules, to ensure proper instrumentation of all
 * libraries and external calls.
 *
 * Environment variables:
 * - DD_TRACE_ENABLED: Enable/disable tracing (default: true)
 * - DD_SERVICE: Service name for Datadog (default: 'agent')
 * - DD_ENV: Environment (development/staging/production)
 * - DD_VERSION: Application version
 * - DD_AGENT_HOST: Datadog agent host (default: localhost)
 * - DD_AGENT_PORT: Datadog agent port (default: 8126)
 */

// Initialize tracer with configuration
const initializeTracer = () => {
  const isEnabled = process.env.DD_TRACE_ENABLED !== 'false';

  if (!isEnabled) {
    console.log('Datadog tracing is disabled');
    return tracer;
  }

  tracer.init({
    service: process.env.DD_SERVICE || 'agent',
    env: process.env.DD_ENV || 'development',
    version: process.env.DD_VERSION || '1.0.0',
    logInjection: true,
    runtimeMetrics: true,
  });

  console.log(
    `Datadog tracer initialized for service: ${process.env.DD_SERVICE || 'agent'}`
  );

  return tracer;
};

// Initialize tracer immediately on module load
export const tracing = initializeTracer();

// Export tracer for use throughout the application
export default tracer;
