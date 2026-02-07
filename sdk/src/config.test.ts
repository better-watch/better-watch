/**
 * Tests for configuration type definitions and helpers
 */

import { describe, it, expect } from 'vitest';
import {
  isValidCaptureExpression,
  validateTracepointDefinition,
  defineConfig,
  defineTracepoint,
  defineParserConfig,
  defineCaptureConfig,
  defineConfigWithDefaults,
  type TracepointDefinition,
} from './config.js';

describe('Config Validation', () => {
  describe('isValidCaptureExpression', () => {
    it('should accept simple identifiers', () => {
      expect(isValidCaptureExpression('x')).toBe(true);
      expect(isValidCaptureExpression('userId')).toBe(true);
      expect(isValidCaptureExpression('_private')).toBe(true);
      expect(isValidCaptureExpression('$special')).toBe(true);
    });

    it('should accept property access patterns', () => {
      expect(isValidCaptureExpression('user.name')).toBe(true);
      expect(isValidCaptureExpression('data.items')).toBe(true);
      expect(isValidCaptureExpression('response.data.users')).toBe(true);
      expect(isValidCaptureExpression('obj.nested.deep.value')).toBe(true);
    });

    it('should accept array index patterns', () => {
      expect(isValidCaptureExpression('items[0]')).toBe(true);
      expect(isValidCaptureExpression('arr[1]')).toBe(true);
      expect(isValidCaptureExpression('data[0].name')).toBe(true);
    });

    it('should accept computed property patterns', () => {
      expect(isValidCaptureExpression('obj[key]')).toBe(true);
      expect(isValidCaptureExpression('data[index]')).toBe(true);
    });

    it('should accept method calls with no arguments', () => {
      expect(isValidCaptureExpression('obj.getId()')).toBe(true);
      expect(isValidCaptureExpression('user.getName()')).toBe(true);
      expect(isValidCaptureExpression('data.length()')).toBe(true);
      expect(isValidCaptureExpression('response.status()')).toBe(true);
    });

    it('should accept chained method calls', () => {
      expect(isValidCaptureExpression('obj.get().id()')).toBe(true);
      expect(isValidCaptureExpression('data.items().first()')).toBe(true);
      expect(isValidCaptureExpression('response.body().parse()')).toBe(true);
    });

    it('should accept template literals', () => {
      expect(isValidCaptureExpression('`Hello ${name}`')).toBe(true);
      expect(isValidCaptureExpression('`User: ${user.name}`')).toBe(true);
      expect(isValidCaptureExpression('`Count: ${items[0]}`')).toBe(true);
      expect(isValidCaptureExpression('`${x} and ${y}`')).toBe(true);
    });

    it('should reject expressions with side effects', () => {
      // Increment/decrement
      expect(isValidCaptureExpression('x++')).toBe(false);
      expect(isValidCaptureExpression('--y')).toBe(false);
      expect(isValidCaptureExpression('obj.counter++')).toBe(false);

      // Assignment operators
      expect(isValidCaptureExpression('x = 5')).toBe(false);
      expect(isValidCaptureExpression('obj.value = 10')).toBe(false);
      expect(isValidCaptureExpression('x += 1')).toBe(false);
      expect(isValidCaptureExpression('data -= 5')).toBe(false);
      expect(isValidCaptureExpression('n *= 2')).toBe(false);
      expect(isValidCaptureExpression('x /= 10')).toBe(false);

      // Delete operator
      expect(isValidCaptureExpression('delete obj.prop')).toBe(false);
    });

    it('should reject invalid expressions', () => {
      expect(isValidCaptureExpression('')).toBe(false);
      expect(isValidCaptureExpression('  ')).toBe(false);
      expect(isValidCaptureExpression('123var')).toBe(false);
      expect(isValidCaptureExpression('user-name')).toBe(false);
      expect(isValidCaptureExpression('data[')).toBe(false);
      expect(isValidCaptureExpression('obj.123')).toBe(false);
      expect(isValidCaptureExpression('func(arg)')).toBe(false); // Method calls with arguments not supported
    });
  });

  describe('validateTracepointDefinition', () => {
    it('should validate correct entry tracepoint', () => {
      const tp: TracepointDefinition = {
        id: 'test-entry',
        type: 'entry',
        functionName: 'myFunc',
      };

      const errors = validateTracepointDefinition(tp);
      expect(errors).toEqual([]);
    });

    it('should validate correct before tracepoint', () => {
      const tp: TracepointDefinition = {
        id: 'test-before',
        type: 'before',
        lineNumber: 10,
      };

      const errors = validateTracepointDefinition(tp);
      expect(errors).toEqual([]);
    });

    it('should require id', () => {
      const tp = {
        type: 'entry',
        functionName: 'myFunc',
      } as unknown as TracepointDefinition;

      const errors = validateTracepointDefinition(tp);
      expect(errors).toContain('Tracepoint must have an id');
    });

    it('should require type', () => {
      const tp = {
        id: 'test',
      } as unknown as TracepointDefinition;

      const errors = validateTracepointDefinition(tp);
      expect(errors).toContain('Tracepoint must have a type');
    });

    it('should validate injection type', () => {
      const tp = {
        id: 'test',
        type: 'invalid',
      } as unknown as TracepointDefinition;

      const errors = validateTracepointDefinition(tp);
      expect(errors.some((e) => e.includes('Invalid injection type'))).toBe(
        true
      );
    });

    it('should require lineNumber for before type', () => {
      const tp: TracepointDefinition = {
        id: 'test-before',
        type: 'before',
      };

      const errors = validateTracepointDefinition(tp);
      expect(errors.some((e) => e.includes('lineNumber'))).toBe(true);
    });

    it('should require functionName or functionPath for entry type', () => {
      const tp: TracepointDefinition = {
        id: 'test-entry',
        type: 'entry',
      };

      const errors = validateTracepointDefinition(tp);
      expect(errors.some((e) => e.includes('functionName or functionPath'))).toBe(
        true
      );
    });

    it('should validate capture expressions', () => {
      const tp: TracepointDefinition = {
        id: 'test',
        type: 'entry',
        functionName: 'func',
        captureExpressions: ['valid', 'also.valid', 'invalid-expr'],
      };

      const errors = validateTracepointDefinition(tp);
      expect(errors.some((e) => e.includes('invalid-expr'))).toBe(true);
    });

    it('should validate capture config values', () => {
      const tp: TracepointDefinition = {
        id: 'test',
        type: 'entry',
        functionName: 'func',
        captureConfig: {
          maxDepth: -1,
          maxArrayLength: 0,
        },
      };

      const errors = validateTracepointDefinition(tp);
      expect(errors.some((e) => e.includes('maxDepth'))).toBe(true);
      expect(errors.some((e) => e.includes('maxArrayLength'))).toBe(true);
    });
  });

  describe('defineTracepoint', () => {
    it('should create valid tracepoint', () => {
      const tp = defineTracepoint({
        id: 'test',
        type: 'entry',
        functionName: 'myFunc',
        captureExpressions: ['arg1', 'arg2'],
      });

      expect(tp.id).toBe('test');
      expect(tp.type).toBe('entry');
    });

    it('should throw on invalid tracepoint', () => {
      expect(() => {
        defineTracepoint({
          id: 'test',
          type: 'before',
          // Missing required lineNumber
        });
      }).toThrow();
    });
  });

  describe('defineConfig', () => {
    it('should create valid config', () => {
      const config = defineConfig({
        tracepoints: [
          {
            id: 'test-1',
            type: 'entry',
            functionName: 'func1',
          },
          {
            id: 'test-2',
            type: 'exit',
            functionName: 'func2',
          },
        ],
      });

      expect(config.tracepoints).toHaveLength(2);
    });

    it('should throw on invalid tracepoint in config', () => {
      expect(() => {
        defineConfig({
          tracepoints: [
            {
              id: 'test',
              type: 'before',
              // Missing required lineNumber
            } as unknown as TracepointDefinition,
          ],
        });
      }).toThrow();
    });

    it('should accept optional fields', () => {
      const config = defineConfig({
        parser: {
          isModule: true,
          isTypeScript: true,
        },
        capture: {
          maxDepth: 3,
          maxArrayLength: 50,
        },
        tracepoints: [
          {
            id: 'test',
            type: 'entry',
            functionName: 'func',
          },
        ],
        environment: 'production',
        projectId: 'my-project',
      });

      expect(config.parser?.isModule).toBe(true);
      expect(config.capture?.maxDepth).toBe(3);
      expect(config.environment).toBe('production');
      expect(config.projectId).toBe('my-project');
    });
  });

  describe('defineParserConfig', () => {
    it('should provide sensible defaults', () => {
      const config = defineParserConfig();

      expect(config.isModule).toBe(true);
      expect(config.isTypeScript).toBe(true);
      expect(config.hasJSX).toBe(true);
      expect(config.sourceMap).toBe(true);
    });

    it('should allow overrides', () => {
      const config = defineParserConfig({
        isModule: false,
        isTypeScript: false,
      });

      expect(config.isModule).toBe(false);
      expect(config.isTypeScript).toBe(false);
      expect(config.hasJSX).toBe(true); // Still defaults
    });
  });

  describe('defineCaptureConfig', () => {
    it('should provide sensible defaults', () => {
      const config = defineCaptureConfig();

      expect(config.maxDepth).toBe(2);
      expect(config.maxArrayLength).toBe(100);
      expect(config.maxCaptureSize).toBe(10240);
      expect(config.captureThis).toBe(true);
      expect(config.sensitivePatterns).toContain('password');
      expect(config.redactionPlaceholder).toBe('[REDACTED]');
    });

    it('should allow overrides', () => {
      const config = defineCaptureConfig({
        maxDepth: 5,
        sensitivePatterns: ['custom'],
      });

      expect(config.maxDepth).toBe(5);
      expect(config.sensitivePatterns).toEqual(['custom']);
      expect(config.maxArrayLength).toBe(100); // Still defaults
    });
  });

  describe('defineConfigWithDefaults', () => {
    it('should merge with defaults', () => {
      const config = defineConfigWithDefaults({
        tracepoints: [
          {
            id: 'test',
            type: 'entry',
            functionName: 'func',
          },
        ],
      });

      expect(config.parser?.isModule).toBe(true);
      expect(config.capture?.maxDepth).toBe(2);
      expect(config.tracepoints).toHaveLength(1);
    });

    it('should allow custom defaults', () => {
      const config = defineConfigWithDefaults({
        parser: {
          isModule: false,
        },
        capture: {
          maxDepth: 4,
        },
        tracepoints: [
          {
            id: 'test',
            type: 'entry',
            functionName: 'func',
          },
        ],
      });

      expect(config.parser?.isModule).toBe(false);
      expect(config.capture?.maxDepth).toBe(4);
    });

    it('should validate all tracepoints', () => {
      expect(() => {
        defineConfigWithDefaults({
          tracepoints: [
            {
              id: 'test',
              type: 'before',
              // Missing required lineNumber
            } as unknown as TracepointDefinition,
          ],
        });
      }).toThrow();
    });
  });

  describe('Type Inference', () => {
    it('should provide autocomplete for tracepoint types', () => {
      const tp: TracepointDefinition = {
        id: 'test',
        type: 'entry',
        functionName: 'func',
        captureExpressions: ['x'], // Type-safe array
        captureConfig: {
          maxDepth: 2, // Type-safe number
        },
      };

      expect(tp.type).toBe('entry');
    });

    it('should provide autocomplete for injection point type', () => {
      // This is primarily a compile-time check via TypeScript
      const types: Array<TracepointDefinition['type']> = [
        'before',
        'after',
        'entry',
        'exit',
      ];

      expect(types).toHaveLength(4);
    });
  });
});
