/**
 * Babel parser configuration for TypeScript AST parsing
 * Supports JSX/TSX, decorators, and ES2024+ features
 */
import type { ParserPlugin } from '@babel/parser';
/**
 * Parser plugins configuration
 * Enables support for TypeScript, JSX, decorators (legacy and stage 3), and modern JavaScript features
 */
export declare const PARSER_PLUGINS: ParserPlugin[];
/**
 * Parser options for Babel parser
 * Configured to parse modules with source type and advanced plugins
 */
export declare const PARSER_OPTIONS: {
    sourceType: "module";
    allowImportExportEverywhere: boolean;
    allowReturnOutsideFunction: boolean;
    plugins: ParserPlugin[];
    ranges: boolean;
    attachComment: boolean;
    attachInnerComments: boolean;
    attachLeadingComments: boolean;
    attachTrailingComments: boolean;
    createImportedIdentifierNodes: boolean;
    createParenthesizedExpressions: boolean;
    errorRecovery: boolean;
    strictMode: undefined;
    tokens: boolean;
};
/**
 * Parser options specifically for script parsing (non-module)
 */
export declare const SCRIPT_PARSER_OPTIONS: {
    sourceType: "script";
    allowImportExportEverywhere: boolean;
    allowReturnOutsideFunction: boolean;
    plugins: ParserPlugin[];
    ranges: boolean;
    attachComment: boolean;
    attachInnerComments: boolean;
    attachLeadingComments: boolean;
    attachTrailingComments: boolean;
    createImportedIdentifierNodes: boolean;
    createParenthesizedExpressions: boolean;
    errorRecovery: boolean;
    strictMode: undefined;
    tokens: boolean;
};
//# sourceMappingURL=config.d.ts.map