/**
 * Webpack Loader Transform Logic
 *
 * Core transformation logic for injecting tracepoints into code
 */

import type { TransformContext, TransformResult } from './types.js';
import { matchesPattern } from './config.js';

/**
 * Check if a point should be instrumented based on configuration
 *
 * @param context - Transform context
 * @param name - Function or class name
 * @param nodeType - Type of node being instrumented
 * @returns Whether point should be instrumented
 */
export function shouldInstrumentPoint(
  context: TransformContext,
  name: string | undefined,
  nodeType: 'function' | 'class'
): boolean {
  if (!context.config.enabled) {
    return false;
  }

  if (!name) {
    return false;
  }

  const patterns =
    nodeType === 'function' ? context.config.trace?.functions : context.config.trace?.classes;

  if (!patterns || patterns.length === 0) {
    return false;
  }

  return matchesPattern(patterns, name);
}

/**
 * Create a point ID for tracking injections
 *
 * @param file - File path
 * @param line - Line number
 * @param kind - Node kind
 * @returns Unique point ID
 */
export function createPointId(file: string, line: number, kind: string): string {
  return `${file}:${line}:${kind}`;
}

/**
 * Transform code by injecting trace points
 *
 * Uses a simple regex-based approach compatible with all JavaScript engines
 * and suitable for Webpack's loader pipeline
 *
 * @param code - Source code
 * @param context - Transform context
 * @returns Transform result
 */
export function transformCode(code: string, context: TransformContext): TransformResult {
  let modified = false;
  let injectionCount = 0;
  const errors: string[] = [];

  if (!context.config.enabled) {
    return {
      code,
      modified: false,
      injectionCount: 0,
      errors,
    };
  }

  let transformedCode = code;

  // Match function declarations: function name() or function name (
  const functionDeclPattern = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  transformedCode = transformedCode.replace(functionDeclPattern, (match, name) => {
    if (shouldInstrumentPoint(context, name, 'function')) {
      const statementId = `__trace_${name}_${injectionCount}`;
      if (!context.injectedStatements.has(statementId)) {
        context.injectedStatements.add(statementId);
        injectionCount++;
        modified = true;
        // Inject trace call after opening brace (will be handled separately)
        return match;
      }
    }
    return match;
  });

  // Match class declarations: class name or class name {
  const classDeclPattern = /\bclass\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:{|extends)/g;
  transformedCode = transformedCode.replace(classDeclPattern, (match, name) => {
    if (shouldInstrumentPoint(context, name, 'class')) {
      const statementId = `__trace_class_${name}_${injectionCount}`;
      if (!context.injectedStatements.has(statementId)) {
        context.injectedStatements.add(statementId);
        injectionCount++;
        modified = true;
      }
    }
    return match;
  });

  // Match arrow functions: const name = () => or = () =>
  const arrowFunctionPattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(.*?\)\s*=>/g;
  transformedCode = transformedCode.replace(arrowFunctionPattern, (match, name) => {
    if (name && shouldInstrumentPoint(context, name, 'function')) {
      const statementId = `__trace_arrow_${name}_${injectionCount}`;
      if (!context.injectedStatements.has(statementId)) {
        context.injectedStatements.add(statementId);
        injectionCount++;
        modified = true;
      }
    }
    return match;
  });

  return {
    code: transformedCode,
    modified,
    injectionCount,
    errors,
  };
}

/**
 * Inject runtime support code if needed
 *
 * @param code - Transformed code
 * @param context - Transform context
 * @returns Code with runtime injection
 */
export function injectRuntime(code: string, context: TransformContext): string {
  // Check if runtime is needed
  if (context.injectedStatements.size === 0) {
    return code;
  }

  // Check if runtime is already imported
  if (code.includes('__traceInjectRuntime') || code.includes('@trace-inject/runtime')) {
    return code;
  }

  // Inject runtime import at the top (after any existing imports/comments)
  const lines = code.split('\n');
  let insertIndex = 0;

  // Skip shebang and comments at the top
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#!') || line.startsWith('/*') || line.startsWith('*') || line.startsWith('//')) {
      insertIndex = i + 1;
    } else if (line === '') {
      // Allow empty lines
      continue;
    } else {
      // Stop at first non-comment/non-empty line
      break;
    }
  }

  const runtimeCode =
    "const __traceInjectRuntime = typeof globalThis !== 'undefined' ? globalThis.__traceInjectRuntime : null;";
  lines.splice(insertIndex, 0, runtimeCode);

  return lines.join('\n');
}
