/**
 * Source map utilities for accurate line and column mapping
 */

import type { RawSourceMap } from 'source-map';
import { SourceMapConsumer } from 'source-map';

/**
 * Handles source map operations for mapping generated code back to original source
 */
export class SourceMapHandler {
  private sourceMapConsumer: SourceMapConsumer | null = null;

  /**
   * Initialize with a source map
   */
  public init(sourceMap: RawSourceMap | string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const mapData = typeof sourceMap === 'string' ? JSON.parse(sourceMap) as RawSourceMap : sourceMap;

      SourceMapConsumer.with(mapData, null, (consumer) => {
        this.sourceMapConsumer = consumer;
        resolve();
      }).catch(reject);
    });
  }

  /**
   * Map a position in generated code back to original source
   */
  public mapPosition(line: number, column: number): { line: number; column: number } | null {
    if (!this.sourceMapConsumer) {
      return null;
    }

    try {
      const original = this.sourceMapConsumer.originalPositionFor({
        line,
        column,
      });

      if (original.line === null || original.column === null) {
        return null;
      }

      return {
        line: original.line,
        column: original.column,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the original source for a generated position
   */
  public getSourceContent(line: number, column: number): string | null {
    if (!this.sourceMapConsumer) {
      return null;
    }

    try {
      const original = this.sourceMapConsumer.originalPositionFor({
        line,
        column,
      });

      if (original.source === null) {
        return null;
      }

      return this.sourceMapConsumer.sourceContentFor(original.source);
    } catch {
      return null;
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.sourceMapConsumer) {
      this.sourceMapConsumer.destroy();
      this.sourceMapConsumer = null;
    }
  }
}

/**
 * Convert a source map string or object to canonical format
 */
export function normalizeSourceMap(sourceMap: RawSourceMap | string): RawSourceMap {
  if (typeof sourceMap === 'string') {
    return JSON.parse(sourceMap) as RawSourceMap;
  }

  return sourceMap;
}

/**
 * Helper to calculate line and column from character offset
 */
export function offsetToLineColumn(
  content: string,
  offset: number
): { line: number; column: number } {
  let line = 1;
  let column = 0;

  for (let i = 0; i < Math.min(offset, content.length); i++) {
    if (content[i] === '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Helper to calculate character offset from line and column
 */
export function lineColumnToOffset(
  content: string,
  line: number,
  column: number
): number {
  let offset = 0;
  let currentLine = 1;
  let currentColumn = 0;

  for (let i = 0; i < content.length; i++) {
    if (currentLine === line && currentColumn === column) {
      return offset;
    }

    if (content[i] === '\n') {
      currentLine++;
      currentColumn = 0;
    } else {
      currentColumn++;
    }

    offset++;
  }

  return offset;
}
