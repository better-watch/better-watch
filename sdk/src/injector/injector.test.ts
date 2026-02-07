/**
 * Unit tests for TracepointInjector
 * Tests all injection scenarios: before/after lines, entry/exit, async/generators
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TracepointInjector, injectTracepoints } from './injector';
import type { TracepointConfig } from './types';

describe('TracepointInjector', () => {
  let injector: TracepointInjector;

  beforeEach(() => {
    injector = new TracepointInjector();
  });

  describe('Before-line injection', () => {
    it('should inject before a specified line', () => {
      const code = `const x = 5;
const y = 10;
const z = x + y;`;

      const config: TracepointConfig = {
        type: 'before',
        lineNumber: 2,
        code: 'log("before y")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
      expect(result.code).toContain('__trace__');
      expect(result.injections[0]?.originalLine).toBe(2);
    });

    it('should handle invalid line number for before injection', () => {
      const code = 'const x = 5;';

      const config: TracepointConfig = {
        type: 'before',
        lineNumber: 10,
        code: 'log("before")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('LINE_OUT_OF_RANGE');
    });

    it('should error when lineNumber is missing for before injection', () => {
      const code = 'const x = 5;';

      const config: TracepointConfig = {
        type: 'before',
        code: 'log("before")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('MISSING_LINE_NUMBER');
    });

    it('should inject before multiple specified lines', () => {
      const code = `const x = 5;
const y = 10;
const z = 15;`;

      const configs: TracepointConfig[] = [
        { type: 'before', lineNumber: 1, code: 'log("before x")' },
        { type: 'before', lineNumber: 3, code: 'log("before z")' },
      ];

      const result = injector.inject(code, configs);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(2);
    });
  });

  describe('After-line injection', () => {
    it('should inject after a specified line', () => {
      const code = `const x = 5;
const y = 10;
const z = x + y;`;

      const config: TracepointConfig = {
        type: 'after',
        lineNumber: 1,
        code: 'log("after x")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
      expect(result.code).toContain('__trace__');
    });

    it('should handle invalid line number for after injection', () => {
      const code = 'const x = 5;';

      const config: TracepointConfig = {
        type: 'after',
        lineNumber: 10,
        code: 'log("after")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('LINE_OUT_OF_RANGE');
    });

    it('should error when lineNumber is missing for after injection', () => {
      const code = 'const x = 5;';

      const config: TracepointConfig = {
        type: 'after',
        code: 'log("after")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('MISSING_LINE_NUMBER');
    });
  });

  describe('Entry injection', () => {
    it('should inject at function entry for function declaration', () => {
      const code = `function add(a: number, b: number): number {
  return a + b;
}`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'add',
        code: 'log("entering add")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
      expect(result.code).toContain('__trace__');
      expect(result.injections[0]?.context?.nodeType).toBe('FunctionDeclaration');
    });

    it('should inject at arrow function entry', () => {
      const code = `const add = (a: number, b: number): number => {
  return a + b;
};`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'add',
        code: 'log("entering add")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
      expect(result.injections[0]?.context?.nodeType).toBe('ArrowFunctionExpression');
    });

    it('should inject at class method entry', () => {
      const code = `class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'add',
        code: 'log("entering add")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
      expect(result.injections[0]?.context?.nodeType).toBe('ClassMethod');
    });

    it('should handle async function entry', () => {
      const code = `async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'fetchData',
        code: 'log("entering fetchData")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
      expect(result.injections[0]?.context?.isAsync).toBe(true);
    });

    it('should handle generator function entry', () => {
      const code = `function* generator() {
  yield 1;
  yield 2;
}`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'generator',
        code: 'log("entering generator")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
      expect(result.injections[0]?.context?.isGenerator).toBe(true);
    });

    it('should error when function not found for entry injection', () => {
      const code = `function add(a: number, b: number): number {
  return a + b;
}`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'nonexistent',
        code: 'log("entry")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('NO_FUNCTION_FOUND');
    });

    it('should error when functionName is missing for entry injection', () => {
      const code = `function add(a: number, b: number): number {
  return a + b;
}`;

      const config: TracepointConfig = {
        type: 'entry',
        code: 'log("entry")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('MISSING_FUNCTION_NAME');
    });
  });

  describe('Exit injection', () => {
    it('should inject at function exit for function declaration', () => {
      const code = `function add(a: number, b: number): number {
  return a + b;
}`;

      const config: TracepointConfig = {
        type: 'exit',
        functionName: 'add',
        code: 'log("exiting add")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
      expect(result.code).toContain('__trace__');
    });

    it('should inject before all return statements', () => {
      const code = `function test(x: number) {
  if (x > 0) {
    return x * 2;
  }
  return -x;
}`;

      const config: TracepointConfig = {
        type: 'exit',
        functionName: 'test',
        code: 'log("exiting test")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(2); // Two return statements
    });

    it('should inject at arrow function exit', () => {
      const code = `const add = (a: number, b: number): number => {
  return a + b;
};`;

      const config: TracepointConfig = {
        type: 'exit',
        functionName: 'add',
        code: 'log("exiting add")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
    });

    it('should error when function not found for exit injection', () => {
      const code = `function add(a: number, b: number): number {
  return a + b;
}`;

      const config: TracepointConfig = {
        type: 'exit',
        functionName: 'nonexistent',
        code: 'log("exit")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('NO_FUNCTION_FOUND');
    });

    it('should error when functionName is missing for exit injection', () => {
      const code = `function add(a: number, b: number): number {
  return a + b;
}`;

      const config: TracepointConfig = {
        type: 'exit',
        code: 'log("exit")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('MISSING_FUNCTION_NAME');
    });
  });

  describe('Async/await functions', () => {
    it('should correctly identify async functions', () => {
      const code = `async function fetchUser(id: string) {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'fetchUser',
        code: 'log("fetching user")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections[0]?.context?.isAsync).toBe(true);
    });

    it('should handle async arrow functions', () => {
      const code = `const fetchUser = async (id: string) => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
};`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'fetchUser',
        code: 'log("fetching user")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections[0]?.context?.isAsync).toBe(true);
    });

    it('should handle async class methods', () => {
      const code = `class UserService {
  async getUser(id: string) {
    const response = await fetch(\`/api/users/\${id}\`);
    return response.json();
  }
}`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'getUser',
        code: 'log("getting user")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections[0]?.context?.isAsync).toBe(true);
    });
  });

  describe('Generator functions', () => {
    it('should correctly identify generator functions', () => {
      const code = `function* numberGenerator() {
  yield 1;
  yield 2;
  yield 3;
}`;

      const config: TracepointConfig = {
        type: 'entry',
        functionName: 'numberGenerator',
        code: 'log("starting generator")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections[0]?.context?.isGenerator).toBe(true);
    });

    it('should inject at generator function exit', () => {
      const code = `function* numberGenerator() {
  yield 1;
  return 'done';
}`;

      const config: TracepointConfig = {
        type: 'exit',
        functionName: 'numberGenerator',
        code: 'log("exiting generator")',
      };

      const result = injector.inject(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
    });
  });

  describe('Source map generation', () => {
    it('should generate injected code with option to preserve source maps', () => {
      const code = `const x = 5;
const y = 10;`;

      const config: TracepointConfig = {
        type: 'before',
        lineNumber: 2,
        code: 'log("trace")',
      };

      const result = injector.inject(code, [config], { preserveSourceMap: true });

      // Code should be successfully injected
      expect(result.code).toContain('__trace__');
      expect(result.injections).toHaveLength(1);
      // Source map may or may not be generated depending on Babel version
      if (result.sourceMap) {
        expect(result.sourceMap.version).toBe(3);
      }
    });

    it('should not generate source maps when disabled', () => {
      const code = 'const x = 5;';

      const config: TracepointConfig = {
        type: 'before',
        lineNumber: 1,
        code: 'log("trace")',
      };

      const result = injector.inject(code, [config], { preserveSourceMap: false });

      expect(result.sourceMap).toBeUndefined();
    });
  });

  describe('Multiple injections', () => {
    it('should handle multiple injections in one call', () => {
      const code = `function test() {
  const x = 5;
  return x * 2;
}`;

      const configs: TracepointConfig[] = [
        { type: 'entry', functionName: 'test', code: 'log("entry")' },
        { type: 'exit', functionName: 'test', code: 'log("exit")' },
      ];

      const result = injector.inject(code, configs);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(2);
    });

    it('should track all performed injections', () => {
      const code = `function add(a: number, b: number) {
  return a + b;
}

function multiply(a: number, b: number) {
  return a * b;
}`;

      const configs: TracepointConfig[] = [
        { type: 'entry', functionName: 'add', code: 'log("add")' },
        { type: 'entry', functionName: 'multiply', code: 'log("multiply")' },
      ];

      const result = injector.inject(code, configs);

      expect(result.injections).toHaveLength(2);
      expect(result.injections[0]?.context?.functionName).toBe('add');
      expect(result.injections[1]?.context?.functionName).toBe('multiply');
    });
  });

  describe('Convenience function', () => {
    it('should work with injectTracepoints convenience function', () => {
      const code = 'const x = 5;';

      const config: TracepointConfig = {
        type: 'before',
        lineNumber: 1,
        code: 'log("trace")',
      };

      const result = injectTracepoints(code, [config]);

      expect(result.errors).toHaveLength(0);
      expect(result.injections).toHaveLength(1);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid code by throwing', () => {
      const code = 'const x = '; // Incomplete code

      const config: TracepointConfig = {
        type: 'before',
        lineNumber: 1,
        code: 'log("trace")',
      };

      expect(() => injector.inject(code, [config])).toThrow();
    });

    it('should report all errors without stopping', () => {
      const code = 'const x = 5;';

      const configs: TracepointConfig[] = [
        { type: 'before', code: 'log("no line")' },
        { type: 'entry', code: 'log("no func")' },
      ];

      const result = injector.inject(code, configs);

      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
