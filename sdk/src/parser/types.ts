/**
 * Type definitions for the AST parser module
 */

import type {
  File,
  Program,
  Function,
  ClassMethod,
  ClassPrivateMethod,
} from '@babel/types';

/**
 * Options for parsing source code
 */
export interface ParseOptions {
  /**
   * Whether to parse as a module (true) or script (false)
   * @default true
   */
  isModule?: boolean;

  /**
   * Whether to parse TypeScript (automatically detected if not specified)
   * @default true
   */
  isTypeScript?: boolean;

  /**
   * Whether to parse JSX/TSX syntax
   * @default true
   */
  hasJSX?: boolean;

  /**
   * Source filename for better error messages
   */
  filename?: string;

  /**
   * Whether to attach source map information
   * @default true
   */
  sourceMap?: boolean;
}

/**
 * Result of parsing source code
 */
export interface ParseResult {
  /**
   * The parsed AST
   */
  ast: File;

  /**
   * The AST program node
   */
  program: Program;

  /**
   * Parse errors (if any)
   */
  errors: ParseError[];

  /**
   * All tokens from the source
   */
  tokens: any[];

  /**
   * Source map if requested and available
   */
  sourceMap?: SourceMapInfo;
}

/**
 * Parse error information
 */
export interface ParseError {
  /**
   * Error message
   */
  message: string;

  /**
   * Line number (1-indexed)
   */
  line: number;

  /**
   * Column number (0-indexed)
   */
  column: number;

  /**
   * The actual error object
   */
  error: Error;
}

/**
 * Source map information
 */
export interface SourceMapInfo {
  /**
   * Original source content
   */
  sources: string[];

  /**
   * Source map mappings
   */
  mappings: string;

  /**
   * Version of the source map format
   */
  version: number;

  /**
   * Names referenced in the source map
   */
  names: string[];

  /**
   * Source map content
   */
  sourcesContent?: (string | null)[];
}

/**
 * Represents a location in source code
 */
export interface SourceLocation {
  line: number;
  column: number;
}

/**
 * Represents a range in source code
 */
export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}

/**
 * Traversal visitor pattern for AST nodes
 */
export interface ASTVisitor {
  enter?: (node: any, parent?: any) => void | boolean;
  exit?: (node: any, parent?: any) => void | boolean;
}

/**
 * Type guard functions
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(node: unknown): node is Function {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node && (
    (node as any).type === 'FunctionExpression' ||
    (node as any).type === 'FunctionDeclaration' ||
    (node as any).type === 'ArrowFunctionExpression' ||
    (node as any).type === 'AsyncFunctionExpression' ||
    (node as any).type === 'AsyncFunctionDeclaration'
  ));
}

export function isClassMethod(node: unknown): node is ClassMethod {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as any).type === 'ClassMethod'
  );
}

export function isClassPrivateMethod(node: unknown): node is ClassPrivateMethod {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as any).type === 'ClassPrivateMethod'
  );
}

export function isDecorator(node: unknown): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as any).type === 'Decorator'
  );
}

export function isTypeAssertion(node: unknown): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node && (
    (node as any).type === 'TSAsExpression' ||
    (node as any).type === 'TSTypeAssertion'
  ));
}

export function isGeneric(node: unknown): boolean {
  return !!(
    typeof node === 'object' &&
    node !== null && (
    'typeParameters' in node ||
    ('type' in node && (node as any).type === 'TSTypeParameterDeclaration') ||
    ('expression' in node && typeof node.expression === 'object' && node.expression !== null && 'typeParameters' in node.expression)
  ));
}
