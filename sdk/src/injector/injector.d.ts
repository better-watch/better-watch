/**
 * Tracepoint injection system for transforming source code
 * Supports injection before/after lines and at function entry/exit points
 */
import type { TracepointConfig, InjectionResult } from './types.js';
/**
 * Tracepoint Injector class for transforming source code with trace injections
 */
export declare class TracepointInjector {
    /**
     * Inject tracepoints into source code
     *
     * @param sourceCode - The source code to transform
     * @param configs - Array of injection configurations
     * @param options - Additional options for injection
     * @returns The transformed code with source maps
     */
    inject(sourceCode: string, configs: TracepointConfig[], options?: {
        filename?: string;
        preserveSourceMap?: boolean;
    }): InjectionResult;
    /**
     * Inject code before a specified line number
     */
    private injectBefore;
    /**
     * Inject code after a specified line number
     */
    private injectAfter;
    /**
     * Inject code at function entry
     */
    private injectAtEntry;
    /**
     * Inject code at function exit (before all return statements)
     */
    private injectAtExit;
    /**
     * Helper to inject at all return statements
     */
    private injectAtReturns;
    /**
     * Create a trace statement node
     */
    private createTraceStatement;
    /**
     * Enhance source map with metadata from injections
     */
    private enhanceSourceMap;
}
/**
 * Singleton instance of the injector
 */
export declare const injector: TracepointInjector;
/**
 * Convenience function to inject tracepoints
 */
export declare function injectTracepoints(sourceCode: string, configs: TracepointConfig[], options?: {
    filename?: string;
    preserveSourceMap?: boolean;
}): InjectionResult;
//# sourceMappingURL=injector.d.ts.map