/**
 * Vite Plugin Type Definitions
 *
 * Types for the Vite transform plugin configuration and context
 */

/**
 * Vite transform plugin configuration options
 */
export interface VitePluginConfig {
  /**
   * Enable/disable the plugin
   */
  enabled?: boolean;

  /**
   * Trace configuration options
   */
  trace?: {
    /**
     * Functions to instrument (patterns)
     */
    functions?: string[];
    /**
     * Classes to instrument (patterns)
     */
    classes?: string[];
    /**
     * Line numbers to instrument
     */
    lines?: number[];
  };

  /**
   * Performance configuration
   */
  performance?: {
    /**
     * Sampling rate (0-1)
     */
    samplingRate?: number;
    /**
     * Timeout in milliseconds
     */
    timeoutMs?: number;
  };
}

/**
 * Context passed to transform function
 */
export interface TransformContext {
  /**
   * Current file path
   */
  filename?: string;

  /**
   * Plugin configuration
   */
  config: VitePluginConfig;

  /**
   * Track injected statements for deduplication
   */
  injectedStatements: Set<string>;

  /**
   * Whether source maps are enabled
   */
  sourceMap: boolean;
}

/**
 * Result of Vite transformation
 */
export interface TransformResult {
  /**
   * Transformed source code
   */
  code: string;

  /**
   * Source map (if enabled)
   */
  map?: Record<string, unknown> | null;

  /**
   * Whether transformation was applied
   */
  modified: boolean;

  /**
   * Number of injection points found
   */
  injectionCount: number;

  /**
   * Any errors encountered during transformation
   */
  errors: string[];
}
