import { z } from 'zod';

/**
 * Datadog Configuration Module
 *
 * Provides runtime schema validation and typed configuration for Datadog APM integration.
 * Loads configuration from environment variables with sensible defaults.
 * Integrates with dd-trace initialization and runtime metrics collection.
 */

// Validation schema for Datadog configuration
const DatadogConfigSchema = z.object({
  // APM Configuration
  traceEnabled: z.boolean().default(true),
  service: z.string().default('agent'),
  env: z.enum(['development', 'staging', 'production']).default('development'),
  version: z.string().default('1.0.0'),

  // Datadog Agent Connection
  agentHost: z.string().default('localhost'),
  agentPort: z.number().int().positive().default(8126),

  // Feature Flags
  logInjection: z.boolean().default(true),
  runtimeMetrics: z.boolean().default(true),
  debug: z.boolean().default(false),

  // Sampling Configuration
  sampleRate: z.number().min(0).max(1).default(1),

  // Tags
  tags: z.record(z.string()).default({}),
});

export type DatadogConfig = z.infer<typeof DatadogConfigSchema>;

/**
 * Load and validate Datadog configuration from environment variables
 *
 * @returns Validated Datadog configuration object
 * @throws {z.ZodError} If environment variables fail validation
 */
export const loadDatadogConfig = (): DatadogConfig => {
  const rawConfig = {
    // APM Configuration
    traceEnabled: process.env.DD_TRACE_ENABLED !== 'false',
    service: process.env.DD_SERVICE,
    env: process.env.DD_ENV,
    version: process.env.DD_VERSION,

    // Datadog Agent Connection
    agentHost: process.env.DD_AGENT_HOST,
    agentPort: process.env.DD_AGENT_PORT
      ? parseInt(process.env.DD_AGENT_PORT, 10)
      : undefined,

    // Feature Flags
    logInjection: process.env.DD_LOG_INJECTION !== 'false',
    runtimeMetrics: process.env.DD_RUNTIME_METRICS !== 'false',
    debug: process.env.DD_DEBUG === 'true',

    // Sampling Configuration
    sampleRate: process.env.DD_SAMPLE_RATE
      ? parseFloat(process.env.DD_SAMPLE_RATE)
      : undefined,

    // Tags - parse JSON or use defaults
    tags: process.env.DD_TAGS ? tryParseJSON(process.env.DD_TAGS) : {},
  };

  try {
    return DatadogConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Datadog configuration validation failed:', error.errors);
      throw error;
    }
    throw error;
  }
};

/**
 * Safely parse JSON string with fallback
 *
 * @param jsonString - JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed object or fallback
 */
function tryParseJSON(jsonString: string, fallback: Record<string, string> = {}): Record<string, string> {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Export singleton instance of Datadog configuration
 * This ensures configuration is loaded once and reused throughout the application
 */
export const datadogConfig = loadDatadogConfig();

export default datadogConfig;
