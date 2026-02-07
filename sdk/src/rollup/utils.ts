/**
 * Rollup Plugin Utilities
 *
 * Helper functions for AST manipulation and code analysis
 */

/**
 * Get the line number for a source location
 *
 * @param sourceCode - Source code string
 * @param position - Character position in source
 * @returns Line number (1-based)
 */
export function getLineNumber(sourceCode: string, position: number): number {
  let line = 1;
  for (let i = 0; i < position && i < sourceCode.length; i++) {
    if (sourceCode[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * Get column number for a source location
 *
 * @param sourceCode - Source code string
 * @param position - Character position in source
 * @returns Column number (0-based)
 */
export function getColumnNumber(sourceCode: string, position: number): number {
  let column = 0;
  for (let i = position - 1; i >= 0; i--) {
    if (sourceCode[i] === '\n') {
      break;
    }
    column++;
  }
  return column;
}

/**
 * Detect if a character position is within a string or comment
 *
 * @param sourceCode - Source code string
 * @param position - Character position
 * @returns Whether position is in string or comment
 */
export function isInStringOrComment(sourceCode: string, position: number): boolean {
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < position && i < sourceCode.length; i++) {
    const char = sourceCode[i];
    const nextChar = i + 1 < sourceCode.length ? sourceCode[i + 1] : '';

    // Handle line comments
    if (!inString && !inBlockComment && char === '/' && nextChar === '/') {
      inLineComment = true;
    }

    // Handle line comment end
    if (inLineComment && char === '\n') {
      inLineComment = false;
    }

    // Handle block comments
    if (!inString && !inLineComment && char === '/' && nextChar === '*') {
      inBlockComment = true;
    }

    if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      i++; // Skip the '/'
      continue;
    }

    // Handle strings
    if (!inLineComment && !inBlockComment) {
      if ((char === '"' || char === "'" || char === '`') && (i === 0 || sourceCode[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
    }
  }

  return inString || inLineComment || inBlockComment;
}

/**
 * Get node type from source code
 *
 * @param sourceCode - Source code
 * @param position - Position in code
 * @returns Node type ('function', 'class', 'method', or 'unknown')
 */
export function getNodeType(sourceCode: string, position: number): 'function' | 'class' | 'method' | 'unknown' {
  // Find preceding whitespace/keywords
  let i = position - 1;

  // Skip whitespace backwards
  while (i >= 0 && /\s/.test(sourceCode[i])) {
    i--;
  }

  // Look for function/class keywords
  const beforeKeyword = sourceCode.substring(Math.max(0, i - 20), position);

  if (/\bclass\b/.test(beforeKeyword)) {
    return 'class';
  }

  if (/\bfunction\b/.test(beforeKeyword)) {
    return 'function';
  }

  if (/=>\s*\{/.test(beforeKeyword)) {
    return 'function';
  }

  return 'unknown';
}

/**
 * Extract function/class name from position
 *
 * @param sourceCode - Source code
 * @param position - Position of declaration
 * @returns Name or undefined
 */
export function extractName(sourceCode: string, position: number): string | undefined {
  // Skip to next non-whitespace
  let i = position;
  while (i < sourceCode.length && /\s/.test(sourceCode[i])) {
    i++;
  }

  // Collect identifier characters
  let name = '';
  while (i < sourceCode.length && /[a-zA-Z0-9_$]/.test(sourceCode[i])) {
    name += sourceCode[i];
    i++;
  }

  return name || undefined;
}

/**
 * Get version of a package from node_modules
 *
 * @param _packageName - Package name
 * @returns Version string or 'unknown'
 */
export function getPackageVersion(_packageName: string): string {
  // In ESM context, dynamic requires are not easily available
  // This is typically handled at build time
  return 'unknown';
}

/**
 * Check if code contains top-level imports
 *
 * @param sourceCode - Source code
 * @returns Whether imports exist
 */
export function hasImports(sourceCode: string): boolean {
  return /^\s*(import\s+|export\s+)/m.test(sourceCode);
}

/**
 * Generate unique statement ID
 *
 * @param filename - File name
 * @param line - Line number
 * @param kind - Statement kind
 * @returns Unique ID
 */
export function generateStatementId(filename: string, line: number, kind: string): string {
  return `${filename}:${line}:${kind}`;
}

/**
 * Validate JavaScript identifier
 *
 * @param name - Name to validate
 * @returns Whether name is valid identifier
 */
export function isValidIdentifier(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  // JavaScript identifier pattern
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}
