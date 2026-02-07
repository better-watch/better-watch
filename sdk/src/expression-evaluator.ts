/**
 * Expression Evaluation System
 *
 * This module provides safe expression evaluation for property access,
 * array indexing, method calls, and template literals without side effects.
 */

/**
 * Result of expression evaluation
 */
export interface EvaluationResult {
  /**
   * Whether the evaluation succeeded
   */
  success: boolean;

  /**
   * The evaluated value (if success is true)
   */
  value?: unknown;

  /**
   * Error message (if success is false)
   */
  error?: string;
}

/**
 * Evaluates a safe expression against a context object
 *
 * Supported expressions:
 * - Simple identifiers: "x", "userId"
 * - Property access: "user.name", "data.items.0"
 * - Array indexing: "items[0]", "data[index]"
 * - Method calls: "obj.getId()", "user.getName()"
 * - Template literals: "`Hello ${name}`"
 *
 * @param expression - The expression to evaluate (should be pre-validated with isValidCaptureExpression)
 * @param context - The context object to evaluate against
 * @returns EvaluationResult with the evaluated value or error
 */
export function evaluateExpression(expression: string, context: Record<string, unknown>): EvaluationResult {
  try {
    // Handle template literals
    if (expression.startsWith('`') && expression.endsWith('`')) {
      return evaluateTemplateLiteral(expression, context);
    }

    // Handle regular property/method access expressions
    return evaluatePropertyAccess(expression, context);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Evaluates property access and method call expressions
 */
function evaluatePropertyAccess(expression: string, context: Record<string, unknown>): EvaluationResult {
  // Parse the expression into tokens
  const tokens = parseExpression(expression);

  if (tokens.length === 0) {
    return {
      success: false,
      error: 'Empty expression',
    };
  }

  // Start with the first identifier
  const firstToken = tokens[0];
  if (!firstToken || firstToken.type !== 'identifier') {
    return {
      success: false,
      error: 'Expression must start with an identifier',
    };
  }

  let current = context[firstToken.value];

  // Process remaining tokens
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'property') {
      if (typeof current !== 'object' || current === null) {
        return {
          success: false,
          error: `Cannot access property '${token.value}' on non-object`,
        };
      }
      const obj = current as Record<string, unknown>;
      current = obj[token.value];
    } else if (token.type === 'index') {
      // Index can be either numeric, a variable name, or a property path
      let index: string | number;

      const numIndex = Number(token.value);
      if (!Number.isNaN(numIndex)) {
        // It's a numeric index
        index = numIndex;
      } else {
        // It's a variable or property path - resolve from context
        const resolved = resolveValue(context, token.value);
        if (resolved !== undefined && resolved !== null) {
          index = String(resolved);
        } else {
          // If not found in context, treat as property name
          index = token.value;
        }
      }

      // Handle both arrays and objects
      if (Array.isArray(current)) {
        if (typeof index !== 'number') {
          // For arrays with non-numeric indices, treat as property access
          const obj = current as unknown as Record<string, unknown>;
          current = obj[index];
        } else {
          current = current[index];
        }
      } else if (typeof current === 'object' && current !== null) {
        const obj = current as Record<string, unknown>;
        current = obj[index];
      } else {
        return {
          success: false,
          error: `Cannot access index on non-object`,
        };
      }
    } else if (token.type === 'call') {
      if (typeof current !== 'function') {
        return {
          success: false,
          error: `Cannot call non-function`,
        };
      }
      // Call the method with no arguments
      try {
        // For methods, we should preserve 'this' context, but since we've already extracted the method,
        // we call it directly. This matches the behavior of evaluating obj.method()
        // eslint-disable-next-line @typescript-eslint/ban-types
        current = (current as Function)();
      } catch (error) {
        return {
          success: false,
          error: `Method call failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
  }

  return {
    success: true,
    value: current,
  };
}

/**
 * Evaluates template literal expressions
 */
function evaluateTemplateLiteral(expression: string, context: Record<string, unknown>): EvaluationResult {
  // Remove backticks
  const content = expression.slice(1, -1);

  try {
    let result = '';
    let i = 0;

    while (i < content.length) {
      // Look for ${...} patterns
      const dollarIndex = content.indexOf('${', i);

      if (dollarIndex === -1) {
        // No more expressions, add the rest
        result += content.slice(i);
        break;
      }

      // Add the string before the expression
      result += content.slice(i, dollarIndex);

      // Find the matching closing brace
      let braceCount = 1;
      let j = dollarIndex + 2;

      while (j < content.length && braceCount > 0) {
        if (content[j] === '{') {
          braceCount++;
        } else if (content[j] === '}') {
          braceCount--;
        }
        j++;
      }

      if (braceCount !== 0) {
        return {
          success: false,
          error: 'Unmatched braces in template literal',
        };
      }

      // Extract and evaluate the expression
      const subExpression = content.slice(dollarIndex + 2, j - 1).trim();

      if (!subExpression) {
        // Empty expression, use 'undefined'
        result += 'undefined';
      } else {
        const subResult = evaluatePropertyAccess(subExpression, context);

        if (!subResult.success) {
          return subResult;
        }

        result += String(subResult.value ?? 'undefined');
      }
      i = j;
    }

    return {
      success: true,
      value: result,
    };
  } catch (error) {
    return {
      success: false,
      error: `Template literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Token types for expression parsing
 */
interface ExpressionToken {
  type: 'identifier' | 'property' | 'index' | 'call';
  value: string;
}

/**
 * Parses an expression into tokens
 */
function parseExpression(expression: string): ExpressionToken[] {
  const tokens: ExpressionToken[] = [];
  let i = 0;

  // Parse the first identifier
  const identifierMatch = expression.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
  if (!identifierMatch) {
    return tokens;
  }

  tokens.push({
    type: 'identifier',
    value: identifierMatch[0],
  });

  i = identifierMatch[0].length;

  // Parse property access and method calls
  while (i < expression.length) {
    if (expression[i] === '.') {
      // Property access
      i++;
      const propMatch = expression.slice(i).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (!propMatch) {
        break;
      }
      tokens.push({
        type: 'property',
        value: propMatch[0],
      });
      i += propMatch[0].length;
    } else if (expression[i] === '[') {
      // Array index or computed property
      i++;
      const closeIndex = expression.indexOf(']', i);
      if (closeIndex === -1) {
        break;
      }
      const indexValue = expression.slice(i, closeIndex);
      tokens.push({
        type: 'index',
        value: indexValue,
      });
      i = closeIndex + 1;
    } else if (expression[i] === '(' && expression[i + 1] === ')') {
      // Method call with no arguments
      tokens.push({
        type: 'call',
        value: '',
      });
      i += 2;
    } else {
      break;
    }
  }

  return tokens;
}

/**
 * Resolves a value from context (for computed property access)
 */
function resolveValue(context: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Evaluates multiple expressions against a context
 */
export function evaluateExpressions(
  expressions: string[],
  context: Record<string, unknown>
): Record<string, EvaluationResult> {
  const results: Record<string, EvaluationResult> = {};

  for (const expr of expressions) {
    results[expr] = evaluateExpression(expr, context);
  }

  return results;
}
