/**
 * TypeScript Compiler Plugin Utilities
 *
 * Helper functions for the TypeScript transformer
 */

import ts from 'typescript';

/**
 * Get the package version
 *
 * @returns Package version string
 */
export function getPackageVersion(): string {
  // In a real package, this would read from package.json
  // For now, return a static version
  return '0.1.0';
}

/**
 * Detect TypeScript version
 *
 * @returns TypeScript version string
 */
export function detectTypeScriptVersion(): string {
  return ts.versionMajorMinor;
}

/**
 * Create a point ID for tracking injections
 *
 * @param file - Source file
 * @param line - Line number
 * @param kind - Node kind
 * @returns Unique point ID
 */
export function createPointId(file: string, line: number, kind: string): string {
  return `${file}:${line}:${kind}`;
}

/**
 * Get the line number of a node
 *
 * @param sourceFile - Source file
 * @param node - AST node
 * @returns Line number (1-based)
 */
export function getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return lineAndCharacter.line + 1; // Line numbers are 0-based in TypeScript, but we use 1-based
}

/**
 * Get the column number of a node
 *
 * @param sourceFile - Source file
 * @param node - AST node
 * @returns Column number (1-based)
 */
export function getColumnNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return lineAndCharacter.character + 1; // Columns are 0-based in TypeScript, but we use 1-based
}

/**
 * Check if a node is a function declaration or expression
 *
 * @param node - AST node
 * @returns Whether node is a function
 */
export function isFunctionNode(node: ts.Node): node is ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  );
}

/**
 * Check if a node is a class declaration
 *
 * @param node - AST node
 * @returns Whether node is a class
 */
export function isClassNode(node: ts.Node): node is ts.ClassDeclaration {
  return ts.isClassDeclaration(node);
}

/**
 * Check if a node is a method declaration
 *
 * @param node - AST node
 * @returns Whether node is a method
 */
export function isMethodNode(
  node: ts.Node
): node is ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration {
  return (
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/**
 * Get the name of a function or class node
 *
 * @param node - Function or class node
 * @returns Name or undefined
 */
export function getNodeName(node: ts.FunctionDeclaration | ts.ClassDeclaration | ts.MethodDeclaration): string | undefined {
  if (node.name && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return undefined;
}

/**
 * Check if a node is async
 *
 * @param node - Function or method node
 * @returns Whether node is async
 */
export function isAsyncNode(
  node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration
): boolean {
  return !!(node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.AsyncKeyword));
}

/**
 * Check if a node is a generator function
 *
 * @param node - Function node
 * @returns Whether node is a generator
 */
export function isGeneratorNode(
  node: ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration
): boolean {
  return !!(node.asteriskToken);
}

/**
 * Create a call expression for tracepoint
 *
 * @param ts - TypeScript module
 * @param functionName - Name of function to call
 * @param args - Arguments to pass
 * @returns Call expression node
 */
export function createTracepointCall(ts: typeof import('typescript'), functionName: string, args: ts.Expression[]): ts.CallExpression {
  return ts.factory.createCallExpression(
    ts.factory.createIdentifier(functionName),
    undefined,
    args
  );
}

/**
 * Create a string literal node
 *
 * @param ts - TypeScript module
 * @param value - String value
 * @returns String literal node
 */
export function createStringLiteral(ts: typeof import('typescript'), value: string): ts.StringLiteral {
  return ts.factory.createStringLiteral(value);
}

/**
 * Create a numeric literal node
 *
 * @param ts - TypeScript module
 * @param value - Number value
 * @returns Numeric literal node
 */
export function createNumericLiteral(ts: typeof import('typescript'), value: number): ts.NumericLiteral {
  return ts.factory.createNumericLiteral(value.toString());
}

/**
 * Check if an identifier matches a pattern
 *
 * @param name - Identifier name
 * @param pattern - Pattern (supports wildcard *)
 * @returns Whether name matches pattern
 */
export function matchesIdentifierPattern(name: string, pattern: string): boolean {
  if (pattern === '*') {
    return true;
  }
  if (!pattern.includes('*')) {
    return name === pattern;
  }
  const regexPattern = pattern.replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(name);
}
