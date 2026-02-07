/**
 * SWC Plugin Configuration Handling
 *
 * Provides configuration parsing, validation, and default values
 * for the SWC TraceInject plugin
 */

import type { SWCPluginConfig } from './types.js';

/**
 * Default SWC plugin configuration
 */
export const DEFAULT_SWC_CONFIG: SWCPluginConfig = {
  enabled: true,
  trace: {
    functions: [],
    classes: [],
    lines: [],
  },
  performance: {
    samplingRate: 1.0,
    timeoutMs: 5000,
  },
};

/**
 * Validate SWC plugin configuration
 */
export function validateSWCConfig(config: unknown): SWCPluginConfig {
  // If config is undefined or null, use defaults
  if (!config || typeof config !== 'object') {
    return DEFAULT_SWC_CONFIG;
  }

  const cfg = config as Record<string, unknown>;
  const traceObj = cfg.trace as Record<string, unknown> | undefined;
  const perfObj = cfg.performance as Record<string, unknown> | undefined;

  // Validate enabled flag
  const enabled = cfg.enabled !== false;

  // Validate trace configuration
  const trace = {
    functions: Array.isArray(traceObj?.functions) ? (traceObj.functions as string[]) : [],
    classes: Array.isArray(traceObj?.classes) ? (traceObj.classes as string[]) : [],
    lines: Array.isArray(traceObj?.lines)
      ? (traceObj.lines as unknown[]).filter((l) => typeof l === 'number')
      : [],
  };

  // Validate performance configuration
  const performance = {
    samplingRate: typeof perfObj?.samplingRate === 'number'
      ? Math.max(0, Math.min(1, perfObj.samplingRate))
      : DEFAULT_SWC_CONFIG.performance!.samplingRate,
    timeoutMs: typeof perfObj?.timeoutMs === 'number'
      ? Math.max(100, perfObj.timeoutMs)
      : DEFAULT_SWC_CONFIG.performance!.timeoutMs,
  };

  return {
    enabled,
    trace,
    performance,
  };
}

/**
 * Merge configuration with defaults
 */
export function mergeConfig(userConfig: unknown, defaults: SWCPluginConfig = DEFAULT_SWC_CONFIG): SWCPluginConfig {
  const validated = validateSWCConfig(userConfig);
  return {
    enabled: validated.enabled,
    trace: {
      functions: validated.trace?.functions || defaults.trace?.functions || [],
      classes: validated.trace?.classes || defaults.trace?.classes || [],
      lines: validated.trace?.lines || defaults.trace?.lines || [],
    },
    performance: {
      samplingRate: validated.performance?.samplingRate ?? defaults.performance?.samplingRate ?? 1.0,
      timeoutMs: validated.performance?.timeoutMs ?? defaults.performance?.timeoutMs ?? 5000,
    },
  };
}

/**
 * Check if a sampling decision should allow trace
 */
export function shouldSampleTrace(samplingRate: number): boolean {
  if (samplingRate >= 1.0) {
    return true;
  }
  if (samplingRate <= 0) {
    return false;
  }
  return Math.random() < samplingRate;
}
