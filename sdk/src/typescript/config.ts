/**
 * TypeScript Compiler Plugin Configuration
 *
 * Handles configuration parsing, validation, and defaults
 */

import type { TypeScriptPluginConfig } from './types.js';

/**
 * Default configuration for TypeScript compiler plugin
 */
export const DEFAULT_TYPESCRIPT_CONFIG: TypeScriptPluginConfig = {
  enabled: true,
  trace: {
    functions: ['*'],
    classes: ['*'],
    lines: [],
  },
  performance: {
    samplingRate: 1.0,
    timeoutMs: 5000,
  },
};

/**
 * Validate TypeScript plugin configuration
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors if any
 */
export function validateTypeScriptConfig(config: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: errors.length === 0, errors };
  }

  const cfg = config as Record<string, unknown>;

  // Validate enabled flag
  if (cfg.enabled !== undefined && typeof cfg.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  // Validate trace configuration
  if (cfg.trace !== undefined) {
    if (typeof cfg.trace !== 'object' || cfg.trace === null) {
      errors.push('trace must be an object');
    } else {
      const trace = cfg.trace as Record<string, unknown>;

      if (trace.functions !== undefined && !Array.isArray(trace.functions)) {
        errors.push('trace.functions must be an array');
      }

      if (trace.classes !== undefined && !Array.isArray(trace.classes)) {
        errors.push('trace.classes must be an array');
      }

      if (trace.lines !== undefined) {
        if (!Array.isArray(trace.lines)) {
          errors.push('trace.lines must be an array');
        } else if (!trace.lines.every((line) => typeof line === 'number')) {
          errors.push('trace.lines must contain only numbers');
        }
      }
    }
  }

  // Validate performance configuration
  if (cfg.performance !== undefined) {
    if (typeof cfg.performance !== 'object' || cfg.performance === null) {
      errors.push('performance must be an object');
    } else {
      const perf = cfg.performance as Record<string, unknown>;

      if (perf.samplingRate !== undefined) {
        if (typeof perf.samplingRate !== 'number') {
          errors.push('performance.samplingRate must be a number');
        } else if (perf.samplingRate < 0 || perf.samplingRate > 1) {
          errors.push('performance.samplingRate must be between 0 and 1');
        }
      }

      if (perf.timeoutMs !== undefined) {
        if (typeof perf.timeoutMs !== 'number') {
          errors.push('performance.timeoutMs must be a number');
        } else if (perf.timeoutMs < 0) {
          errors.push('performance.timeoutMs must be non-negative');
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Merge configuration with defaults
 *
 * @param config - User-provided configuration
 * @returns Merged configuration
 */
export function mergeConfig(config?: TypeScriptPluginConfig): TypeScriptPluginConfig {
  return {
    enabled:
      config?.enabled !== undefined ? config.enabled : DEFAULT_TYPESCRIPT_CONFIG.enabled,
    trace: {
      functions:
        config?.trace?.functions !== undefined
          ? config.trace.functions
          : DEFAULT_TYPESCRIPT_CONFIG.trace?.functions || [],
      classes:
        config?.trace?.classes !== undefined
          ? config.trace.classes
          : DEFAULT_TYPESCRIPT_CONFIG.trace?.classes || [],
      lines:
        config?.trace?.lines !== undefined
          ? config.trace.lines
          : DEFAULT_TYPESCRIPT_CONFIG.trace?.lines || [],
    },
    performance: {
      samplingRate:
        config?.performance?.samplingRate !== undefined
          ? config.performance.samplingRate
          : DEFAULT_TYPESCRIPT_CONFIG.performance?.samplingRate || 1.0,
      timeoutMs:
        config?.performance?.timeoutMs !== undefined
          ? config.performance.timeoutMs
          : DEFAULT_TYPESCRIPT_CONFIG.performance?.timeoutMs || 5000,
    },
  };
}

/**
 * Determine if a trace should be sampled based on sampling rate
 *
 * @param samplingRate - Sampling rate (0-1)
 * @returns Whether trace should be sampled
 */
export function shouldSampleTrace(samplingRate: number): boolean {
  if (samplingRate < 0 || samplingRate > 1) {
    return true;
  }
  if (samplingRate === 1) {
    return true;
  }
  if (samplingRate === 0) {
    return false;
  }
  return Math.random() < samplingRate;
}

/**
 * Pattern matching function for function/class names
 *
 * @param patterns - Patterns to match against
 * @param name - Name to check
 * @returns Whether name matches any pattern
 */
export function matchesPattern(patterns: string[], name: string): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => {
    if (pattern === '*') {
      return true;
    }
    // Simple glob pattern support
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(name);
    }
    return pattern === name;
  });
}
