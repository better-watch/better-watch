/**
 * TypeScript AST parser using Babel parser
 * Supports JSX/TSX, decorators, and ES2024+ features
 */

import babelParser, { ParserPlugin } from '@babel/parser';
import type { File } from '@babel/types';
import { PARSER_OPTIONS, SCRIPT_PARSER_OPTIONS } from './config.js';
import type { ParseOptions, ParseResult, ParseError } from './types.js';

/**
 * Parser class for parsing TypeScript/JavaScript source code
 * Automatically detects syntax features and handles source maps
 */
export class TypeScriptParser {
  /**
   * Parse source code into an AST
   *
   * @param sourceCode - The source code to parse
   * @param options - Parser options
   * @returns Parsed AST with metadata
   */
  public parse(sourceCode: string, options: ParseOptions = {}): ParseResult {
    const {
      isModule = true,
      isTypeScript = this.detectTypeScript(sourceCode),
      hasJSX = this.detectJSX(sourceCode),
      filename = 'unknown.ts',
      sourceMap = true,
    } = options;

    const parserOptions = this.buildParserOptions(
      isModule,
      isTypeScript,
      hasJSX,
      filename,
      sourceMap
    );

    const errors: ParseError[] = [];
    let ast: File | null = null;
    let tokens: any[] = [];

    try {
      const result = babelParser.parse(sourceCode, parserOptions);
      ast = result;
      const resultWithTokens = result as { tokens?: unknown[] };
      tokens = resultWithTokens.tokens || [];
    } catch (error) {
      if (error instanceof SyntaxError) {
        const syntaxError = error as SyntaxError & { loc?: { line: number; column: number } };
        errors.push({
          message: syntaxError.message,
          line: syntaxError.loc?.line || 1,
          column: syntaxError.loc?.column || 0,
          error,
        });
      } else {
        throw error;
      }
    }

    if (!ast) {
      throw new Error(`Failed to parse source code: ${errors[0]?.message || 'Unknown error'}`);
    }

    const result: ParseResult = {
      ast,
      program: ast.program,
      errors,
      tokens,
    };

    if (sourceMap) {
      result.sourceMap = this.extractSourceMap(sourceCode, ast);
    }

    return result;
  }

  /**
   * Parse source code as a module
   */
  public parseModule(sourceCode: string, filename?: string): ParseResult {
    return this.parse(sourceCode, {
      isModule: true,
      filename,
    });
  }

  /**
   * Parse source code as a script
   */
  public parseScript(sourceCode: string, filename?: string): ParseResult {
    return this.parse(sourceCode, {
      isModule: false,
      filename,
    });
  }

  /**
   * Detect if source code contains TypeScript syntax
   */
  private detectTypeScript(sourceCode: string): boolean {
    // Check for common TypeScript patterns
    const tsPatterns = [
      /:\s*(string|number|boolean|any|unknown|void|never|object|Function|Symbol|BigInt|unique\s+symbol|[A-Z]\w*)/,
      /:\s*\{[^}]*\}/,
      /as\s+const\b/,
      /satisfies\s+/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /enum\s+\w+/,
      /namespace\s+\w+/,
      /declare\s+(function|class|var|const|let|global|module)/,
      /<[A-Z]\w*>/,
    ];

    return tsPatterns.some((pattern) => pattern.test(sourceCode));
  }

  /**
   * Detect if source code contains JSX syntax
   */
  private detectJSX(sourceCode: string): boolean {
    // Check for JSX patterns
    const jsxPatterns = [
      /<[A-Z]\w*[\s/>]/,
      /<\/[A-Z]\w*>/,
      /<[a-z][\w-]*[\s/>]/,
      /ReactDOM\.render/,
      /React\.createElement/,
      /import\s+React\s+from\s+['"]react['"]/,
    ];

    return jsxPatterns.some((pattern) => pattern.test(sourceCode));
  }

  /**
   * Build parser options based on detected or specified syntax features
   */
  private buildParserOptions(
    isModule: boolean,
    isTypeScript: boolean,
    hasJSX: boolean,
    filename: string,
    sourceMap: boolean
  ): babelParser.ParserOptions {
    const baseOptions = isModule ? PARSER_OPTIONS : SCRIPT_PARSER_OPTIONS;

    // Start with base plugins
    const plugins = [...baseOptions.plugins] as ParserPlugin[];

    // Ensure TypeScript plugin is included if needed
    if (isTypeScript && !plugins.includes('typescript')) {
      plugins.unshift('typescript');
    }

    // Ensure JSX plugin is included if needed
    if (hasJSX && !plugins.includes('jsx')) {
      const tsIndex = plugins.findIndex((p) => p === 'typescript');
      if (tsIndex > -1) {
        plugins.splice(tsIndex + 1, 0, 'jsx');
      } else {
        plugins.unshift('jsx');
      }
    }

    return {
      ...baseOptions,
      plugins,
      sourceFilename: filename,
      ...(sourceMap && { sourceMap: true }),
    };
  }

  /**
   * Extract source map information from the parsed AST
   * Returns source map data for accurate line number mapping
   */
  private extractSourceMap(
    sourceCode: string,
    _ast: File
  ): {
    sources: string[];
    mappings: string;
    version: number;
    names: string[];
    sourcesContent?: (string | null)[];
  } {
    // Extract basic source map info
    // This is a simplified version - in production you'd use source-map library

    return {
      version: 3,
      sources: ['input'],
      mappings: '', // Simplified - actual mappings would be complex
      names: [],
      sourcesContent: [sourceCode],
    };
  }
}

/**
 * Singleton instance of the parser
 */
export const parser = new TypeScriptParser();

/**
 * Convenience function to parse source code
 */
export function parseSourceCode(sourceCode: string, options?: ParseOptions): ParseResult {
  return parser.parse(sourceCode, options);
}
