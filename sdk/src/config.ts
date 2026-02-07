/**
 * Configuration types and helper for TraceInject
 *
 * This module provides TypeScript type definitions and helper functions
 * for configuring the trace injection system with full autocomplete support.
 */

import type { ParseOptions } from './parser/types.js';
import type { CaptureConfig } from './capture/types.js';
import type { InjectionPointType } from './injector/types.js';
import type { TraceIngestionConfig } from './api/types.js';
import type { ConfigStorageBackend } from './api/config-storage.js';
import type { ConfigManagementServerConfig } from './api/config-server.js';

/**
 * Configuration for a single tracepoint with variable capture
 */
export interface TracepointDefinition {
  /**
   * Unique identifier for the tracepoint
   */
  id: string;

  /**
   * Type of injection point
   */
  type: InjectionPointType;

  /**
   * Line number for before/after injections (1-indexed)
   */
  lineNumber?: number;

  /**
   * Function name or path for entry/exit injections
   */
  functionName?: string;

  /**
   * Function path for nested functions (e.g., "ClassName.methodName")
   */
  functionPath?: string;

  /**
   * List of variable names or expressions to capture at this tracepoint
   * Examples: ["userId", "userData.name", "response.status"]
   */
  captureExpressions?: string[];

  /**
   * Configuration for how variables should be captured
   */
  captureConfig?: CaptureConfig;

  /**
   * Whether to inject into async functions
   */
  includeAsync?: boolean;

  /**
   * Whether to inject into generator functions
   */
  includeGenerators?: boolean;

  /**
   * Description of this tracepoint
   */
  description?: string;

  /**
   * Optional metadata for the tracepoint
   */
  metadata?: Record<string, unknown>;
}

/**
 * Parser configuration options
 */
export interface ParserConfig extends ParseOptions {
  /**
   * Whether to include source maps in parsed output
   */
  includeSourceMap?: boolean;

  /**
   * Custom filename for better error messages
   */
  sourceFilename?: string;
}

/**
 * Runtime configuration for a tracepoint (for dynamic checking)
 */
export interface RuntimeTracepointConfig {
  /**
   * Unique identifier for the tracepoint
   */
  id: string;

  /**
   * Whether this tracepoint is enabled
   */
  enabled: boolean;

  /**
   * Sampling rate (0-1). 0 = never sample, 1 = always sample
   */
  samplingRate: number;

  /**
   * Optional metadata for this tracepoint
   */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for the runtime config checker (hybrid mode)
 */
export interface RuntimeConfigCheckerConfig {
  /**
   * Remote server URL for fetching config
   * Example: "https://config.example.com/api/config"
   */
  serverUrl: string;

  /**
   * API key for authentication with the config server
   */
  apiKey: string;

  /**
   * Project ID for multi-project setups
   */
  projectId: string;

  /**
   * Environment name (e.g., "development", "staging", "production")
   */
  environment?: string;

  /**
   * Polling interval in milliseconds (default: 30000 = 30 seconds)
   */
  pollingInterval?: number;

  /**
   * Cache TTL in milliseconds (default: 60000 = 60 seconds)
   */
  cacheTtlMs?: number;

  /**
   * Maximum time to wait for config fetch in milliseconds (default: 5000)
   */
  fetchTimeoutMs?: number;

  /**
   * Whether to log debug messages (default: false)
   */
  debug?: boolean;

  /**
   * Error handler for network or other failures
   */
  onError?: (error: Error) => void;

  /**
   * Callback when config is successfully updated
   */
  onConfigUpdate?: (config: Map<string, RuntimeTracepointConfig>) => void;
}

/**
 * Complete trace injection configuration
 */
export interface TraceInjectionConfig {
  /**
   * Parser configuration
   */
  parser?: ParserConfig;

  /**
   * Default capture configuration (can be overridden per tracepoint)
   */
  capture?: CaptureConfig;

  /**
   * List of tracepoints to inject
   */
  tracepoints: TracepointDefinition[];

  /**
   * Trace ingestion API configuration
   */
  ingestion?: TraceIngestionConfig;

  /**
   * Configuration storage backend (for multi-project setups)
   */
  configStorage?: ConfigStorageBackend;

  /**
   * Config management server configuration
   */
  configManagement?: ConfigManagementServerConfig;

  /**
   * Runtime config checker configuration (for hybrid mode)
   * When configured, enables dynamic tracepoint enable/disable and sampling
   * changes without code changes or rebuilds
   */
  runtimeConfigChecker?: RuntimeConfigCheckerConfig;

  /**
   * Environment name (e.g., "development", "staging", "production")
   */
  environment?: string;

  /**
   * Project identifier for multi-project setups
   */
  projectId?: string;

  /**
   * Optional metadata for the configuration
   */
  metadata?: Record<string, unknown>;
}

/**
 * Validates a capture expression to ensure it's a valid identifier or property access pattern
 *
 * Valid patterns:
 * - Simple identifiers: "x", "userId", "_private"
 * - Property access: "user.name", "data.items.0", "response.data.users"
 * - Array indexing: "items[0]", "data[index]"
 * - Method calls (no side effects): "obj.getId()", "user.getName()"
 * - Template literals: "`Hello ${name}`"
 *
 * Invalid patterns (rejected):
 * - Side effects: "x++", "x--", "x = 5", "x += 1"
 * - Function calls with arguments that have side effects
 *
 * @param expression - The capture expression to validate
 * @returns true if valid, false otherwise
 */
export function isValidCaptureExpression(expression: string): boolean {
  // Empty string is invalid
  if (!expression || expression.trim() === '') {
    return false;
  }

  // Check for side effects - reject these patterns
  const sideEffectPatterns = [
    /[+\-*/]=/, // +=, -=, *=, /=
    /[+-]{2}/, // ++, --
    /\s=\s(?!=)/, // assignment (= but not ==)
    /delete\s+/, // delete operator
  ];

  for (const pattern of sideEffectPatterns) {
    if (pattern.test(expression)) {
      return false;
    }
  }

  // Check for valid JavaScript identifier pattern with property access and method calls
  // Pattern breakdown:
  // - Start with identifier: [a-zA-Z_$][a-zA-Z0-9_$]*
  // - Followed by zero or more of:
  //   - Property access: \.[a-zA-Z_$][a-zA-Z0-9_$]*
  //   - Array indexing: \[\d+\] or \[[a-zA-Z_$][a-zA-Z0-9_$]*\]
  //   - Method call: \(\) (no-arg methods)
  // - Template literals: backtick-enclosed strings

  // Pattern for property/array/method access
  // This matches: identifier(.property|[index]|())*
  const basicPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*((\.[a-zA-Z_$][a-zA-Z0-9_$]*)|(\[\d+\])|(\[[a-zA-Z_$][a-zA-Z0-9_$]*\])|(\(\)))*$/;

  // Pattern for template literals with embedded expressions
  // This matches: `...${...}...`
  const templateLiteralPattern = /^`([^`\\]|\\.)*(\$\{[^}]+\}([^`\\]|\\.)*)*`$/;

  return basicPattern.test(expression) || templateLiteralPattern.test(expression);
}

/**
 * Type-checks a tracepoint definition
 *
 * @param definition - The tracepoint to validate
 * @returns An array of validation errors (empty if valid)
 */
export function validateTracepointDefinition(
  definition: TracepointDefinition
): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!definition.id) {
    errors.push('Tracepoint must have an id');
  }

  if (!definition.type) {
    errors.push('Tracepoint must have a type');
  }

  // Validate type value
  if (definition.type && !['before', 'after', 'entry', 'exit'].includes(definition.type)) {
    errors.push(
      `Invalid injection type "${definition.type}". Must be one of: before, after, entry, exit`
    );
  }

  // Validate that appropriate location fields are set
  if (definition.type === 'before' || definition.type === 'after') {
    if (!definition.lineNumber) {
      errors.push(
        `Tracepoint with type "${definition.type}" must have a lineNumber`
      );
    }
  } else if (definition.type === 'entry' || definition.type === 'exit') {
    if (!definition.functionName && !definition.functionPath) {
      errors.push(
        `Tracepoint with type "${definition.type}" must have functionName or functionPath`
      );
    }
  }

  // Validate capture expressions
  if (definition.captureExpressions) {
    for (const expr of definition.captureExpressions) {
      if (!isValidCaptureExpression(expr)) {
        errors.push(
          `Invalid capture expression "${expr}". Must be a valid JavaScript identifier or property access pattern`
        );
      }
    }
  }

  // Validate capture config values
  if (definition.captureConfig) {
    const { maxDepth, maxArrayLength, maxCaptureSize } = definition.captureConfig;

    if (maxDepth !== undefined && maxDepth < 0) {
      errors.push('maxDepth must be non-negative');
    }

    if (maxArrayLength !== undefined && maxArrayLength < 1) {
      errors.push('maxArrayLength must be at least 1');
    }

    if (maxCaptureSize !== undefined && maxCaptureSize < 1) {
      errors.push('maxCaptureSize must be at least 1');
    }
  }

  return errors;
}

/**
 * Helper function to define a trace injection configuration with full type safety and autocomplete
 *
 * This function provides better IDE autocomplete and type checking than using object literals directly.
 *
 * @example
 * ```typescript
 * const config = defineConfig({
 *   tracepoints: [
 *     {
 *       id: 'login-entry',
 *       type: 'entry',
 *       functionName: 'login',
 *       captureExpressions: ['username', 'password'], // Type-safe
 *       captureConfig: {
 *         maxDepth: 2,
 *         maxArrayLength: 50,
 *       }
 *     }
 *   ]
 * });
 * ```
 *
 * @param config - The trace injection configuration
 * @returns The validated configuration object
 * @throws If any tracepoint definition is invalid
 */
export function defineConfig(config: TraceInjectionConfig): TraceInjectionConfig {
  // Validate all tracepoints
  const allErrors: Array<{ tracepointId: string; errors: string[] }> = [];

  for (const tracepoint of config.tracepoints) {
    const errors = validateTracepointDefinition(tracepoint);
    if (errors.length > 0) {
      allErrors.push({
        tracepointId: tracepoint.id || 'unknown',
        errors,
      });
    }
  }

  if (allErrors.length > 0) {
    const errorMessages = allErrors
      .map(
        ({ tracepointId, errors: tpErrors }) =>
          `Tracepoint "${tracepointId}": ${tpErrors.join('; ')}`
      )
      .join('\n');

    throw new Error(
      `Invalid trace injection configuration:\n${errorMessages}`
    );
  }

  return config;
}

/**
 * Creates a type-safe tracepoint definition
 *
 * This is a helper to make creating individual tracepoint definitions easier with autocomplete
 *
 * @example
 * ```typescript
 * const tp = defineTracepoint({
 *   id: 'my-trace',
 *   type: 'entry',
 *   functionName: 'processData',
 *   captureExpressions: ['data', 'options']
 * });
 * ```
 *
 * @param definition - The tracepoint definition
 * @returns The validated tracepoint definition
 * @throws If the definition is invalid
 */
export function defineTracepoint(
  definition: TracepointDefinition
): TracepointDefinition {
  const errors = validateTracepointDefinition(definition);

  if (errors.length > 0) {
    throw new Error(
      `Invalid tracepoint "${definition.id}": ${errors.join('; ')}`
    );
  }

  return definition;
}

/**
 * Creates default parser configuration with TypeScript and JSX support
 *
 * @returns Default parser configuration
 */
export function defineParserConfig(overrides?: Partial<ParserConfig>): ParserConfig {
  return {
    isModule: true,
    isTypeScript: true,
    hasJSX: true,
    sourceMap: true,
    ...overrides,
  };
}

/**
 * Creates default capture configuration
 *
 * @returns Default capture configuration with sensible defaults
 */
export function defineCaptureConfig(overrides?: Partial<CaptureConfig>): CaptureConfig {
  return {
    maxDepth: 2,
    maxArrayLength: 100,
    maxCaptureSize: 10240,
    captureThis: true,
    sensitivePatterns: ['password', 'secret', 'token', 'key', 'auth'],
    redactionPlaceholder: '[REDACTED]',
    ...overrides,
  };
}

/**
 * Creates a type-safe trace injection configuration with default values
 *
 * @example
 * ```typescript
 * const config = defineConfigWithDefaults({
 *   tracepoints: [
 *     defineTracepoint({
 *       id: 'entry-point',
 *       type: 'entry',
 *       functionName: 'main',
 *       captureExpressions: ['args']
 *     })
 *   ]
 * });
 * ```
 *
 * @param baseConfig - Partial configuration to extend with defaults
 * @returns Complete configuration with defaults applied
 */
export function defineConfigWithDefaults(
  baseConfig: Partial<TraceInjectionConfig>
): TraceInjectionConfig {
  return defineConfig({
    parser: defineParserConfig(baseConfig.parser),
    capture: defineCaptureConfig(baseConfig.capture),
    tracepoints: baseConfig.tracepoints || [],
    ...baseConfig,
  });
}
