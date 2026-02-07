/**
 * Rollup Plugin Transform Logic
 *
 * Core transformation logic for injecting tracepoints into code
 */

import type { TransformContext, TransformResult } from './types.js';
import { matchesPattern } from './config.js';
import { isValidIdentifier, isInStringOrComment } from './utils.js';

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

  const patterns = nodeType === 'function' ? context.config.trace?.functions : context.config.trace?.classes;

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
 * Transform source code by injecting tracepoints
 *
 * @param code - Source code to transform
 * @param context - Transform context with config
 * @returns Transformation result
 */
export function transformCode(code: string, context: TransformContext): TransformResult {
  const errors: string[] = [];
  let injectionCount = 0;
  let modified = false;

  if (!context.config.enabled) {
    return {
      code,
      modified: false,
      injectionCount: 0,
      errors: [],
    };
  }

  try {
    // Split code into lines for processing
    const lines = code.split('\n');
    const transformedLines: string[] = [];

    // Regex patterns for detecting function and class declarations
    const functionPattern = /^\s*(async\s+)?function\s+(\w+)\s*\(/;
    const arrowFunctionPattern = /^\s*(const|let|var)\s+(\w+)\s*=\s*(async\s*)?\(/;
    const classPattern = /^\s*class\s+(\w+)\s*(\{|extends)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check if line is in a string or comment
      let lineStartPos = 0;
      for (let j = 0; j < i; j++) {
        lineStartPos += lines[j].length + 1; // +1 for newline
      }

      // Try to match function declarations
      const functionMatch = line.match(functionPattern);
      if (functionMatch && !isInStringOrComment(code, lineStartPos)) {
        const funcName = functionMatch[2];
        if (
          isValidIdentifier(funcName) &&
          shouldInstrumentPoint(context, funcName, 'function')
        ) {
          const pointId = createPointId(context.filename || 'unknown', lineNumber, 'function');
          const tracingCode = createTracingCall(pointId, lineNumber, 'entry', funcName);
          transformedLines.push(line);
          transformedLines.push(tracingCode);
          injectionCount++;
          modified = true;
          continue;
        }
      }

      // Try to match arrow function assignments
      const arrowMatch = line.match(arrowFunctionPattern);
      if (arrowMatch && !isInStringOrComment(code, lineStartPos)) {
        const funcName = arrowMatch[2];
        if (
          isValidIdentifier(funcName) &&
          shouldInstrumentPoint(context, funcName, 'function')
        ) {
          const pointId = createPointId(context.filename || 'unknown', lineNumber, 'function');
          const tracingCode = createTracingCall(pointId, lineNumber, 'entry', funcName);
          transformedLines.push(line);
          transformedLines.push(tracingCode);
          injectionCount++;
          modified = true;
          continue;
        }
      }

      // Try to match class declarations
      const classMatch = line.match(classPattern);
      if (classMatch && !isInStringOrComment(code, lineStartPos)) {
        const className = classMatch[1];
        if (
          isValidIdentifier(className) &&
          shouldInstrumentPoint(context, className, 'class')
        ) {
          const pointId = createPointId(context.filename || 'unknown', lineNumber, 'class');
          const tracingCode = createTracingCall(pointId, lineNumber, 'entry', className);
          transformedLines.push(line);
          transformedLines.push(tracingCode);
          injectionCount++;
          modified = true;
          continue;
        }
      }

      transformedLines.push(line);
    }

    const transformedCode = transformedLines.join('\n');

    return {
      code: transformedCode,
      modified,
      injectionCount,
      errors,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during transformation';
    errors.push(errorMessage);
    return {
      code,
      modified: false,
      injectionCount: 0,
      errors,
    };
  }
}

/**
 * Create a tracing function call
 *
 * @param pointId - Unique point identifier
 * @param lineNumber - Line number
 * @param type - Entry or exit point
 * @param name - Function/class name
 * @returns Tracing code string
 */
function createTracingCall(pointId: string, lineNumber: number, type: string, name: string): string {
  const sampling = 1.0; // Default to 100% sampling
  const indent = '  '; // Default 2-space indent
  return `${indent}__trace({ pointId: '${pointId}', line: ${lineNumber}, type: '${type}', name: '${name}', sampling: ${sampling} });`;
}

/**
 * Inject runtime code if needed
 *
 * @param code - Source code
 * @param _context - Transform context (unused but kept for API compatibility)
 * @returns Code with runtime injected if needed
 */
export function injectRuntime(code: string, _context: TransformContext): string {
  // Check if __trace is already defined or imported
  if (/__trace\s*=|import\s+.*__trace|from\s+['"]@trace-inject/.test(code)) {
    return code;
  }

  // Inject minimal runtime stub at the top
  const runtimeStub = `
// Trace injection runtime stub
const __trace = typeof globalThis !== 'undefined' && globalThis.__trace
  ? globalThis.__trace
  : function(data) {
      // Fallback trace handler
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[trace]', data);
      }
    };
`;

  return runtimeStub + '\n' + code;
}
