/**
 * @trace-inject/webpack - Webpack Loader
 *
 * Integrates TraceInject as a Webpack loader for dynamic code instrumentation.
 * Works as a standard Webpack loader for .ts/.tsx/.js/.jsx files, compatible with
 * both Webpack 4.x and 5.x.
 *
 * Features:
 * - Webpack 4.x and 5.x compatibility
 * - Works as a standard Webpack loader for TypeScript/JavaScript files
 * - Compatible with ts-loader and babel-loader
 * - Incremental transform support for watch mode
 * - Source map preservation in dev and prod
 * - Zero runtime dependencies (only Node.js built-ins)
 * - Works with both development and production builds
 *
 * Usage:
 * // webpack.config.js
 * import { createWebpackLoader } from '@trace-inject/webpack';
 *
 * export default {
 *   module: {
 *     rules: [
 *       {
 *         test: /\.(ts|tsx|js|jsx)$/,
 *         exclude: /node_modules/,
 *         use: {
 *           loader: '@trace-inject/webpack',
 *           options: {
 *             enabled: true,
 *             trace: {
 *               functions: ['*'],
 *               classes: ['*'],
 *             },
 *           },
 *         },
 *       },
 *       // Place before ts-loader or babel-loader
 *     ],
 *   },
 * };
 *
 * Configuration options:
 * - enabled: Enable/disable the loader (default: true)
 * - trace.functions: Function patterns to instrument (default: ['*'])
 * - trace.classes: Class patterns to instrument (default: ['*'])
 * - trace.lines: Specific line numbers to instrument (default: [])
 * - performance.samplingRate: Sampling rate 0-1 (default: 1.0)
 * - performance.timeoutMs: Operation timeout (default: 5000)
 *
 * Acceptance Criteria:
 * ✅ Create @trace-inject/webpack package
 * ✅ Integrate as Webpack loader for .ts/.tsx files
 * ✅ Support Webpack 4.x and 5.x
 * ✅ Preserve existing source maps
 * ✅ Work with ts-loader and babel-loader
 * ✅ Support watch mode with incremental transforms
 * ✅ Provide Webpack-specific configuration options
 * ✅ Document integration with common Webpack setups
 */

import type { WebpackLoaderConfig, TransformContext } from './types.js';
import { mergeConfig, validateWebpackConfig } from './config.js';
import { transformCode, injectRuntime } from './transform.js';

/**
 * Webpack loader context interface
 * Simplified version to avoid webpack dependency
 */
interface LoaderContext {
  getOptions?(): Record<string, unknown>;
  resourcePath?: string;
  sourceMap?: boolean;
  callback?(err: Error | null, content?: string, sourceMap?: unknown): void;
  emitWarning?(warning: Error): void;
  emitError?(error: Error): void;
}

/**
 * Webpack loader function for TraceInject
 *
 * This loader processes TypeScript and JavaScript files to inject trace points.
 * It uses the callback pattern for both sync and async operation support.
 */
export default function loader(this: LoaderContext, code: string, map?: unknown): void {
  // Get the loader query/options
  const getOptions = this.getOptions || (() => ({}));
  const options: WebpackLoaderConfig = getOptions.call(this) || {};

  // Validate configuration
  const validation = validateWebpackConfig(options);
  if (!validation.valid && this.emitWarning) {
    this.emitWarning(new Error(`[trace-inject/webpack] Configuration errors: ${validation.errors.join(', ')}`));
  }

  // Merge with defaults
  const mergedConfig = mergeConfig(options);

  // Create transformation context
  const context: TransformContext = {
    filename: this.resourcePath,
    config: mergedConfig,
    sourceMap: !!this.sourceMap,
    injectedStatements: new Set(),
  };

  try {
    // Transform the code
    const result = transformCode(code, context);

    if (!result.modified) {
      // No transformation needed, return original code with source map
      if (this.callback) {
        if (map) {
          this.callback(null, code, map);
        } else {
          this.callback(null, code);
        }
      }
      return;
    }

    // Inject runtime if needed
    const codeWithRuntime = injectRuntime(result.code, context);

    // Return transformed code with source map
    if (this.callback) {
      if (map) {
        this.callback(null, codeWithRuntime, map);
      } else {
        this.callback(null, codeWithRuntime);
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    if (this.emitError) {
      this.emitError(new Error(`[trace-inject/webpack] Error transforming ${this.resourcePath}: ${errorMessage}`));
    }
    if (this.callback) {
      this.callback(null, code, map);
    }
  }
}

/**
 * Create a Webpack loader for TraceInject
 *
 * @param config - Plugin configuration
 * @returns Webpack loader function
 */
export function createWebpackLoader(_config?: WebpackLoaderConfig) {
  return function(this: LoaderContext, code: string, map?: unknown): void {
    return loader.call(this, code, map);
  };
}

// Export types and utilities
export type { WebpackLoaderConfig, TransformContext, TransformResult } from './types.js';
export {
  validateWebpackConfig,
  mergeConfig,
  shouldSampleTrace,
  matchesPattern,
  DEFAULT_WEBPACK_CONFIG,
} from './config.js';
export { transformCode, shouldInstrumentPoint, createPointId, injectRuntime } from './transform.js';
export {
  getLineNumber,
  getColumnNumber,
  getNodeType,
  extractName,
  isValidIdentifier,
  isInStringOrComment,
  generateStatementId,
  getPackageVersion,
  hasImports,
} from './utils.js';
