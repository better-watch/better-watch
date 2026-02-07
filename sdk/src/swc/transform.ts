/**
 * SWC Transform Plugin for TraceInject
 *
 * Provides an SWC transform plugin that integrates TraceInject into
 * the SWC compilation pipeline for build-time code instrumentation
 *
 * Usage in .swcrc:
 * {
 *   "jsc": {
 *     "experimental": {
 *       "plugins": [["@trace-inject/swc", {}]]
 *     }
 *   }
 * }
 */

import type { SWCPluginConfig, SWCVisitorContext } from './types.js';

/**
 * Create a call expression for trace injection
 * Creates: tracePoint({ id: 'FILE:LINE:COL', metadata: { ... } })
 *
 * Note: This creates a generic object structure that matches SWC's AST nodes
 */
function createTraceCall(
  fileId: string,
  line: number,
  col: number,
  pointType: 'entry' | 'exit' | 'line',
): unknown {
  return {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      value: '__traceInject_trace',
      span: { start: 0, end: 0, ctxt: 0 },
    },
    arguments: [
      {
        spread: null,
        expression: {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'KeyValueProperty',
              key: {
                type: 'Identifier',
                value: 'id',
                span: { start: 0, end: 0, ctxt: 0 },
              },
              value: {
                type: 'StringLiteral',
                value: `${fileId}:${line}:${col}`,
                span: { start: 0, end: 0, ctxt: 0 },
              },
              computed: false,
              span: { start: 0, end: 0, ctxt: 0 },
            },
            {
              type: 'KeyValueProperty',
              key: {
                type: 'Identifier',
                value: 'type',
                span: { start: 0, end: 0, ctxt: 0 },
              },
              value: {
                type: 'StringLiteral',
                value: pointType,
                span: { start: 0, end: 0, ctxt: 0 },
              },
              computed: false,
              span: { start: 0, end: 0, ctxt: 0 },
            },
            {
              type: 'KeyValueProperty',
              key: {
                type: 'Identifier',
                value: 'timestamp',
                span: { start: 0, end: 0, ctxt: 0 },
              },
              value: {
                type: 'NewExpression',
                callee: {
                  type: 'Identifier',
                  value: 'Date',
                  span: { start: 0, end: 0, ctxt: 0 },
                },
                arguments: [],
                span: { start: 0, end: 0, ctxt: 0 },
              },
              computed: false,
              span: { start: 0, end: 0, ctxt: 0 },
            },
          ],
          span: { start: 0, end: 0, ctxt: 0 },
        },
      },
    ],
    span: { start: 0, end: 0, ctxt: 0 },
  };
}

/**
 * Create an injection guard to prevent duplicate tracing
 * Creates: if (!__traceInject_guard('ID')) return;
 *
 * Note: This creates a generic object structure that matches SWC's AST nodes
 */
function createGuardStatement(pointId: string): unknown {
  return {
    type: 'IfStatement',
    test: {
      type: 'UnaryExpression',
      operator: '!',
      argument: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          value: '__traceInject_guard',
          span: { start: 0, end: 0, ctxt: 0 },
        },
        arguments: [
          {
            spread: null,
            expression: {
              type: 'StringLiteral',
              value: pointId,
              span: { start: 0, end: 0, ctxt: 0 },
            },
          },
        ],
        span: { start: 0, end: 0, ctxt: 0 },
      },
      span: { start: 0, end: 0, ctxt: 0 },
    },
    consequent: {
      type: 'BlockStatement',
      stmts: [
        {
          type: 'ReturnStatement',
          argument: null,
          span: { start: 0, end: 0, ctxt: 0 },
        },
      ],
      span: { start: 0, end: 0, ctxt: 0 },
    },
    alternate: null,
    span: { start: 0, end: 0, ctxt: 0 },
  };
}

/**
 * Transform a Program (ES Module) with trace injection
 */
export function transformProgram(
  program: unknown,
  config: SWCPluginConfig,
  filename: string = 'unknown',
): unknown {
  if (config.enabled === false) {
    return program;
  }

  const context: SWCVisitorContext = {
    filename,
    config,
    isTypescript: filename.endsWith('.ts') || filename.endsWith('.tsx'),
    injectedStatements: new Set(),
  };

  // For now, return the program as-is
  // The actual transformation logic would be implemented here
  // by visiting function declarations, class declarations, and block statements
  // and inserting trace calls at appropriate points
  //
  // This is a simplified implementation that provides the structure
  // for building a complete SWC plugin

  return program;
}

/**
 * Transform a Module (CommonJS) with trace injection
 */
export function transformModule(
  module: unknown,
  config: SWCPluginConfig,
  filename: string = 'unknown',
): unknown {
  if (config.enabled === false) {
    return module;
  }

  const context: SWCVisitorContext = {
    filename,
    config,
    isTypescript: filename.endsWith('.ts') || filename.endsWith('.tsx'),
    injectedStatements: new Set(),
  };

  // Similar transformation logic for CommonJS modules
  return module;
}

/**
 * Create injection point ID for deduplication
 */
export function createPointId(filename: string, line: number, col: number, type: string): string {
  return `${filename}:${line}:${col}:${type}`;
}

/**
 * Check if a point should be instrumented based on config
 */
export function shouldInstrumentPoint(
  filename: string,
  line: number,
  nodeType: string,
  config: SWCPluginConfig,
): boolean {
  // Check if specific lines are configured
  if (config.trace?.lines?.length) {
    return config.trace.lines.includes(line);
  }

  // Check if specific node types are configured
  if (nodeType === 'FunctionDeclaration' && config.trace?.functions?.length) {
    return true;
  }

  if (nodeType === 'ClassDeclaration' && config.trace?.classes?.length) {
    return true;
  }

  // Default: instrument all functions and classes
  return nodeType === 'FunctionDeclaration' || nodeType === 'ClassDeclaration';
}
