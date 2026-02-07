/**
 * Webpack Loader Utility Functions
 *
 * Helper functions for code analysis and transformation
 */

/**
 * Extract line number from position in code
 *
 * @param code - Source code
 * @param pos - Character position
 * @returns Line number (1-indexed)
 */
export function getLineNumber(code: string, pos: number): number {
  let lineNum = 1;
  for (let i = 0; i < pos && i < code.length; i++) {
    if (code[i] === '\n') {
      lineNum++;
    }
  }
  return lineNum;
}

/**
 * Extract column number from position in code
 *
 * @param code - Source code
 * @param pos - Character position
 * @returns Column number (0-indexed)
 */
export function getColumnNumber(code: string, pos: number): number {
  let lastNewlinePos = 0;
  for (let i = 0; i < pos && i < code.length; i++) {
    if (code[i] === '\n') {
      lastNewlinePos = i + 1;
    }
  }
  return pos - lastNewlinePos;
}

/**
 * Determine node type from code context
 *
 * @param code - Source code
 * @param pos - Character position
 * @returns Node type
 */
export function getNodeType(code: string, pos: number): string {
  // Look backward to find keywords
  let i = pos - 1;
  while (i >= 0 && /\s/.test(code[i])) {
    i--;
  }

  // Check for common patterns
  const context = code.substring(Math.max(0, i - 20), i + 1);
  if (/function\s*$/.test(context)) return 'FunctionDeclaration';
  if (/class\s*$/.test(context)) return 'ClassDeclaration';
  if (/const\s+\w+\s*=\s*\(.*\)\s*=>/.test(context)) return 'ArrowFunctionExpression';
  if (/const\s+\w+\s*=\s*function/.test(context)) return 'FunctionExpression';

  return 'Unknown';
}

/**
 * Extract identifier name from code context
 *
 * @param code - Source code
 * @param pos - Character position
 * @returns Extracted name or undefined
 */
export function extractName(code: string, pos: number): string | undefined {
  // Move forward to find the name
  let i = pos;
  while (i < code.length && /\s/.test(code[i])) {
    i++;
  }

  // Extract identifier
  const nameMatch = code.substring(i).match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
  return nameMatch ? nameMatch[1] : undefined;
}

/**
 * Check if string is a valid JavaScript identifier
 *
 * @param str - String to check
 * @returns Whether string is valid identifier
 */
export function isValidIdentifier(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  // Must start with letter, underscore, or dollar sign
  // Can contain letters, digits, underscores, or dollar signs
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

/**
 * Check if position is within string or comment
 *
 * @param code - Source code
 * @param pos - Character position
 * @returns Whether position is in string or comment
 */
export function isInStringOrComment(code: string, pos: number): boolean {
  // Check if we're in a single-line comment
  let i = pos - 1;
  while (i >= 0 && code[i] !== '\n') {
    if (code[i - 1] === '/' && code[i] === '/') {
      return true;
    }
    i--;
  }

  // Check if we're in a multi-line comment
  if (code.substring(0, pos).includes('/*') && code.substring(pos).includes('*/')) {
    const before = code.substring(0, pos);
    const openComments = (before.match(/\/\*/g) || []).length;
    const closeComments = (before.match(/\*\//g) || []).length;
    if (openComments > closeComments) {
      return true;
    }
  }

  // Check if we're in a string
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < pos && i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : '';

    if (prevChar !== '\\') {
      if (char === "'" && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick;
      }
    }
  }

  return inSingleQuote || inDoubleQuote || inBacktick;
}

/**
 * Generate unique statement ID
 *
 * @param file - File path
 * @param line - Line number
 * @param kind - Statement kind
 * @returns Generated ID
 */
export function generateStatementId(file: string, line: number, kind: string): string {
  const normalized = file.replace(/[^a-zA-Z0-9]/g, '_');
  return `${normalized}_${line}_${kind}`;
}

/**
 * Get package version from package.json
 *
 * @returns Package version
 */
export function getPackageVersion(): string {
  // This would typically be injected at build time
  return '0.1.0';
}

/**
 * Check if code has imports
 *
 * @param code - Source code
 * @returns Whether code has imports
 */
export function hasImports(code: string): boolean {
  return /^\s*(import\s+|const\s+\w+\s*=\s*require\s*\()/m.test(code);
}
