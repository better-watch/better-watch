import { z } from 'zod';

/**
 * Server Configuration Module
 *
 * Provides runtime schema validation and typed configuration for Hono web server.
 * Loads configuration from environment variables with sensible defaults.
 * Handles server binding, port configuration, and runtime behavior settings.
 */

// Validation schema for server configuration
const ServerConfigSchema = z.object({
  // Server Binding
  host: z.string().default('0.0.0.0'),
  port: z.number().int().positive().default(3000),

  // Environment
  nodeEnv: z.enum(['development', 'staging', 'production']).default('development'),

  // Server Behavior
  trustProxy: z.boolean().default(false),
  bodyLimit: z.number().int().positive().default(1048576), // 1MB default
  requestTimeout: z.number().int().positive().default(30000), // 30 seconds default

  // Feature Flags
  debugMode: z.boolean().default(false),
  prettyPrintLogs: z.boolean().default(true),

  // CORS Configuration
  corsEnabled: z.boolean().default(true),
  corsOrigin: z.string().default('*'),
  corsCredentials: z.boolean().default(false),

  // Health Check
  healthCheckEnabled: z.boolean().default(true),
  healthCheckPath: z.string().default('/health'),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/**
 * Load and validate server configuration from environment variables
 *
 * @returns Validated server configuration object
 * @throws {z.ZodError} If environment variables fail validation
 */
export const loadServerConfig = (): ServerConfig => {
  const rawConfig = {
    // Server Binding
    host: process.env.SERVER_HOST,
    port: process.env.SERVER_PORT
      ? parseInt(process.env.SERVER_PORT, 10)
      : undefined,

    // Environment
    nodeEnv: process.env.NODE_ENV,

    // Server Behavior
    trustProxy: process.env.SERVER_TRUST_PROXY === 'true',
    bodyLimit: process.env.SERVER_BODY_LIMIT
      ? parseInt(process.env.SERVER_BODY_LIMIT, 10)
      : undefined,
    requestTimeout: process.env.SERVER_REQUEST_TIMEOUT
      ? parseInt(process.env.SERVER_REQUEST_TIMEOUT, 10)
      : undefined,

    // Feature Flags
    debugMode: process.env.DEBUG === 'true',
    prettyPrintLogs: process.env.SERVER_PRETTY_LOGS !== 'false',

    // CORS Configuration
    corsEnabled: process.env.SERVER_CORS_ENABLED !== 'false',
    corsOrigin: process.env.SERVER_CORS_ORIGIN,
    corsCredentials: process.env.SERVER_CORS_CREDENTIALS === 'true',

    // Health Check
    healthCheckEnabled: process.env.SERVER_HEALTH_CHECK_ENABLED !== 'false',
    healthCheckPath: process.env.SERVER_HEALTH_CHECK_PATH,
  };

  try {
    return ServerConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Server configuration validation failed:', error.errors);
      throw error;
    }
    throw error;
  }
};

/**
 * Export singleton instance of server configuration
 * This ensures configuration is loaded once and reused throughout the application
 */
export const serverConfig = loadServerConfig();

export default serverConfig;
