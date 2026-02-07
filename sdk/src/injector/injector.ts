/**
 * Tracepoint injection system for transforming source code
 * Supports injection before/after lines and at function entry/exit points
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
import * as t from '@babel/types';
import type { File } from '@babel/types';
import { parseSourceCode } from '../parser/index.js';
import type {
  TracepointConfig,
  InjectionResult,
  PerformedInjection,
  InjectionError,
  SourceMapMetadata,
} from './types.js';

// Type aliases for compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Path = any;

/**
 * Tracepoint Injector class for transforming source code with trace injections
 */
export class TracepointInjector {
  /**
   * Inject tracepoints into source code
   *
   * @param sourceCode - The source code to transform
   * @param configs - Array of injection configurations
   * @param options - Additional options for injection
   * @returns The transformed code with source maps
   */
  public inject(
    sourceCode: string,
    configs: TracepointConfig[],
    options: { filename?: string; preserveSourceMap?: boolean } = {}
  ): InjectionResult {
    const errors: InjectionError[] = [];
    const injections: PerformedInjection[] = [];
    const sourceMapMetadata: SourceMapMetadata[] = [];

    // Parse the source code
    const parseResult = parseSourceCode(sourceCode, {
      filename: options.filename,
      sourceMap: true,
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`Failed to parse source code: ${parseResult.errors[0]?.message}`);
    }

    const ast = parseResult.ast;

    // Process each injection configuration
    for (const config of configs) {
      try {
        switch (config.type) {
          case 'before':
            this.injectBefore(ast, sourceCode, config, injections, sourceMapMetadata, errors);
            break;
          case 'after':
            this.injectAfter(ast, sourceCode, config, injections, sourceMapMetadata, errors);
            break;
          case 'entry':
            this.injectAtEntry(ast, sourceCode, config, injections, sourceMapMetadata, errors);
            break;
          case 'exit':
            this.injectAtExit(ast, sourceCode, config, injections, sourceMapMetadata, errors);
            break;
        }
      } catch (err) {
        errors.push({
          config,
          message: err instanceof Error ? err.message : 'Unknown error',
          code: 'INJECTION_FAILED',
        });
      }
    }

    // Generate new source code
    const generated = generate(ast, {
      sourceMap: options.preserveSourceMap !== false,
      sourceFileName: options.filename || 'unknown.ts',
    }) as any;

    const newSourceCode = generated.code;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let newSourceMap: any | undefined = undefined;

    // Extract source map from generator result
    if (options.preserveSourceMap !== false && generated.map) {
      newSourceMap = typeof generated.map === 'string' ? JSON.parse(generated.map) : generated.map;
    }

    // If we have source map metadata, enhance the generated source map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let enhancedSourceMap: any | undefined = newSourceMap;
    if (enhancedSourceMap && sourceMapMetadata.length > 0) {
      enhancedSourceMap = this.enhanceSourceMap(enhancedSourceMap, sourceMapMetadata);
    }

    return {
      code: newSourceCode,
      sourceMap: enhancedSourceMap,
      injections,
      errors,
    };
  }

  /**
   * Inject code before a specified line number
   */
  private injectBefore(
    ast: File,
    sourceCode: string,
    config: TracepointConfig,
    injections: PerformedInjection[],
    sourceMapMetadata: SourceMapMetadata[],
    errors: InjectionError[]
  ): void {
    if (config.lineNumber === undefined) {
      errors.push({
        config,
        message: 'lineNumber is required for before injection',
        code: 'MISSING_LINE_NUMBER',
      });
      return;
    }

    const lineToInsertBefore = config.lineNumber;
    const lines = sourceCode.split('\n');

    if (lineToInsertBefore < 1 || lineToInsertBefore > lines.length) {
      errors.push({
        config,
        message: `Line number ${lineToInsertBefore} is out of range (1-${lines.length})`,
        code: 'LINE_OUT_OF_RANGE',
        lineNumber: lineToInsertBefore,
      });
      return;
    }

    let injectionFound = false;

    // Find the statement at or near the specified line
    traverse(ast, {
      Statement: (path: Path) => {
        if (injectionFound) return;

        const node = path.node;
        if (!node.loc) return;

        // Check if this node starts at the target line
        if (node.loc.start.line === lineToInsertBefore) {
          const injectedStatement = this.createTraceStatement(config.code);

          // Insert before this statement
          path.insertBefore(injectedStatement);

          injections.push({
            config,
            originalLine: lineToInsertBefore,
            injectedLines: [lineToInsertBefore],
            injectedCode: `__trace__("${config.code.replace(/"/g, '\\"')}")`,
            context: {
              nodeType: node.type,
            },
          });

          injectionFound = true;
          path.stop();
        }
      },
    });

    if (!injectionFound) {
      errors.push({
        config,
        message: `Could not find statement at line ${lineToInsertBefore}`,
        code: 'NO_STATEMENT_FOUND',
        lineNumber: lineToInsertBefore,
      });
    }
  }

  /**
   * Inject code after a specified line number
   */
  private injectAfter(
    ast: File,
    sourceCode: string,
    config: TracepointConfig,
    injections: PerformedInjection[],
    sourceMapMetadata: SourceMapMetadata[],
    errors: InjectionError[]
  ): void {
    if (config.lineNumber === undefined) {
      errors.push({
        config,
        message: 'lineNumber is required for after injection',
        code: 'MISSING_LINE_NUMBER',
      });
      return;
    }

    const lineToInsertAfter = config.lineNumber;
    const lines = sourceCode.split('\n');

    if (lineToInsertAfter < 1 || lineToInsertAfter > lines.length) {
      errors.push({
        config,
        message: `Line number ${lineToInsertAfter} is out of range (1-${lines.length})`,
        code: 'LINE_OUT_OF_RANGE',
        lineNumber: lineToInsertAfter,
      });
      return;
    }

    let injectionFound = false;

    // Find the statement at the specified line and insert after
    traverse(ast, {
      Statement: (path: Path) => {
        if (injectionFound) return;

        const node = path.node;
        if (!node.loc) return;

        // Check if this node ends at or contains the target line
        if (
          node.loc.start.line <= lineToInsertAfter &&
          node.loc.end.line >= lineToInsertAfter
        ) {
          const injectedStatement = this.createTraceStatement(config.code);

          // Insert after this statement
          path.insertAfter(injectedStatement);

          injections.push({
            config,
            originalLine: lineToInsertAfter,
            injectedLines: [lineToInsertAfter + 1],
            injectedCode: `__trace__("${config.code.replace(/"/g, '\\"')}")`,
            context: {
              nodeType: node.type,
            },
          });

          injectionFound = true;
          path.stop();
        }
      },
    });

    if (!injectionFound) {
      errors.push({
        config,
        message: `Could not find statement at line ${lineToInsertAfter}`,
        code: 'NO_STATEMENT_FOUND',
        lineNumber: lineToInsertAfter,
      });
    }
  }

  /**
   * Inject code at function entry
   */
  private injectAtEntry(
    ast: File,
    sourceCode: string,
    config: TracepointConfig,
    injections: PerformedInjection[],
    sourceMapMetadata: SourceMapMetadata[],
    errors: InjectionError[]
  ): void {
    if (!config.functionName) {
      errors.push({
        config,
        message: 'functionName is required for entry injection',
        code: 'MISSING_FUNCTION_NAME',
      });
      return;
    }

    let injectionFound = false;

    traverse(ast, {
      FunctionDeclaration: (path: Path) => {
        const node = path.node;
        if (node.id?.name === config.functionName) {
          const injectedStatement = this.createTraceStatement(config.code);
          const isAsync = node.async;
          const isGenerator = node.generator;

          // Insert at the beginning of function body
          if (t.isBlockStatement(node.body)) {
            node.body.body.unshift(injectedStatement);
          }

          injections.push({
            config,
            originalLine: node.loc?.start.line,
            injectedLines: node.loc ? [node.loc.start.line] : [],
            injectedCode: `__trace__("${config.code.replace(/"/g, '\\"')}")`,
            context: {
              nodeType: 'FunctionDeclaration',
              functionName: node.id?.name,
              isAsync,
              isGenerator,
            },
          });

          injectionFound = true;
        }
      },
      ArrowFunctionExpression: (path: Path) => {
        const node = path.node;
        const parent = path.parent;

        // Match arrow functions assigned to variables
        if (
          t.isVariableDeclarator(parent) &&
          t.isIdentifier(parent.id) &&
          parent.id.name === config.functionName
        ) {
          const isAsync = node.async;
          const isGenerator = node.generator;

          // Only inject if body is a block statement
          if (t.isBlockStatement(node.body)) {
            const injectedStatement = this.createTraceStatement(config.code);
            node.body.body.unshift(injectedStatement);

            injections.push({
              config,
              originalLine: node.loc?.start.line,
              injectedLines: node.loc ? [node.loc.start.line] : [],
              injectedCode: `__trace__("${config.code.replace(/"/g, '\\"')}")`,
              context: {
                nodeType: 'ArrowFunctionExpression',
                functionName: config.functionName,
                isAsync,
                isGenerator,
              },
            });

            injectionFound = true;
          }
        }
      },
      ClassMethod: (path: Path) => {
        const node = path.node;

        if (
          node.key &&
          t.isIdentifier(node.key) &&
          node.key.name === config.functionName
        ) {
          const isAsync = node.async;
          const isGenerator = node.generator;

          if (t.isBlockStatement(node.body)) {
            const injectedStatement = this.createTraceStatement(config.code);
            node.body.body.unshift(injectedStatement);

            injections.push({
              config,
              originalLine: node.loc?.start.line,
              injectedLines: node.loc ? [node.loc.start.line] : [],
              injectedCode: `__trace__("${config.code.replace(/"/g, '\\"')}")`,
              context: {
                nodeType: 'ClassMethod',
                functionName: config.functionName,
                isAsync,
                isGenerator,
              },
            });

            injectionFound = true;
          }
        }
      },
    });

    if (!injectionFound) {
      errors.push({
        config,
        message: `Could not find function named "${config.functionName}"`,
        code: 'NO_FUNCTION_FOUND',
      });
    }
  }

  /**
   * Inject code at function exit (before all return statements)
   */
  private injectAtExit(
    ast: File,
    sourceCode: string,
    config: TracepointConfig,
    injections: PerformedInjection[],
    sourceMapMetadata: SourceMapMetadata[],
    errors: InjectionError[]
  ): void {
    if (!config.functionName) {
      errors.push({
        config,
        message: 'functionName is required for exit injection',
        code: 'MISSING_FUNCTION_NAME',
      });
      return;
    }

    let injectionFound = false;

    traverse(ast, {
      FunctionDeclaration: (path: Path) => {
        const node = path.node;
        if (node.id?.name === config.functionName) {
          this.injectAtReturns(node.body, config, injections);
          injectionFound = true;
          path.stop();
        }
      },
      ArrowFunctionExpression: (path: Path) => {
        const node = path.node;
        const parent = path.parent;

        if (
          t.isVariableDeclarator(parent) &&
          t.isIdentifier(parent.id) &&
          parent.id.name === config.functionName
        ) {
          if (t.isBlockStatement(node.body)) {
            this.injectAtReturns(node.body, config, injections);
          }
          injectionFound = true;
          path.stop();
        }
      },
      ClassMethod: (path: Path) => {
        const node = path.node;

        if (
          node.key &&
          t.isIdentifier(node.key) &&
          node.key.name === config.functionName
        ) {
          this.injectAtReturns(node.body, config, injections);
          injectionFound = true;
          path.stop();
        }
      },
    });

    if (!injectionFound) {
      errors.push({
        config,
        message: `Could not find function named "${config.functionName}"`,
        code: 'NO_FUNCTION_FOUND',
      });
    }
  }

  /**
   * Helper to inject at all return statements
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private injectAtReturns(
    functionNode: any,
    config: TracepointConfig,
    injections: PerformedInjection[]
  ): void {
    traverse(functionNode, {
      ReturnStatement: (path: Path) => {
        // Only inject in the immediate function body, not in nested functions
        // Skip if we encounter a nested function
        let parent = path.parent;
        let isInNestedFunction = false;

        while (parent && parent !== functionNode) {
          if (
            t.isFunctionExpression(parent) ||
            t.isFunctionDeclaration(parent) ||
            t.isArrowFunctionExpression(parent) ||
            (t.isClassMethod(parent) && parent !== functionNode) ||
            t.isClassPrivateMethod(parent)
          ) {
            isInNestedFunction = true;
            break;
          }

          parent = (path.parentPath?.parent || parent) as any;
        }

        if (!isInNestedFunction) {
          const traceStmt = this.createTraceStatement(config.code);
          path.insertBefore(traceStmt);

          injections.push({
            config,
            originalLine: path.node.loc?.start.line,
            injectedLines: path.node.loc ? [path.node.loc.start.line] : [],
            injectedCode: `__trace__("${config.code.replace(/"/g, '\\"')}")`,
            context: {
              nodeType: 'ReturnStatement',
            },
          });
        }
      },
      noScope: true,
    });
  }

  /**
   * Create a trace statement node
   */
  private createTraceStatement(code: string): t.ExpressionStatement {
    return t.expressionStatement(
      t.callExpression(t.identifier('__trace__'), [t.stringLiteral(code)])
    );
  }

  /**
   * Enhance source map with metadata from injections
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private enhanceSourceMap(sourceMap: any, _metadata: SourceMapMetadata[]): any {
    // Return the source map as-is for now
    // In production, this would update the mappings
    return sourceMap;
  }
}

/**
 * Singleton instance of the injector
 */
export const injector = new TracepointInjector();

/**
 * Convenience function to inject tracepoints
 */
export function injectTracepoints(
  sourceCode: string,
  configs: TracepointConfig[],
  options?: { filename?: string; preserveSourceMap?: boolean }
): InjectionResult {
  return injector.inject(sourceCode, configs, options);
}
