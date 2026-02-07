/**
 * Babel parser configuration for TypeScript AST parsing
 * Supports JSX/TSX, decorators, and ES2024+ features
 */

import type { ParserPlugin } from '@babel/parser';

/**
 * Parser plugins configuration
 * Enables support for TypeScript, JSX, decorators (legacy and stage 3), and modern JavaScript features
 */
export const PARSER_PLUGINS: ParserPlugin[] = [
  'typescript',
  'jsx',
  ['decorators', { decoratorsBeforeExport: false }],
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'privateIn',
  'logicalAssignment',
  'numericSeparator',
  'nullishCoalescingOperator',
  'optionalChaining',
  'optionalCatchBinding',
  'partialApplication',
  ['pipelineOperator', { proposal: 'minimal' }],
  'throwExpressions',
];

/**
 * Parser options for Babel parser
 * Configured to parse modules with source type and advanced plugins
 */
export const PARSER_OPTIONS = {
  sourceType: 'module' as const,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  plugins: PARSER_PLUGINS,
  ranges: true,
  attachComment: true,
  attachInnerComments: true,
  attachLeadingComments: true,
  attachTrailingComments: true,
  createImportedIdentifierNodes: true,
  createParenthesizedExpressions: true,
  errorRecovery: true,
  strictMode: undefined,
  tokens: true,
};

/**
 * Parser options specifically for script parsing (non-module)
 */
export const SCRIPT_PARSER_OPTIONS = {
  ...PARSER_OPTIONS,
  sourceType: 'script' as const,
};
