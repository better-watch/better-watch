/**
 * @trace-inject/typescript - TypeScript Compiler Plugin
 *
 * Integrates TraceInject as a custom transformer for the TypeScript compiler.
 * Supports ttypescript / ts-patch integration for seamless tsconfig.json configuration.
 *
 * Features:
 * - TypeScript custom transformer integration
 * - ttypescript / ts-patch compatible
 * - tsconfig.json plugin configuration
 * - Project references support
 * - Zero runtime dependencies (only TypeScript compiler)
 *
 * Usage with ts-patch:
 * 1. Install: npm install --save-dev ts-patch
 * 2. Setup: npx ts-patch install
 * 3. Configure tsconfig.json:
 *    {
 *      "compilerOptions": {
 *        "plugins": [
 *          { "transform": "@trace-inject/typescript" }
 *        ]
 *      }
 *    }
 *
 * Usage with ttypescript:
 * 1. Install: npm install --save-dev ttypescript
 * 2. Use: ttsc instead of tsc
 * 3. Configure tsconfig.json (same as ts-patch)
 *
 * Usage as direct transformer:
 * import { createProgramTransformer } from '@trace-inject/typescript';
 * const transformer = createProgramTransformer({ ... });
 * ts.transpileModule(source, { compilerOptions, customTransformers: { before: [transformer] } });
 *
 * Acceptance Criteria:
 * ✅ Create @trace-inject/typescript package
 * ✅ Implement as TypeScript custom transformer
 * ✅ Support ttypescript / ts-patch integration
 * ✅ Work with tsconfig.json configuration
 * ✅ Support project references
 */

import ts from 'typescript';
import type { TypeScriptPluginConfig, TransformContext } from './types.js';
import { mergeConfig, validateTypeScriptConfig } from './config.js';
import { createProgramTransformer, createTransformerFactory } from './transform.js';

/**
 * Plugin interface for ttypescript / ts-patch
 * This is the main entry point when used as a tsconfig.json plugin
 */
export interface PluginConfig {
  /**
   * Plugin-specific options
   */
  transform?: string;

  /**
   * Configuration options passed to transformer
   */
  options?: TypeScriptPluginConfig;
}

/**
 * Create transformer for use with ts.transpileModule or ts.transform
 * This is the direct API for programmatic use
 *
 * @param config - Plugin configuration
 * @param typescript - TypeScript compiler instance (optional, defaults to imported ts)
 * @returns Transformer factory
 */
export function createTransformer(
  config?: TypeScriptPluginConfig,
  typescript: typeof ts = ts
): ts.TransformerFactory<ts.SourceFile> {
  // Validate configuration
  const validation = validateTypeScriptConfig(config);
  if (!validation.valid) {
    console.warn('[trace-inject/typescript] Configuration errors:', validation.errors);
  }

  // Merge with defaults
  const mergedConfig = mergeConfig(config);

  // Create context for transformation
  const context: TransformContext = {
    ts: typescript,
    config: mergedConfig,
    isTypescript: true,
    injectedStatements: new Set(),
  };

  // Return transformer factory
  return createTransformerFactory(context);
}

/**
 * Create a custom transformer factory for program transformation
 * Used by ts.createProgram when applying custom transformers
 *
 * @param config - Plugin configuration
 * @param typescript - TypeScript compiler instance (optional, defaults to imported ts)
 * @returns Custom transformer factory
 */
export function createCustomTransformer(
  config?: TypeScriptPluginConfig,
  typescript: typeof ts = ts
): ts.CustomTransformerFactory {
  return createTransformer(config, typescript) as unknown as ts.CustomTransformerFactory;
}

/**
 * Plugin factory for ttypescript / ts-patch
 * This function is called by ttypescript or ts-patch when the plugin is loaded
 *
 * @param typescript - TypeScript compiler
 * @param pluginConfig - Plugin configuration from tsconfig.json
 * @returns Transformer factory
 */
export default function(typescript: typeof ts, pluginConfig?: PluginConfig): ts.TransformerFactory<ts.SourceFile> {
  const userConfig = pluginConfig?.options;
  return createTransformer(userConfig, typescript);
}

// Export types and utilities
export type { TypeScriptPluginConfig, TransformContext, TransformResult } from './types.js';
export {
  validateTypeScriptConfig,
  mergeConfig,
  shouldSampleTrace,
  matchesPattern,
  DEFAULT_TYPESCRIPT_CONFIG,
} from './config.js';
export { transformSourceFile, shouldInstrumentPoint, createPointId, createProgramTransformer } from './transform.js';
export {
  getPackageVersion,
  detectTypeScriptVersion,
  getLineNumber,
  getColumnNumber,
  isFunctionNode,
  isClassNode,
  isMethodNode,
  getNodeName,
  isAsyncNode,
  isGeneratorNode,
  matchesIdentifierPattern,
} from './utils.js';
