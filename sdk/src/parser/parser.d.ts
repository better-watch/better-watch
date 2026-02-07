/**
 * TypeScript AST parser using Babel parser
 * Supports JSX/TSX, decorators, and ES2024+ features
 */
import type { ParseOptions, ParseResult } from './types.js';
/**
 * Parser class for parsing TypeScript/JavaScript source code
 * Automatically detects syntax features and handles source maps
 */
export declare class TypeScriptParser {
    /**
     * Parse source code into an AST
     *
     * @param sourceCode - The source code to parse
     * @param options - Parser options
     * @returns Parsed AST with metadata
     */
    parse(sourceCode: string, options?: ParseOptions): ParseResult;
    /**
     * Parse source code as a module
     */
    parseModule(sourceCode: string, filename?: string): ParseResult;
    /**
     * Parse source code as a script
     */
    parseScript(sourceCode: string, filename?: string): ParseResult;
    /**
     * Detect if source code contains TypeScript syntax
     */
    private detectTypeScript;
    /**
     * Detect if source code contains JSX syntax
     */
    private detectJSX;
    /**
     * Build parser options based on detected or specified syntax features
     */
    private buildParserOptions;
    /**
     * Extract source map information from the parsed AST
     * Returns source map data for accurate line number mapping
     */
    private extractSourceMap;
}
/**
 * Singleton instance of the parser
 */
export declare const parser: TypeScriptParser;
/**
 * Convenience function to parse source code
 */
export declare function parseSourceCode(sourceCode: string, options?: ParseOptions): ParseResult;
//# sourceMappingURL=parser.d.ts.map