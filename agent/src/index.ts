/**
 * Main Entry Point - Agent Package
 *
 * CRITICAL: The tracer must be imported first, before any other modules,
 * to ensure proper instrumentation of all dependencies and external calls.
 *
 * This module initializes:
 * 1. Datadog APM tracer for distributed tracing
 * 2. Configuration modules for Datadog and server settings
 * 3. Exports necessary utilities for downstream consumers
 */

// CRITICAL: Import tracer first to ensure instrumentation of all modules
import './tracer';

// Export tracer module for use throughout the application
export { default as tracer, tracing } from './tracer';

// Export configuration modules
export { datadogConfig, loadDatadogConfig, type DatadogConfig } from './config/datadog';
export { serverConfig, loadServerConfig, type ServerConfig } from './config/server';

// Export middleware
export { errorHandler } from './middleware/errorHandler';
export { customTracingMiddleware } from './middleware/tracing';

// Export services
export { userService, type User, type CreateUserInput, type UpdateUserInput } from './services/user';
export { dataService, type Data, type CreateDataInput, type UpdateDataInput } from './services/data';

// Export app configuration
export { createApp, default as createAppDefault } from './app';

// Export routes
export { createRootRoutes, default as createRootRoutesDefault } from './routes/root';
export { createHealthCheckRoutes, default as createHealthCheckRoutesDefault } from './routes/health';
export { createUserRoutes, default as createUserRoutesDefault } from './routes/users';
export { createDataRoutes, default as createDataRoutesDefault } from './routes/data';

// Package metadata
export const version = '1.0.0';
