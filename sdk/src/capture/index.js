/**
 * Variable capture mechanism for tracepoint debugging
 * Handles serialization, redaction, and size constraints
 */
const DEFAULT_CAPTURE_CONFIG = {
    maxDepth: 2,
    maxArrayLength: 100,
    maxCaptureSize: 10240, // 10KB
    sensitivePatterns: ['password', 'secret', 'token', 'key', 'auth'],
    captureThis: false,
    redactionPlaceholder: '[REDACTED]',
};
/**
 * Variable capture system for tracing and debugging
 */
export class VariableCapture {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_CAPTURE_CONFIG, ...config };
    }
    /**
     * Capture variables from a given scope
     */
    captureVariables(variables, thisContext) {
        let totalSize = 0;
        const captured = {};
        // Capture variables
        for (const [name, value] of Object.entries(variables)) {
            // Check if the variable name should be redacted
            let capturedValue;
            if (this.shouldRedact(name)) {
                // Create a redacted value
                const redacted = this.config.redactionPlaceholder;
                const serialized = JSON.stringify(redacted);
                capturedValue = {
                    value: redacted,
                    size: serialized.length,
                    truncated: false,
                };
            }
            else {
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
        let capturedThis;
        if (this.config.captureThis && thisContext !== undefined && thisContext !== null) {
            capturedThis = this.captureValue(thisContext, new WeakSet());
            totalSize += capturedThis.size;
        }
        return {
            variables: captured,
            thisContext: capturedThis,
            totalSize,
            exceedsLimit: totalSize > this.config.maxCaptureSize,
        };
    }
    /**
     * Capture a single value
     */
    captureValue(value, seenObjects) {
        const captured = this.serializeValue(value, 0, seenObjects);
        let serialized = '';
        try {
            const stringified = JSON.stringify(captured);
            // JSON.stringify returns undefined for undefined values, so we need to handle that
            serialized = stringified === undefined ? 'undefined' : stringified;
        }
        catch {
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
    serializeValue(value, depth, seenObjects) {
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
    serializeArray(arr, depth, seenObjects) {
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
    serializeObject(obj, depth, seenObjects) {
        const result = {};
        // Type assertion for object iteration
        const objRecord = obj;
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
            }
            catch {
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
    shouldRedact(fieldName) {
        const lowerName = fieldName.toLowerCase();
        return this.config.sensitivePatterns.some((pattern) => lowerName.includes(pattern.toLowerCase()));
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration
     */
    getConfig() {
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
export function captureVariables(variables, config, thisContext) {
    const capture = config ? new VariableCapture(config) : globalCapture;
    return capture.captureVariables(variables, thisContext);
}
//# sourceMappingURL=index.js.map