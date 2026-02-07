/**
 * SWC Plugin Type Definitions
 *
 * Types for the SWC transform plugin configuration and visitor
 */

// Note: @swc/core types are provided by the SWC compiler at runtime
// These are generic AST node types that match the @swc/core structure

/**
 * SWC Plugin configuration options
 */
export interface SWCPluginConfig {
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
 * SWC visitor context for transformation state
 */
export interface SWCVisitorContext {
  /**
   * Current file being processed
   */
  filename?: string;

  /**
   * Plugin configuration
   */
  config: SWCPluginConfig;

  /**
   * Whether TypeScript is enabled
   */
  isTypescript: boolean;

  /**
   * Track injected statements for deduplication
   */
  injectedStatements: Set<string>;
}

/**
 * Result of SWC transformation
 */
export interface SWCTransformResult {
  /**
   * Transformed AST
   */
  ast: unknown; // Program | Module from @swc/core

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
