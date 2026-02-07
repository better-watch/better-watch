/**
 * Tests for variable capture mechanism
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VariableCapture, captureVariables } from './index.js';
import type { CaptureConfig } from './types.js';

describe('VariableCapture - Primitive Values', () => {
  let capture: VariableCapture;

  beforeEach(() => {
    capture = new VariableCapture();
  });

  it('should capture string values', () => {
    const vars = { msg: 'hello world' };
    const result = capture.captureVariables(vars);

    expect(result.variables.msg.value).toBe('hello world');
    expect(result.variables.msg.truncated).toBe(false);
    expect(result.variables.msg.size).toBeGreaterThan(0);
  });

  it('should capture number values', () => {
    const vars = { num: 42, float: 3.14 };
    const result = capture.captureVariables(vars);

    expect(result.variables.num.value).toBe(42);
    expect(result.variables.float.value).toBe(3.14);
  });

  it('should capture boolean values', () => {
    const vars = { isActive: true, isDisabled: false };
    const result = capture.captureVariables(vars);

    expect(result.variables.isActive.value).toBe(true);
    expect(result.variables.isDisabled.value).toBe(false);
  });

  it('should capture null and undefined', () => {
    const vars = { nullVal: null, undefinedVal: undefined };
    const result = capture.captureVariables(vars);

    expect(result.variables.nullVal.value).toBe(null);
    expect(result.variables.undefinedVal.value).toBe(undefined);
  });
});

describe('VariableCapture - Object References', () => {
  let capture: VariableCapture;

  beforeEach(() => {
    capture = new VariableCapture({ maxDepth: 2 });
  });

  it('should capture object with default depth limit', () => {
    const vars = {
      user: {
        name: 'Alice',
        profile: {
          age: 30,
          city: 'NYC',
          address: {
            street: 'Main St',
          },
        },
      },
    };
    const result = capture.captureVariables(vars);
    const captured = result.variables.user.value as Record<string, unknown>;

    expect(captured.name).toBe('Alice');
    // Should include first level nested object
    const profile = captured.profile as Record<string, unknown>;
    expect(profile.age).toBe(30);
    // Should limit to maxDepth
    const address = profile.address as Record<string, unknown>;
    expect(address.__type__).toBe('MaxDepthExceeded');
  });

  it('should capture shallow objects', () => {
    const vars = { obj: { a: 1, b: 2, c: 3 } };
    const result = capture.captureVariables(vars);
    const captured = result.variables.obj.value as Record<string, unknown>;

    expect(captured.a).toBe(1);
    expect(captured.b).toBe(2);
    expect(captured.c).toBe(3);
  });

  it('should skip prototype chain properties', () => {
    const obj = Object.create(null);
    obj.ownProp = 'value';
    const vars = { obj };
    const result = capture.captureVariables(vars);
    const captured = result.variables.obj.value as Record<string, unknown>;

    expect(captured.ownProp).toBe('value');
  });
});

describe('VariableCapture - Array Contents', () => {
  let capture: VariableCapture;

  beforeEach(() => {
    capture = new VariableCapture({ maxArrayLength: 3 });
  });

  it('should capture array with default limit', () => {
    const vars = { arr: [1, 2, 3, 4, 5] };
    const result = capture.captureVariables(vars);
    const captured = result.variables.arr.value as unknown[];

    expect(captured.length).toBe(4); // 3 items + 1 truncation marker
    expect(captured[0]).toBe(1);
    expect(captured[1]).toBe(2);
    expect(captured[2]).toBe(3);
    const truncationMsg = captured[3] as Record<string, unknown>;
    expect(truncationMsg.__type__).toBe('ArrayTruncated');
  });

  it('should capture array within depth limit', () => {
    const vars = { arr: [{ x: 1 }, { y: 2 }] };
    const result = capture.captureVariables(vars);
    const captured = result.variables.arr.value as unknown[];

    expect(captured.length).toBe(2);
    const first = captured[0] as Record<string, unknown>;
    expect(first.x).toBe(1);
  });

  it('should handle empty arrays', () => {
    const vars = { empty: [] };
    const result = capture.captureVariables(vars);
    const captured = result.variables.empty.value as unknown[];

    expect(captured).toEqual([]);
  });
});

describe('VariableCapture - Circular References', () => {
  let capture: VariableCapture;

  beforeEach(() => {
    capture = new VariableCapture();
  });

  it('should handle circular object references', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    obj.self = obj; // circular reference

    const vars = { obj };
    const result = capture.captureVariables(vars);
    const captured = result.variables.obj.value as Record<string, unknown>;

    expect(captured.name).toBe('test');
    const selfRef = captured.self as Record<string, unknown>;
    expect(selfRef.__type__).toBe('CircularReference');
  });

  it('should handle array circular references', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any[] = [1, 2, 3];
    arr.push(arr); // circular reference

    const vars = { arr };
    const result = capture.captureVariables(vars);
    const captured = result.variables.arr.value as unknown[];

    expect(captured[0]).toBe(1);
    expect(captured[1]).toBe(2);
    expect(captured[2]).toBe(3);
    const circularRef = captured[3] as Record<string, unknown>;
    expect(circularRef.__type__).toBe('CircularReference');
  });
});

describe('VariableCapture - Sensitive Field Redaction', () => {
  let capture: VariableCapture;

  beforeEach(() => {
    capture = new VariableCapture({
      sensitivePatterns: ['password', 'secret', 'token', 'key'],
    });
  });

  it('should redact password fields', () => {
    const vars = { user: { name: 'Alice', password: 'secret123' } };
    const result = capture.captureVariables(vars);
    const captured = result.variables.user.value as Record<string, unknown>;

    expect(captured.name).toBe('Alice');
    expect(captured.password).toBe('[REDACTED]');
  });

  it('should redact multiple sensitive fields', () => {
    const vars = {
      credentials: {
        apiKey: 'key123',
        secretToken: 'token456',
        username: 'user',
      },
    };
    const result = capture.captureVariables(vars);
    const captured = result.variables.credentials.value as Record<string, unknown>;

    expect(captured.username).toBe('user');
    expect(captured.apiKey).toBe('[REDACTED]');
    expect(captured.secretToken).toBe('[REDACTED]');
  });

  it('should use custom redaction placeholder', () => {
    const customCapture = new VariableCapture({
      sensitivePatterns: ['secret'],
      redactionPlaceholder: '***',
    });
    const vars = { data: { secret: 'hidden', value: 'visible' } };
    const result = customCapture.captureVariables(vars);
    const captured = result.variables.data.value as Record<string, unknown>;

    expect(captured.secret).toBe('***');
    expect(captured.value).toBe('visible');
  });

  it('should be case-insensitive for redaction patterns', () => {
    const vars = {
      obj: {
        PASSWORD: 'secret',
        Secret_Field: 'value',
        normalField: 'normal',
      },
    };
    const result = capture.captureVariables(vars);
    const captured = result.variables.obj.value as Record<string, unknown>;

    expect(captured.PASSWORD).toBe('[REDACTED]');
    expect(captured.Secret_Field).toBe('[REDACTED]');
    expect(captured.normalField).toBe('normal');
  });
});

describe('VariableCapture - Special Type Serialization', () => {
  let capture: VariableCapture;

  beforeEach(() => {
    capture = new VariableCapture();
  });

  it('should serialize BigInt', () => {
    const vars = { big: BigInt('9007199254740991') };
    const result = capture.captureVariables(vars);
    const captured = result.variables.big.value as Record<string, unknown>;

    expect(captured.__type__).toBe('BigInt');
    expect(captured.value).toBe('9007199254740991');
  });

  it('should serialize Symbol', () => {
    const vars = { sym: Symbol('test') };
    const result = capture.captureVariables(vars);
    const captured = result.variables.sym.value as Record<string, unknown>;

    expect(captured.__type__).toBe('Symbol');
    expect(typeof captured.value).toBe('string');
    expect(captured.value).toContain('test');
  });

  it('should serialize Date', () => {
    const date = new Date('2026-01-15T10:30:00Z');
    const vars = { date };
    const result = capture.captureVariables(vars);
    const captured = result.variables.date.value as Record<string, unknown>;

    expect(captured.__type__).toBe('Date');
    expect(captured.value).toBe('2026-01-15T10:30:00.000Z');
  });

  it('should serialize mixed special types in objects', () => {
    const vars = {
      mixed: {
        num: 42,
        date: new Date('2026-01-15'),
        big: BigInt('999'),
        sym: Symbol('key'),
      },
    };
    const result = capture.captureVariables(vars);
    const captured = result.variables.mixed.value as Record<string, unknown>;

    expect(captured.num).toBe(42);
    const dateCapture = captured.date as Record<string, unknown>;
    expect(dateCapture.__type__).toBe('Date');
    const bigCapture = captured.big as Record<string, unknown>;
    expect(bigCapture.__type__).toBe('BigInt');
    const symCapture = captured.sym as Record<string, unknown>;
    expect(symCapture.__type__).toBe('Symbol');
  });
});

describe('VariableCapture - This Context', () => {
  let capture: VariableCapture;

  beforeEach(() => {
    capture = new VariableCapture({ captureThis: true });
  });

  it('should capture this context when enabled', () => {
    const thisContext = { prop: 'value', num: 42 };
    const vars = { local: 'variable' };
    const result = capture.captureVariables(vars, thisContext);

    expect(result.thisContext).toBeDefined();
    const thisCapture = result.thisContext?.value as Record<string, unknown>;
    expect(thisCapture.prop).toBe('value');
    expect(thisCapture.num).toBe(42);
  });

  it('should not capture this context when disabled', () => {
    const noCapture = new VariableCapture({ captureThis: false });
    const thisContext = { prop: 'value' };
    const vars = { local: 'variable' };
    const result = noCapture.captureVariables(vars, thisContext);

    expect(result.thisContext).toBeUndefined();
  });

  it('should handle null this context', () => {
    const vars = { x: 1 };
    const result = capture.captureVariables(vars, null);

    expect(result.thisContext).toBeUndefined();
  });

  it('should handle undefined this context', () => {
    const vars = { x: 1 };
    const result = capture.captureVariables(vars, undefined);

    expect(result.thisContext).toBeUndefined();
  });
});

describe('VariableCapture - Size Limits', () => {
  it('should track total capture size', () => {
    const capture = new VariableCapture();
    const vars = { str: 'hello', num: 42, obj: { key: 'value' } };
    const result = capture.captureVariables(vars);

    expect(result.totalSize).toBeGreaterThan(0);
    expect(result.totalSize).toEqual(
      result.variables.str.size + result.variables.num.size + result.variables.obj.size
    );
  });

  it('should flag when size exceeds limit', () => {
    const capture = new VariableCapture({ maxCaptureSize: 50 }); // very small limit
    const vars = {
      largeString: 'x'.repeat(200),
      anotherString: 'y'.repeat(200),
    };
    const result = capture.captureVariables(vars);

    expect(result.exceedsLimit).toBe(true);
  });

  it('should stop capturing when size limit reached', () => {
    const capture = new VariableCapture({ maxCaptureSize: 100 });
    const vars = {
      first: 'a'.repeat(80),
      second: 'b'.repeat(80),
      third: 'c'.repeat(80),
    };
    const result = capture.captureVariables(vars);

    // Should have stopped after exceeding limit
    expect(result.exceedsLimit).toBe(true);
    expect(result.totalSize).toBeLessThanOrEqual(100 + 200); // Allow some margin for JSON overhead
  });
});

describe('VariableCapture - Configuration Updates', () => {
  it('should update configuration dynamically', () => {
    const capture = new VariableCapture({ maxDepth: 1 });
    expect(capture.getConfig().maxDepth).toBe(1);

    capture.updateConfig({ maxDepth: 5 });
    expect(capture.getConfig().maxDepth).toBe(5);
  });

  it('should partially update configuration', () => {
    const capture = new VariableCapture({
      maxDepth: 2,
      maxArrayLength: 50,
      sensitivePatterns: ['password'],
    });

    capture.updateConfig({ maxArrayLength: 200 });
    const config = capture.getConfig();

    expect(config.maxDepth).toBe(2);
    expect(config.maxArrayLength).toBe(200);
    expect(config.sensitivePatterns).toEqual(['password']);
  });
});

describe('captureVariables - Convenience Function', () => {
  it('should use default configuration when none provided', () => {
    const vars = { x: 1 };
    const result = captureVariables(vars);

    expect(result.variables.x.value).toBe(1);
    expect(result.totalSize).toBeGreaterThan(0);
  });

  it('should accept custom configuration', () => {
    const config: CaptureConfig = {
      maxDepth: 1,
      sensitivePatterns: ['secret'],
    };
    const vars = { secret: 'hidden' };
    const result = captureVariables(vars, config);

    expect(result.variables.secret.value).toBe('[REDACTED]');
  });
});

describe('VariableCapture - Edge Cases', () => {
  let capture: VariableCapture;

  beforeEach(() => {
    capture = new VariableCapture();
  });

  it('should handle objects with error-prone properties', () => {
    const obj = {};
    Object.defineProperty(obj, 'errorProp', {
      enumerable: true,
      get() {
        throw new Error('Cannot access');
      },
    });

    const vars = { obj };
    const result = capture.captureVariables(vars);
    const captured = result.variables.obj.value as Record<string, unknown>;
    const errorInfo = captured.errorProp as Record<string, unknown>;

    expect(errorInfo.__type__).toBe('Error');
    expect(errorInfo.message).toBe('Failed to serialize property');
  });

  it('should handle nested arrays with objects', () => {
    const vars = {
      nested: [
        { a: 1 },
        [2, 3],
        { b: { c: 4 } },
      ],
    };
    const result = capture.captureVariables(vars);
    const captured = result.variables.nested.value as unknown[];

    expect(Array.isArray(captured[0])).toBe(false);
    const firstItem = captured[0] as Record<string, unknown>;
    expect(firstItem.a).toBe(1);

    expect(Array.isArray(captured[1])).toBe(true);
  });

  it('should handle very deep nesting with graceful degradation', () => {
    const vars = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: 'deep',
            },
          },
        },
      },
    };
    const result = capture.captureVariables(vars);
    const level1 = result.variables.level1.value as Record<string, unknown>;
    const level2 = level1.level2 as Record<string, unknown>;
    const level3 = level2.level3 as Record<string, unknown>;

    expect(level3.__type__).toBe('MaxDepthExceeded');
  });
});
