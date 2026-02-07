/**
 * Webpack Loader Configuration Management
 *
 * Configuration validation, merging, and utility functions for the Webpack loader
 */

import type { WebpackLoaderConfig } from './types.js';

/**
 * Default configuration for Webpack loader
 */
export const DEFAULT_WEBPACK_CONFIG: WebpackLoaderConfig = {
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
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether configuration is valid
   */
  valid: boolean;
  /**
   * Validation errors
   */
  errors: string[];
}

/**
 * Validate Webpack loader configuration
 *
 * @param config - Configuration to validate
 * @returns Validation result
 */
export function validateWebpackConfig(config?: WebpackLoaderConfig): ValidationResult {
  const errors: string[] = [];

  if (!config) {
    return { valid: true, errors: [] };
  }

  if (typeof config.enabled !== 'undefined' && typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (config.trace) {
    if (config.trace.functions && !Array.isArray(config.trace.functions)) {
      errors.push('trace.functions must be an array');
    }
    if (config.trace.classes && !Array.isArray(config.trace.classes)) {
      errors.push('trace.classes must be an array');
    }
    if (config.trace.lines && !Array.isArray(config.trace.lines)) {
      errors.push('trace.lines must be an array');
    }
  }

  if (config.performance) {
    if (config.performance.samplingRate && typeof config.performance.samplingRate !== 'number') {
      errors.push('performance.samplingRate must be a number');
    }
    if (config.performance.samplingRate && (config.performance.samplingRate < 0 || config.performance.samplingRate > 1)) {
      errors.push('performance.samplingRate must be between 0 and 1');
    }
    if (config.performance.timeoutMs && typeof config.performance.timeoutMs !== 'number') {
      errors.push('performance.timeoutMs must be a number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge user configuration with defaults
 *
 * @param config - User configuration
 * @returns Merged configuration
 */
export function mergeConfig(config?: WebpackLoaderConfig): WebpackLoaderConfig {
  return {
    enabled: config?.enabled ?? DEFAULT_WEBPACK_CONFIG.enabled,
    trace: {
      functions: config?.trace?.functions ?? DEFAULT_WEBPACK_CONFIG.trace?.functions,
      classes: config?.trace?.classes ?? DEFAULT_WEBPACK_CONFIG.trace?.classes,
      lines: config?.trace?.lines ?? DEFAULT_WEBPACK_CONFIG.trace?.lines,
    },
    performance: {
      samplingRate: config?.performance?.samplingRate ?? DEFAULT_WEBPACK_CONFIG.performance?.samplingRate,
      timeoutMs: config?.performance?.timeoutMs ?? DEFAULT_WEBPACK_CONFIG.performance?.timeoutMs,
    },
  };
}

/**
 * Check if should sample trace based on sampling rate
 *
 * @param samplingRate - Sampling rate (0-1)
 * @returns Whether to sample
 */
export function shouldSampleTrace(samplingRate: number = 1.0): boolean {
  return Math.random() < samplingRate;
}

/**
 * Check if a string matches any pattern in the list
 *
 * @param patterns - Patterns to match against
 * @param str - String to check
 * @returns Whether string matches any pattern
 */
export function matchesPattern(patterns: string[], str: string): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => {
    // Handle wildcard pattern
    if (pattern === '*') {
      return true;
    }

    // Handle exact match
    if (pattern === str) {
      return true;
    }

    // Handle glob patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return regex.test(str);
    }

    return false;
  });
}
