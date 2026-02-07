/**
 * Variable capture mechanism for tracepoint debugging
 * Handles serialization, redaction, and size constraints
 */

import type { CaptureConfig, CapturedValue, CapturedVariables } from './types.js';

const DEFAULT_CAPTURE_CONFIG: Required<CaptureConfig> = {
  maxDepth: 2,
  maxArrayLength: 100,
  maxCaptureSize: 10240, // 10KB
  sensitivePatterns: ['password', 'secret', 'token', 'key', 'auth'],
  captureThis: false,
  redactionPlaceholder: '[REDACTED]',
  samplingRate: 100,
  serializationTimeout: 5000,
};

/**
 * Variable capture system for tracing and debugging
 */
export class VariableCapture {
  private config: Required<CaptureConfig>;

  constructor(config?: CaptureConfig) {
    this.config = { ...DEFAULT_CAPTURE_CONFIG, ...config };
  }

  /**
   * Check if this trace should be sampled in
   */
  private shouldCapture(): boolean {
    if (this.config.samplingRate >= 100) {
      return true;
    }
    if (this.config.samplingRate <= 0) {
      return false;
    }
    return Math.random() * 100 < this.config.samplingRate;
  }

  /**
   * Capture variables from a given scope with timeout support
   */
  public captureVariables(
    variables: Record<string, unknown>,
    thisContext?: unknown
  ): CapturedVariables {
    // Check sampling rate
    if (!this.shouldCapture()) {
      return {
        variables: {},
        totalSize: 0,
        sampledOut: true,
      };
    }

    let totalSize = 0;
    const captured: Record<string, CapturedValue> = {};
    let timedOut = false;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.serializationTimeout);

    try {
      // Capture variables
      for (const [name, value] of Object.entries(variables)) {
        // Check if timeout occurred
        if (controller.signal.aborted) {
          timedOut = true;
          break;
        }

        // Check if the variable name should be redacted
        let capturedValue: CapturedValue;
        if (this.shouldRedact(name)) {
          // Create a redacted value
          const redacted = this.config.redactionPlaceholder;
          const serialized = JSON.stringify(redacted);
          capturedValue = {
            value: redacted,
            size: serialized.length,
            truncated: false,
          };
        } else {
          capturedValue = this.captureValue(value, new WeakSet());
        }
        captured[name] = capturedValue;
        totalSize += capturedValue.size;

        // Early exit if we exceed the limit
        if (totalSize > this.config.maxCaptureSize) {
          return {
            variables: captured,
            thisContext: thisContext ? this.captureValue(thisContext, new WeakSet()) : undefined,
            totalSize,
            exceedsLimit: true,
          };
        }
      }

      // Capture this context if enabled
      let capturedThis: CapturedValue | undefined;
      if (!controller.signal.aborted && this.config.captureThis && thisContext !== undefined && thisContext !== null) {
        capturedThis = this.captureValue(thisContext, new WeakSet());
        totalSize += capturedThis.size;
      }

      return {
        variables: captured,
        thisContext: capturedThis,
        totalSize,
        exceedsLimit: totalSize > this.config.maxCaptureSize,
        timedOut,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Capture a single value
   */
  private captureValue(value: unknown, seenObjects: WeakSet<object>): CapturedValue {
    const captured = this.serializeValue(value, 0, seenObjects);
    let serialized = '';
    try {
      const stringified = JSON.stringify(captured);
      // JSON.stringify returns undefined for undefined values, so we need to handle that
      serialized = stringified === undefined ? 'undefined' : stringified;
    } catch {
      // If serialization fails, use a fallback
      serialized = JSON.stringify({ __type__: 'SerializationError', message: 'Failed to serialize' }) || '';
    }

    return {
      value: captured,
      size: serialized.length,
      truncated: false,
    };
  }

  /**
   * Serialize a value, handling special types and depth limits
   */
  private serializeValue(
    value: unknown,
    depth: number,
    seenObjects: WeakSet<object>
  ): unknown {
    // Handle primitives
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      return {
        __type__: 'BigInt',
        value: value.toString(),
      };
    }

    // Handle Symbol
    if (typeof value === 'symbol') {
      return {
        __type__: 'Symbol',
        value: value.toString(),
      };
    }

    // Handle Date
    if (value instanceof Date) {
      return {
        __type__: 'Date',
        value: value.toISOString(),
      };
    }

    // Check if it's an object type that we should handle
    if (typeof value !== 'object') {
      return value;
    }

    // Handle circular references
    if (seenObjects.has(value)) {
      return {
        __type__: 'CircularReference',
        message: 'Circular reference detected',
      };
    }

    // Max depth check
    if (depth >= this.config.maxDepth) {
      return {
        __type__: 'MaxDepthExceeded',
        message: `Max depth (${this.config.maxDepth}) exceeded`,
      };
    }

    // Mark as seen before recursion
    seenObjects.add(value);

    // Handle arrays
    if (Array.isArray(value)) {
      return this.serializeArray(value, depth, seenObjects);
    }

    // Handle objects
    return this.serializeObject(value, depth, seenObjects);
  }

  /**
   * Serialize an array with length limit
   */
  private serializeArray(
    arr: unknown[],
    depth: number,
    seenObjects: WeakSet<object>
  ): unknown {
    const truncated = arr.length > this.config.maxArrayLength;
    const items = arr
      .slice(0, this.config.maxArrayLength)
      .map((item) => this.serializeValue(item, depth + 1, seenObjects));

    if (truncated) {
      items.push({
        __type__: 'ArrayTruncated',
        message: `Array truncated from ${arr.length} to ${this.config.maxArrayLength} items`,
      });
    }

    return items;
  }

  /**
   * Serialize an object with depth limit and redaction
   */
  private serializeObject(
    obj: unknown,
    depth: number,
    seenObjects: WeakSet<object>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Type assertion for object iteration
    const objRecord = obj as Record<string, unknown>;

    for (const key in objRecord) {
      // Skip prototype chain properties
      if (!Object.prototype.hasOwnProperty.call(objRecord, key)) {
        continue;
      }

      // Check if field should be redacted
      if (this.shouldRedact(key)) {
        result[key] = this.config.redactionPlaceholder;
        continue;
      }

      try {
        const value = objRecord[key];
        result[key] = this.serializeValue(value, depth + 1, seenObjects);
      } catch {
        result[key] = {
          __type__: 'Error',
          message: 'Failed to serialize property',
        };
      }
    }

    return result;
  }

  /**
   * Check if a field name matches sensitive patterns
   */
  private shouldRedact(fieldName: string): boolean {
    const lowerName = fieldName.toLowerCase();
    return this.config.sensitivePatterns.some((pattern) => lowerName.includes(pattern.toLowerCase()));
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<CaptureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): CaptureConfig {
    return { ...this.config };
  }
}

/**
 * Singleton instance for global variable capture
 */
export const globalCapture = new VariableCapture();

/**
 * Convenience function to capture variables
 */
export function captureVariables(
  variables: Record<string, unknown>,
  config?: CaptureConfig,
  thisContext?: unknown
): CapturedVariables {
  const capture = config ? new VariableCapture(config) : globalCapture;
  return capture.captureVariables(variables, thisContext);
}

export type { CaptureConfig, CapturedValue, CapturedVariables };
