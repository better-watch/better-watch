/**
 * Type definitions for variable capture mechanism
 */
/**
 * Configuration for variable capture behavior
 */
export interface CaptureConfig {
    /**
     * Maximum depth for capturing object properties (default: 2)
     */
    maxDepth?: number;
    /**
     * Maximum number of array elements to capture (default: 100)
     */
    maxArrayLength?: number;
    /**
     * Maximum size in bytes for captured data (default: 10240 = 10KB)
     */
    maxCaptureSize?: number;
    /**
     * Patterns for sensitive fields that should be redacted (default: password, secret, token, key, auth)
     */
    sensitivePatterns?: string[];
    /**
     * Whether to capture the `this` context
     */
    captureThis?: boolean;
    /**
     * Redaction placeholder text (default: '[REDACTED]')
     */
    redactionPlaceholder?: string;
}
/**
 * Result of variable capture
 */
export interface CapturedValue {
    /**
     * The serialized value
     */
    value: unknown;
    /**
     * Whether the capture was truncated due to size limits
     */
    truncated?: boolean;
    /**
     * Error message if capture failed
     */
    error?: string;
    /**
     * Size of the captured data in bytes
     */
    size: number;
}
/**
 * Variables captured at a tracepoint
 */
export interface CapturedVariables {
    /**
     * Map of variable names to captured values
     */
    variables: Record<string, CapturedValue>;
    /**
     * Captured `this` context if captureThis is enabled
     */
    thisContext?: CapturedValue;
    /**
     * Total size of all captured data in bytes
     */
    totalSize: number;
    /**
     * Whether total size exceeded the limit
     */
    exceedsLimit?: boolean;
}
//# sourceMappingURL=types.d.ts.map