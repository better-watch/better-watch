/**
 * TypeScript Compiler Plugin Type Definitions
 *
 * Types for the TypeScript transformer plugin configuration and context
 */

import ts from 'typescript';

/**
 * TypeScript transformer plugin configuration options
 */
export interface TypeScriptPluginConfig {
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
 * Context passed to transformer factory
 */
export interface TransformContext {
  /**
   * TypeScript compiler
   */
  ts: typeof ts;

  /**
   * Current file path
   */
  filename?: string;

  /**
   * Plugin configuration
   */
  config: TypeScriptPluginConfig;

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
 * Result of TypeScript transformation
 */
export interface TransformResult {
  /**
   * Transformed source file
   */
  sourceFile: ts.SourceFile;

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

/**
 * Diagnostic context for tracking transformation diagnostics
 */
export interface DiagnosticContext {
  filename?: string;
  line?: number;
  column?: number;
  message: string;
  category: ts.DiagnosticCategory;
}
