/**
 * Variable capture mechanism for tracepoint debugging
 * Handles serialization, redaction, and size constraints
 */
import type { CaptureConfig, CapturedValue, CapturedVariables } from './types.js';
/**
 * Variable capture system for tracing and debugging
 */
export declare class VariableCapture {
    private config;
    constructor(config?: CaptureConfig);
    /**
     * Capture variables from a given scope
     */
    captureVariables(variables: Record<string, unknown>, thisContext?: unknown): CapturedVariables;
    /**
     * Capture a single value
     */
    private captureValue;
    /**
     * Serialize a value, handling special types and depth limits
     */
    private serializeValue;
    /**
     * Serialize an array with length limit
     */
    private serializeArray;
    /**
     * Serialize an object with depth limit and redaction
     */
    private serializeObject;
    /**
     * Check if a field name matches sensitive patterns
     */
    private shouldRedact;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<CaptureConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): CaptureConfig;
}
/**
 * Singleton instance for global variable capture
 */
export declare const globalCapture: VariableCapture;
/**
 * Convenience function to capture variables
 */
export declare function captureVariables(variables: Record<string, unknown>, config?: CaptureConfig, thisContext?: unknown): CapturedVariables;
export type { CaptureConfig, CapturedValue, CapturedVariables };
//# sourceMappingURL=index.d.ts.map