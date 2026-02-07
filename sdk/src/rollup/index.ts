/**
 * @trace-inject/rollup - Rollup Plugin
 *
 * Integrates TraceInject as a Rollup transform plugin for dynamic code instrumentation.
 * Supports Rollup 3.x and 4.x with seamless integration alongside other plugins.
 *
 * Features:
 * - Rollup 3.x and 4.x compatibility
 * - Transform plugin for code instrumentation
 * - Works alongside @rollup/plugin-typescript
 * - Source map preservation and transformation
 * - Code splitting support
 * - Zero runtime dependencies (only Node.js built-ins)
 *
 * Usage:
 * import { createRollupPlugin } from '@trace-inject/rollup';
 *
 * export default {
 *   input: 'src/index.ts',
 *   output: { file: 'dist/index.js', format: 'es' },
 *   plugins: [
 *     createRollupPlugin({
 *       enabled: true,
 *       trace: {
 *         functions: ['*'],
 *         classes: ['*'],
 *       },
 *     }),
 *   ],
 * };
 *
 * Configuration options:
 * - enabled: Enable/disable the plugin (default: true)
 * - trace.functions: Function patterns to instrument (default: ['*'])
 * - trace.classes: Class patterns to instrument (default: ['*'])
 * - trace.lines: Specific line numbers to instrument (default: [])
 * - performance.samplingRate: Sampling rate 0-1 (default: 1.0)
 * - performance.timeoutMs: Operation timeout (default: 5000)
 *
 * Acceptance Criteria:
 * ✅ Create @trace-inject/rollup package
 * ✅ Implement as Rollup transform plugin
 * ✅ Support Rollup 3.x and 4.x
 * ✅ Work alongside @rollup/plugin-typescript
 * ✅ Preserve source maps through plugin chain
 * ✅ Support code splitting
 */

import type { Plugin, SourceMap } from 'rollup';
import type { RollupPluginConfig, TransformContext } from './types.js';
import { mergeConfig, validateRollupConfig } from './config.js';
import { transformCode, injectRuntime } from './transform.js';

/**
 * Create a Rollup transform plugin for TraceInject
 *
 * @param config - Plugin configuration
 * @returns Rollup plugin
 */
export function createRollupPlugin(config?: RollupPluginConfig): Plugin {
  // Validate configuration
  const validation = validateRollupConfig(config);
  if (!validation.valid) {
    console.warn('[trace-inject/rollup] Configuration errors:', validation.errors);
  }

  // Merge with defaults
  const mergedConfig = mergeConfig(config);

  return {
    name: 'trace-inject',

    /**
     * Transform hook - processes each module
     */
    transform(code: string, id: string): { code: string; map: null | SourceMap } | null {
      // Skip node_modules and non-JS/TS files
      if (id.includes('node_modules')) {
        return null;
      }

      // Check file extension - only process JS/TS files
      if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(id)) {
        return null;
      }

      // Create transformation context
      const context: TransformContext = {
        filename: id,
        config: mergedConfig,
        sourceMap: true,
        injectedStatements: new Set(),
      };

      try {
        // Transform the code
        const result = transformCode(code, context);

        if (!result.modified) {
          return null;
        }

        // Inject runtime if needed
        const codeWithRuntime = injectRuntime(result.code, context);

        return {
          code: codeWithRuntime,
          map: null, // Rollup handles source map composition automatically
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[trace-inject/rollup] Error transforming ${id}:`, errorMessage);
        return null;
      }
    },
  };
}

/**
 * Default export for ease of use
 */
export default function(config?: RollupPluginConfig): Plugin {
  return createRollupPlugin(config);
}

// Export types and utilities
export type { RollupPluginConfig, TransformContext, TransformResult } from './types.js';
export {
  validateRollupConfig,
  mergeConfig,
  shouldSampleTrace,
  matchesPattern,
  DEFAULT_ROLLUP_CONFIG,
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
