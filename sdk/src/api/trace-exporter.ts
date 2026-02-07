/**
 * Trace export handlers for different output targets
 * Supports HTTP, console, file, and custom handlers
 */

import type { TraceEvent } from './types.js';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';

/**
 * Result of an export operation
 */
export interface ExportResult {
  /**
   * Whether the export was successful
   */
  success: boolean;

  /**
   * Number of traces exported
   */
  count: number;

  /**
   * Error message if export failed
   */
  error?: string;

  /**
   * Duration in milliseconds
   */
  duration?: number;
}

/**
 * Configuration for HTTP export
 */
export interface HttpExporterConfig {
  /**
   * URL to POST traces to
   */
  url: string;

  /**
   * Custom headers to include
   */
  headers?: Record<string, string>;

  /**
   * Timeout in milliseconds (default: 10000)
   */
  timeout?: number;

  /**
   * Batch size for HTTP requests (default: 100)
   */
  batchSize?: number;
}

/**
 * Configuration for file export
 */
export interface FileExporterConfig {
  /**
   * Directory to write trace files to
   */
  directory: string;

  /**
   * File format: 'jsonl' (one trace per line) or 'json' (array)
   */
  format?: 'jsonl' | 'json';

  /**
   * Rotate files when they reach this size (bytes, default: 100MB)
   */
  maxFileSize?: number;

  /**
   * Compress files (default: false)
   */
  compress?: boolean;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /**
   * Initial delay in milliseconds (default: 100)
   */
  initialDelayMs?: number;

  /**
   * Maximum delay between retries in milliseconds (default: 30000)
   */
  maxDelayMs?: number;

  /**
   * Exponential backoff multiplier (default: 2)
   */
  backoffMultiplier?: number;

  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;
}

/**
 * Custom export handler function
 */
export type CustomExportHandler = (traces: TraceEvent[]) => Promise<ExportResult>;

/**
 * HTTP exporter for sending traces to a remote server
 */
export class HttpExporter {
  private config: Required<HttpExporterConfig>;
  private retryConfig: Required<RetryConfig>;

  constructor(config: HttpExporterConfig, retryConfig?: RetryConfig) {
    this.config = {
      url: config.url,
      headers: config.headers || {},
      timeout: config.timeout ?? 10000,
      batchSize: config.batchSize ?? 100,
    };
    this.retryConfig = {
      initialDelayMs: retryConfig?.initialDelayMs ?? 100,
      maxDelayMs: retryConfig?.maxDelayMs ?? 30000,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
      maxRetries: retryConfig?.maxRetries ?? 3,
    };
  }

  /**
   * Export traces via HTTP POST
   */
  public async export(traces: TraceEvent[]): Promise<ExportResult> {
    const startTime = Date.now();

    if (traces.length === 0) {
      return { success: true, count: 0, duration: 0 };
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const delayMs = this.calculateBackoffDelay(attempt);
        if (attempt > 0) {
          await this.delay(delayMs);
        }

        await this.sendBatch(traces);
        return {
          success: true,
          count: traces.length,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }
      }
    }

    return {
      success: false,
      count: 0,
      error: lastError?.message || 'Unknown error',
      duration: Date.now() - startTime,
    };
  }

  /**
   * Send batch of traces via HTTP
   */
  private async sendBatch(traces: TraceEvent[]): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          traces,
          timestamp: new Date().toISOString(),
          count: traces.length,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Console exporter for development/debugging
 */
export class ConsoleExporter {
  constructor(private verbose: boolean = true) {}

  /**
   * Export traces to console
   */
  public async export(traces: TraceEvent[]): Promise<ExportResult> {
    const startTime = Date.now();

    if (traces.length === 0) {
      return { success: true, count: 0, duration: 0 };
    }

    try {
      if (this.verbose) {
        console.log(`\n[TRACES] Exporting ${traces.length} trace(s):`);
        traces.forEach((trace, index) => {
          console.log(`\n  [${index + 1}/${traces.length}] ${trace.functionName || 'anonymous'}()`);
          console.log(`    File: ${trace.filePath}:${trace.lineNumber}`);
          console.log(`    Type: ${trace.type}`);
          console.log(`    Time: ${trace.timestamp}`);
          if (trace.variables && Object.keys(trace.variables.variables).length > 0) {
            console.log(`    Variables:`);
            Object.entries(trace.variables.variables).forEach(([name, value]) => {
              console.log(`      ${name}: ${JSON.stringify(value.value).substring(0, 100)}`);
            });
          }
        });
        console.log('\n');
      } else {
        console.log(`[TRACES] Exported ${traces.length} trace(s)`);
      }

      return {
        success: true,
        count: traces.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }
}

/**
 * File exporter for persistent storage and debugging
 */
export class FileExporter {
  private config: Required<FileExporterConfig>;
  private currentFileSize: number = 0;
  private currentFileName: string | null = null;

  constructor(config: FileExporterConfig) {
    this.config = {
      directory: config.directory,
      format: config.format ?? 'jsonl',
      maxFileSize: config.maxFileSize ?? 100 * 1024 * 1024, // 100MB
      compress: config.compress ?? false,
    };
  }

  /**
   * Export traces to file
   */
  public async export(traces: TraceEvent[]): Promise<ExportResult> {
    const startTime = Date.now();

    if (traces.length === 0) {
      return { success: true, count: 0, duration: 0 };
    }

    try {
      // Ensure directory exists
      await this.ensureDirectory();

      if (this.config.format === 'jsonl') {
        await this.writeJsonl(traces);
      } else {
        await this.writeJson(traces);
      }

      return {
        success: true,
        count: traces.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Write traces in JSONL format (one per line)
   */
  private async writeJsonl(traces: TraceEvent[]): Promise<void> {
    const filePath = await this.getFilePath();
    let content = '';

    for (const trace of traces) {
      content += JSON.stringify(trace) + '\n';
    }

    // Check if we need to rotate
    const stats = await this.getFileStats(filePath);
    const newSize = (stats?.size || 0) + Buffer.byteLength(content);

    if (stats && newSize > this.config.maxFileSize) {
      await this.rotateFile(filePath);
    }

    await fs.appendFile(filePath, content, 'utf-8');
    this.currentFileSize = newSize;
  }

  /**
   * Write traces in JSON format (array)
   */
  private async writeJson(traces: TraceEvent[]): Promise<void> {
    const filePath = await this.getFilePath();

    // Read existing content
    let data: TraceEvent[] = [];
    try {
      const existing = await fs.readFile(filePath, 'utf-8');
      data = JSON.parse(existing);
    } catch {
      // File doesn't exist or is empty
      data = [];
    }

    // Append new traces
    data.push(...traces);
    const content = JSON.stringify(data, null, 2);

    // Check if we need to rotate
    const newSize = Buffer.byteLength(content);
    if (newSize > this.config.maxFileSize) {
      await this.rotateFile(filePath);
      await fs.writeFile(filePath, JSON.stringify(traces, null, 2), 'utf-8');
    } else {
      await fs.writeFile(filePath, content, 'utf-8');
    }

    this.currentFileSize = newSize;
  }

  /**
   * Get path for current trace file
   */
  private async getFilePath(): Promise<string> {
    const fileName = `traces-${new Date().toISOString().split('T')[0]}.${this.config.format === 'jsonl' ? 'jsonl' : 'json'}`;
    return join(this.config.directory, fileName);
  }

  /**
   * Rotate to a new file
   */
  private async rotateFile(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = dirname(filePath);
    const baseFileName = filePath.split('/').pop()?.split('.')[0] || 'traces';
    const ext = this.config.format === 'jsonl' ? 'jsonl' : 'json';
    const archivedPath = join(dir, `${baseFileName}-${timestamp}.${ext}`);

    try {
      await fs.rename(filePath, archivedPath);
    } catch {
      // File might not exist yet
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.directory, { recursive: true });
    } catch (error) {
      // Directory might already exist
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get file stats safely
   */
  private async getFileStats(filePath: string): Promise<{ size: number } | null> {
    try {
      const stats = await fs.stat(filePath);
      return { size: stats.size };
    } catch {
      return null;
    }
  }
}

/**
 * Custom exporter for user-defined export handlers
 */
export class CustomExporter {
  constructor(private handler: CustomExportHandler) {}

  /**
   * Export using custom handler
   */
  public async export(traces: TraceEvent[]): Promise<ExportResult> {
    return this.handler(traces);
  }
}

/**
 * Composite exporter that sends to multiple destinations
 */
export class CompositeExporter {
  private exporters: Array<{ name: string; export: (traces: TraceEvent[]) => Promise<ExportResult> }> = [];

  /**
   * Add an exporter
   */
  public addExporter(
    name: string,
    exporter: HttpExporter | ConsoleExporter | FileExporter | CustomExporter
  ): void {
    this.exporters.push({
      name,
      export: (traces: TraceEvent[]) => exporter.export(traces),
    });
  }

  /**
   * Export to all registered exporters
   */
  public async exportAll(traces: TraceEvent[]): Promise<Record<string, ExportResult>> {
    const results: Record<string, ExportResult> = {};

    for (const exporter of this.exporters) {
      try {
        results[exporter.name] = await exporter.export(traces);
      } catch (error) {
        results[exporter.name] = {
          success: false,
          count: 0,
          error: (error as Error).message,
        };
      }
    }

    return results;
  }

  /**
   * Export to first exporter that succeeds
   */
  public async exportFirstSuccess(traces: TraceEvent[]): Promise<ExportResult> {
    for (const exporter of this.exporters) {
      try {
        const result = await exporter.export(traces);
        if (result.success) {
          return result;
        }
      } catch {
        // Continue to next exporter
      }
    }

    return {
      success: false,
      count: 0,
      error: 'No exporters succeeded',
    };
  }
}
