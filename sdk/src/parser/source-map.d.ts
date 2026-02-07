/**
 * Source map utilities for accurate line and column mapping
 */
import type { RawSourceMap } from 'source-map';
/**
 * Handles source map operations for mapping generated code back to original source
 */
export declare class SourceMapHandler {
    private sourceMapConsumer;
    /**
     * Initialize with a source map
     */
    init(sourceMap: RawSourceMap | string): Promise<void>;
    /**
     * Map a position in generated code back to original source
     */
    mapPosition(line: number, column: number): {
        line: number;
        column: number;
    } | null;
    /**
     * Get the original source for a generated position
     */
    getSourceContent(line: number, column: number): string | null;
    /**
     * Clean up resources
     */
    destroy(): void;
}
/**
 * Convert a source map string or object to canonical format
 */
export declare function normalizeSourceMap(sourceMap: RawSourceMap | string): RawSourceMap;
/**
 * Helper to calculate line and column from character offset
 */
export declare function offsetToLineColumn(content: string, offset: number): {
    line: number;
    column: number;
};
/**
 * Helper to calculate character offset from line and column
 */
export declare function lineColumnToOffset(content: string, line: number, column: number): number;
//# sourceMappingURL=source-map.d.ts.map