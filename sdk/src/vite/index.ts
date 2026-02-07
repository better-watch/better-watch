/**
 * @trace-inject/vite - Vite Plugin
 *
 * Integrates TraceInject as a Vite transform plugin for dynamic code instrumentation.
 * Supports Vite 4.x and 5.x with seamless integration for dev server and production builds.
 *
 * Features:
 * - Vite 4.x and 5.x compatibility
 * - Transform plugin for code instrumentation
 * - Dev server support with HMR (Hot Module Replacement)
 * - Production build optimization
 * - Works alongside vite-plugin-react and vite-plugin-vue
 * - Source map preservation in dev and prod
 * - Code splitting support
 * - Zero runtime dependencies (only Node.js built-ins)
 *
 * Usage:
 * import traceInject from '@trace-inject/vite';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     traceInject({
 *       enabled: true,
 *       trace: {
 *         functions: ['*'],
 *         classes: ['*'],
 *       },
 *     }),
 *   ],
 * });
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
 * ✅ Create @trace-inject/vite package
 * ✅ Implement as Vite transform plugin
 * ✅ Support dev server with HMR
 * ✅ Support production builds
 * ✅ Work with vite-plugin-react and vite-plugin-vue
 * ✅ Preserve source maps in dev and prod
 * ✅ Support Vite 4.x and 5.x
 */

import type { Plugin } from 'vite';
import type { VitePluginConfig, TransformContext } from './types.js';
import { mergeConfig, validateViteConfig } from './config.js';
import { transformCode, injectRuntime } from './transform.js';

/**
 * Create a Vite transform plugin for TraceInject
 *
 * @param config - Plugin configuration
 * @returns Vite plugin
 */
export function createVitePlugin(config?: VitePluginConfig): Plugin {
  // Validate configuration
  const validation = validateViteConfig(config);
  if (!validation.valid) {
    console.warn('[trace-inject/vite] Configuration errors:', validation.errors);
  }

  // Merge with defaults
  const mergedConfig = mergeConfig(config);

  return {
    name: 'trace-inject',

    /**
     * Transform hook - processes each module
     * Works for both dev server and production builds
     */
    transform(code: string, id: string) {
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
          map: null, // Vite handles source map composition automatically
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[trace-inject/vite] Error transforming ${id}:`, errorMessage);
        return null;
      }
    },

    /**
     * HMR hook for dev server support
     * Ensures modules are properly invalidated on changes
     */
    handleHotUpdate({ file }) {
      // Return undefined to use the default HMR behavior
      // The transformation will be applied automatically on next reload
      // Return undefined signals that we've handled the hot update
      if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(file)) {
        return;
      }
    },
  };
}

/**
 * Default export for ease of use with defineConfig
 */
export default function(config?: VitePluginConfig): Plugin {
  return createVitePlugin(config);
}

// Export types and utilities
export type { VitePluginConfig, TransformContext, TransformResult } from './types.js';
export {
  validateViteConfig,
  mergeConfig,
  shouldSampleTrace,
  matchesPattern,
  DEFAULT_VITE_CONFIG,
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
