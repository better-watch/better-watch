/**
 * Type definitions for the tracepoint injection module
 */
/**
 * Tracepoint injection point type
 */
export type InjectionPointType = 'before' | 'after' | 'entry' | 'exit';
/**
 * Configuration for a tracepoint injection
 */
export interface TracepointConfig {
    /**
     * Type of injection point
     */
    type: InjectionPointType;
    /**
     * Line number for before/after injections (1-indexed)
     */
    lineNumber?: number;
    /**
     * Function name or path for entry/exit injections
     */
    functionName?: string;
    /**
     * Function path for nested functions (e.g., "ClassName.methodName")
     */
    functionPath?: string;
    /**
     * Custom code to inject or tracepoint identifier
     */
    code: string;
    /**
     * Whether to inject into async functions
     */
    includeAsync?: boolean;
    /**
     * Whether to inject into generator functions
     */
    includeGenerators?: boolean;
}
/**
 * Result of a tracepoint injection operation
 */
export interface InjectionResult {
    /**
     * The transformed source code
     */
    code: string;
    /**
     * New source map for the transformed code
     */
    sourceMap?: {
        version: number;
        sources: string[];
        names: string[];
        mappings: string;
        sourcesContent?: (string | null)[];
    };
    /**
     * Injections performed
     */
    injections: PerformedInjection[];
    /**
     * Any errors encountered during injection
     */
    errors: InjectionError[];
}
/**
 * Information about a performed injection
 */
export interface PerformedInjection {
    /**
     * The configuration used for this injection
     */
    config: TracepointConfig;
    /**
     * The original line where injection occurred
     */
    originalLine?: number;
    /**
     * The new line(s) where injection was added
     */
    injectedLines: number[];
    /**
     * The injected code snippet
     */
    injectedCode: string;
    /**
     * Context information about the injection point
     */
    context?: {
        nodeType?: string;
        functionName?: string;
        isAsync?: boolean;
        isGenerator?: boolean;
    };
}
/**
 * Information about an injection error
 */
export interface InjectionError {
    /**
     * The configuration that caused the error
     */
    config: TracepointConfig;
    /**
     * Error message
     */
    message: string;
    /**
     * Error code
     */
    code?: string;
    /**
     * Line number where error occurred
     */
    lineNumber?: number;
}
/**
 * Source map generation metadata
 */
export interface SourceMapMetadata {
    /**
     * Original line number
     */
    originalLine: number;
    /**
     * Original column number
     */
    originalColumn: number;
    /**
     * Generated line number
     */
    generatedLine: number;
    /**
     * Generated column number
     */
    generatedColumn: number;
    /**
     * Name in the source
     */
    name?: string;
}
//# sourceMappingURL=types.d.ts.map