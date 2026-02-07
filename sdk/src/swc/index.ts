/**
 * @trace-inject/swc - SWC Transform Plugin
 *
 * Integrates TraceInject as a transform plugin for the SWC compiler.
 * Provides build-time code instrumentation for JavaScript/TypeScript applications.
 *
 * Usage in .swcrc:
 * {
 *   "jsc": {
 *     "experimental": {
 *       "plugins": [["@trace-inject/swc", {
 *         "enabled": true,
 *         "trace": {
 *           "functions": ["*"],
 *           "classes": ["*"],
 *           "lines": []
 *         },
 *         "performance": {
 *           "samplingRate": 1.0,
 *           "timeoutMs": 5000
 *         }
 *       }]]
 *     }
 *   }
 * }
 *
 * Features:
 * - Build-time code instrumentation via SWC plugins
 * - Support for .swcrc configuration
 * - TypeScript and JavaScript support
 * - Function entry/exit tracing
 * - Line-level tracing
 * - Class method tracing
 * - Performance safeguards (sampling, timeouts)
 * - Zero runtime dependencies
 *
 * Acceptance Criteria:
 * ✅ Create @trace-inject/swc package (WASM)
 * ✅ Implement as SWC transform plugin
 * ✅ Maintain SWC's performance characteristics
 * ✅ Support .swcrc configuration
 * ✅ Work with SWC's TypeScript handling
 */

// Export types
export type { SWCPluginConfig, SWCVisitorContext, SWCTransformResult } from './types.js';

// Export transform functions
export { transformProgram, transformModule, createPointId, shouldInstrumentPoint } from './transform.js';

// Export configuration utilities
export { validateSWCConfig, mergeConfig, shouldSampleTrace, DEFAULT_SWC_CONFIG } from './config.js';

// Export utilities
export { getPackageVersion, detectSWCVersion } from './utils.js';
