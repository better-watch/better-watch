/**
 * TypeScript Compiler Plugin Transform
 *
 * Core transformation logic for injecting tracepoints into TypeScript/JavaScript code
 */

import ts from 'typescript';
import type { TransformContext, TransformResult } from './types.js';
import { matchesPattern, shouldSampleTrace } from './config.js';
import {
  getLineNumber,
  isClassNode,
  isFunctionNode,
  isMethodNode,
  createTracepointCall,
  createStringLiteral,
  createNumericLiteral,
} from './utils.js';

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
 * Create the trace injection statement
 *
 * @param ts - TypeScript compiler module
 * @param context - Transform context
 * @param node - AST node being instrumented
 * @param sourceFile - Source file
 * @param pointType - Type of injection point
 * @returns Expression statement for tracepoint
 */
function createTraceInjection(
  context: TransformContext,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  pointType: 'entry' | 'exit'
): ts.ExpressionStatement {
  const line = getLineNumber(sourceFile, node);
  const nodeKind = ts.SyntaxKind[node.kind];

  // Create tracepoint call: __trace({ line, type: 'entry'|'exit', function: name, ... })
  const pointId = createPointId(context.filename || 'unknown', line, nodeKind);

  const args: ts.Expression[] = [
    ts.factory.createObjectLiteralExpression(
      [
        ts.factory.createPropertyAssignment('line', createNumericLiteral(context.ts, line)),
        ts.factory.createPropertyAssignment('type', createStringLiteral(context.ts, pointType)),
        ts.factory.createPropertyAssignment('pointId', createStringLiteral(context.ts, pointId)),
        ts.factory.createPropertyAssignment('sampling', createNumericLiteral(context.ts, context.config.performance?.samplingRate || 1)),
      ],
      true
    ),
  ];

  const traceCall = createTracepointCall(context.ts, '__trace', args);
  return ts.factory.createExpressionStatement(traceCall);
}

/**
 * Transform a function node
 *
 * @param context - Transform context
 * @param node - Function node
 * @param sourceFile - Source file
 * @returns Transformed node or original if no changes
 */
function transformFunctionNode(
  context: TransformContext,
  node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction,
  sourceFile: ts.SourceFile
): ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction {
  const name = ts.isFunctionDeclaration(node) && node.name ? node.name.text : undefined;

  if (!shouldInstrumentPoint(context, name, 'function')) {
    return node;
  }

  if (!shouldSampleTrace(context.config.performance?.samplingRate || 1)) {
    return node;
  }

  // For arrow functions and function expressions, wrap the body
  if (ts.isArrowFunction(node)) {
    if (ts.isBlock(node.body)) {
      // Block body: add trace at start
      const traceStmt = createTraceInjection(context, node, sourceFile, 'entry');
      const newBody = ts.factory.updateBlock(node.body, [
        traceStmt,
        ...node.body.statements,
      ]);
      return ts.factory.updateArrowFunction(
        node,
        node.modifiers,
        node.typeParameters,
        node.parameters,
        node.type,
        node.equalsGreaterThanToken,
        newBody
      );
    }
  } else if (ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
    if (node.body && ts.isBlock(node.body)) {
      const traceStmt = createTraceInjection(context, node, sourceFile, 'entry');
      const newBody = ts.factory.updateBlock(node.body, [
        traceStmt,
        ...node.body.statements,
      ]);

      if (ts.isFunctionDeclaration(node)) {
        return ts.factory.updateFunctionDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          node.parameters,
          node.type,
          newBody
        );
      } else {
        return ts.factory.updateFunctionExpression(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          node.parameters,
          node.type,
          newBody
        );
      }
    }
  }

  return node;
}

/**
 * Transform a class node
 *
 * @param context - Transform context
 * @param node - Class node
 * @param sourceFile - Source file
 * @returns Transformed node or original if no changes
 */
function transformClassNode(
  context: TransformContext,
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
): ts.ClassDeclaration {
  const className = node.name?.text;

  if (!shouldInstrumentPoint(context, className, 'class')) {
    return node;
  }

  // Transform methods in the class
  const newMembers = node.members.map((member) => {
    if (isMethodNode(member) && ts.isMethodDeclaration(member)) {
      if (member.body && ts.isBlock(member.body)) {
        const traceStmt = createTraceInjection(context, member, sourceFile, 'entry');
        const newBody = ts.factory.updateBlock(member.body, [
          traceStmt,
          ...member.body.statements,
        ]);
        return ts.factory.updateMethodDeclaration(
          member,
          member.modifiers,
          member.asteriskToken,
          member.name,
          member.questionToken,
          member.typeParameters,
          member.parameters,
          member.type,
          newBody
        );
      }
    }
    return member;
  });

  return ts.factory.updateClassDeclaration(
    node,
    node.modifiers,
    node.name,
    node.typeParameters,
    node.heritageClauses,
    newMembers
  );
}

/**
 * Visit and transform nodes recursively
 *
 * @param context - Transform context
 * @param sourceFile - Source file
 * @param node - Current node
 * @returns Transformed node
 */
function visitNode(
  context: TransformContext,
  sourceFile: ts.SourceFile,
  node: ts.Node
): ts.Node {
  if (isFunctionNode(node)) {
    return transformFunctionNode(context, node, sourceFile);
  }

  if (isClassNode(node)) {
    return transformClassNode(context, node, sourceFile);
  }

  return ts.visitEachChild(node, (child) => visitNode(context, sourceFile, child), undefined);
}

/**
 * Transform a source file with tracepoint injections
 *
 * @param sourceFile - TypeScript source file
 * @param context - Transform context
 * @returns Transform result
 */
export function transformSourceFile(
  sourceFile: ts.SourceFile,
  context: TransformContext
): TransformResult {
  const errors: string[] = [];
  let injectionCount = 0;

  try {
    if (!context.config.enabled) {
      return {
        sourceFile,
        modified: false,
        injectionCount: 0,
        errors: [],
      };
    }

    // Visit and transform all nodes
    const transformedFile = ts.visitNode(sourceFile, (node) => visitNode(context, sourceFile, node));

    if (!ts.isSourceFile(transformedFile)) {
      errors.push('Transformation did not result in a valid SourceFile');
      return {
        sourceFile,
        modified: false,
        injectionCount: 0,
        errors,
      };
    }

    // Count transformations by comparing node counts (simple heuristic)
    const originalCount = countNodes(sourceFile);
    const transformedCount = countNodes(transformedFile);

    injectionCount = transformedCount > originalCount ? transformedCount - originalCount : 0;

    return {
      sourceFile: transformedFile,
      modified: injectionCount > 0,
      injectionCount,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Transformation error: ${message}`);

    return {
      sourceFile,
      modified: false,
      injectionCount: 0,
      errors,
    };
  }
}

/**
 * Count nodes in a source file (simple heuristic)
 *
 * @param node - Node to count from
 * @returns Total node count
 */
function countNodes(node: ts.Node): number {
  let count = 0;

  function visit(n: ts.Node): void {
    count++;
    ts.forEachChild(n, visit);
  }

  visit(node);
  return count;
}

/**
 * Create a transformer factory for TypeScript compiler
 *
 * @param context - Transform context
 * @returns Transformer factory function
 */
export function createTransformerFactory(
  context: TransformContext
): ts.TransformerFactory<ts.SourceFile> {
  return (_transformationContext: ts.TransformationContext) => (sourceFile: ts.SourceFile) => {
    const result = transformSourceFile(sourceFile, context);
    return result.sourceFile;
  };
}

/**
 * Create a program transformer factory (for project references)
 *
 * @param context - Transform context
 * @returns Transformer factory function
 */
export function createProgramTransformer(context: TransformContext): ts.TransformerFactory<ts.SourceFile> {
  return (_transformationContext: ts.TransformationContext) => (sourceFile: ts.SourceFile) => {
    const result = transformSourceFile(sourceFile, context);
    return result.sourceFile;
  };
}
