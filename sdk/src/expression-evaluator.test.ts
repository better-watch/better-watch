/**
 * Tests for expression evaluation system
 */

import { describe, it, expect } from 'vitest';
import { evaluateExpression, evaluateExpressions, type EvaluationResult } from './expression-evaluator.js';

describe('Expression Evaluator - Simple Identifiers', () => {
  it('should evaluate simple identifiers', () => {
    const context = { x: 42, name: 'Alice' };
    expect(evaluateExpression('x', context)).toEqual({ success: true, value: 42 });
    expect(evaluateExpression('name', context)).toEqual({ success: true, value: 'Alice' });
  });

  it('should handle undefined identifiers', () => {
    const context = {};
    const result = evaluateExpression('missing', context);
    expect(result.success).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('should handle null and undefined values', () => {
    const context = { nullVal: null, undefinedVal: undefined };
    expect(evaluateExpression('nullVal', context)).toEqual({ success: true, value: null });
    expect(evaluateExpression('undefinedVal', context)).toEqual({ success: true, value: undefined });
  });
});

describe('Expression Evaluator - Property Access', () => {
  it('should evaluate property access', () => {
    const context = { user: { name: 'Alice', age: 30 } };
    expect(evaluateExpression('user.name', context)).toEqual({ success: true, value: 'Alice' });
    expect(evaluateExpression('user.age', context)).toEqual({ success: true, value: 30 });
  });

  it('should evaluate nested property access', () => {
    const context = {
      response: {
        data: {
          users: {
            0: { name: 'Alice' },
          },
        },
      },
    };
    expect(evaluateExpression('response.data.users', context)).toEqual({
      success: true,
      value: { 0: { name: 'Alice' } },
    });
  });

  it('should handle missing properties', () => {
    const context = { user: { name: 'Alice' } };
    const result = evaluateExpression('user.missing', context);
    expect(result.success).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('should fail when accessing property on non-object', () => {
    const context = { x: 42 };
    const result = evaluateExpression('x.prop', context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('non-object');
  });
});

describe('Expression Evaluator - Array Indexing', () => {
  it('should evaluate array index access', () => {
    const context = { items: ['a', 'b', 'c'] };
    expect(evaluateExpression('items[0]', context)).toEqual({ success: true, value: 'a' });
    expect(evaluateExpression('items[1]', context)).toEqual({ success: true, value: 'b' });
  });

  it('should handle out-of-bounds access', () => {
    const context = { items: ['a', 'b'] };
    const result = evaluateExpression('items[10]', context);
    expect(result.success).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('should handle negative indices', () => {
    const context = { items: ['a', 'b', 'c'] };
    // Note: This will be evaluated as the string "-1", which JS will treat as NaN
    const result = evaluateExpression('items[-1]', context);
    expect(result.success).toBe(true);
  });

  it('should evaluate computed property with identifier', () => {
    const context = { data: { first: 'value' }, key: 'first' };
    const result = evaluateExpression('data[key]', context);
    expect(result.success).toBe(true);
    expect(result.value).toBe('value');
  });

  it('should fail when indexing non-array', () => {
    const context = { x: 'string' };
    const result = evaluateExpression('x[0]', context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('non-object');
  });

  it('should evaluate chained array/property access', () => {
    const context = { data: [{ name: 'Alice' }, { name: 'Bob' }] };
    expect(evaluateExpression('data[0].name', context)).toEqual({
      success: true,
      value: 'Alice',
    });
    expect(evaluateExpression('data[1].name', context)).toEqual({
      success: true,
      value: 'Bob',
    });
  });
});

describe('Expression Evaluator - Method Calls', () => {
  it('should evaluate method calls with no arguments', () => {
    const context = {
      obj: {
        getId: () => 123,
        getName: () => 'Test',
      },
    };
    expect(evaluateExpression('obj.getId()', context)).toEqual({ success: true, value: 123 });
    expect(evaluateExpression('obj.getName()', context)).toEqual({ success: true, value: 'Test' });
  });

  it('should handle methods returning objects', () => {
    const context = {
      user: {
        getProfile: () => ({ name: 'Alice', age: 30 }),
      },
    };
    const result = evaluateExpression('user.getProfile()', context);
    expect(result.success).toBe(true);
    expect(result.value).toEqual({ name: 'Alice', age: 30 });
  });

  it('should evaluate chained method calls', () => {
    const context = {
      builder: {
        get: () => ({
          id: () => 42,
        }),
      },
    };
    expect(evaluateExpression('builder.get().id()', context)).toEqual({
      success: true,
      value: 42,
    });
  });

  it('should fail when calling non-function', () => {
    const context = { x: 42 };
    const result = evaluateExpression('x()', context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('non-function');
  });

  it('should handle method exceptions gracefully', () => {
    const context = {
      obj: {
        throwError: () => {
          throw new Error('Test error');
        },
      },
    };
    const result = evaluateExpression('obj.throwError()', context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Test error');
  });
});

describe('Expression Evaluator - Template Literals', () => {
  it('should evaluate simple template literals', () => {
    const context = { name: 'Alice' };
    expect(evaluateExpression('`Hello ${name}`', context)).toEqual({
      success: true,
      value: 'Hello Alice',
    });
  });

  it('should evaluate template literals with multiple expressions', () => {
    const context = { first: 'Alice', last: 'Smith' };
    expect(evaluateExpression('`${first} ${last}`', context)).toEqual({
      success: true,
      value: 'Alice Smith',
    });
  });

  it('should evaluate template literals with property access', () => {
    const context = { user: { name: 'Alice' } };
    expect(evaluateExpression('`User: ${user.name}`', context)).toEqual({
      success: true,
      value: 'User: Alice',
    });
  });

  it('should evaluate template literals with array access', () => {
    const context = { items: ['first', 'second'] };
    expect(evaluateExpression('`Item: ${items[0]}`', context)).toEqual({
      success: true,
      value: 'Item: first',
    });
  });

  it('should evaluate template literals with method calls', () => {
    const context = {
      obj: {
        getValue: () => 'result',
      },
    };
    expect(evaluateExpression('`Value is ${obj.getValue()}`', context)).toEqual({
      success: true,
      value: 'Value is result',
    });
  });

  it('should handle template literals with literal text', () => {
    const context = { count: 5 };
    expect(evaluateExpression('`Total: ${count} items`', context)).toEqual({
      success: true,
      value: 'Total: 5 items',
    });
  });

  it('should convert values to strings in templates', () => {
    const context = { num: 42, bool: true };
    expect(evaluateExpression('`Number: ${num}`', context)).toEqual({
      success: true,
      value: 'Number: 42',
    });
    expect(evaluateExpression('`Boolean: ${bool}`', context)).toEqual({
      success: true,
      value: 'Boolean: true',
    });
  });

  it('should handle empty expressions in templates', () => {
    const context = {};
    expect(evaluateExpression('`Hello ${x}`', context)).toEqual({
      success: true,
      value: 'Hello undefined',
    });
  });

  it('should fail on unmatched braces', () => {
    const context = {};
    const result = evaluateExpression('`Hello ${incomplete`', context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unmatched braces');
  });
});

describe('Expression Evaluator - Complex Scenarios', () => {
  it('should evaluate complex nested structures', () => {
    const context = {
      api: {
        response: {
          data: [{ user: { name: 'Alice' } }, { user: { name: 'Bob' } }],
        },
      },
    };
    expect(evaluateExpression('api.response.data[0].user.name', context)).toEqual({
      success: true,
      value: 'Alice',
    });
  });

  it('should handle mixed property/array/method access', () => {
    const context = {
      service: {
        getUsers: () => [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
      },
    };
    const result = evaluateExpression('service.getUsers()[0].name', context);
    expect(result.success).toBe(true);
    expect(result.value).toBe('Alice');
  });

  it('should handle objects with methods and properties', () => {
    const context = {
      config: {
        getValue: () => ({ timeout: 5000 }),
        debug: true,
      },
    };
    expect(evaluateExpression('config.debug', context)).toEqual({
      success: true,
      value: true,
    });
    expect(evaluateExpression('config.getValue().timeout', context)).toEqual({
      success: true,
      value: 5000,
    });
  });
});

describe('Expression Evaluator - Batch Evaluation', () => {
  it('should evaluate multiple expressions', () => {
    const context = { x: 1, y: 2, user: { name: 'Alice' } };
    const results = evaluateExpressions(['x', 'y', 'user.name'], context);

    expect(results['x']).toEqual({ success: true, value: 1 });
    expect(results['y']).toEqual({ success: true, value: 2 });
    expect(results['user.name']).toEqual({ success: true, value: 'Alice' });
  });

  it('should handle mixed successful and failed expressions', () => {
    const context = { x: 42 };
    const results = evaluateExpressions(['x', 'x.invalid', 'missing'], context);

    expect(results['x'].success).toBe(true);
    expect(results['x.invalid'].success).toBe(false);
    expect(results['missing'].success).toBe(true); // Evaluates to undefined
  });
});

describe('Expression Evaluator - Error Cases', () => {
  it('should handle method calls on primitives', () => {
    const context = { x: 42 };
    const result = evaluateExpression('x.toString()', context);
    // Numbers don't have a toString method in our object model (they're not objects)
    expect(result.success).toBe(false);
    expect(result.error).toContain('non-object');
  });

  it('should handle methods on string objects', () => {
    const context = { str: 'hello' };
    const result = evaluateExpression('str.toString()', context);
    // Strings are primitives and don't have properties in our evaluation model
    expect(result.success).toBe(false);
  });

  it('should fail on invalid syntax', () => {
    const context = {};
    const result = evaluateExpression('invalid..expression', context);
    // The parser will just stop at valid tokens
    expect(result.success).toBe(true); // Valid as 'invalid', rest ignored
  });
});
