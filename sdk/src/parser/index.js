/**
 * TypeScript AST Parser Module
 *
 * Provides robust parsing of TypeScript, JavaScript, JSX, and TSX code
 * using Babel parser with comprehensive feature support
 */
export { TypeScriptParser, parser, parseSourceCode } from './parser.js';
export { PARSER_PLUGINS, PARSER_OPTIONS, SCRIPT_PARSER_OPTIONS } from './config.js';
export { isFunction, isClassMethod, isClassPrivateMethod, isDecorator, isTypeAssertion, isGeneric, } from './types.js';
export { SourceMapHandler, normalizeSourceMap, offsetToLineColumn, lineColumnToOffset } from './source-map.js';
//# sourceMappingURL=index.js.map