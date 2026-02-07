/**
 * Trace Batch Manager
 * Manages batching, flushing, and exporting of traces with process exit handlers
 */

import type { TraceEvent } from './types.js';
import { TraceQueue, type TraceQueueConfig, type ProcessResult } from './trace-queue.js';
import {
  HttpExporter,
  ConsoleExporter,
  FileExporter,
  CustomExporter,
  CompositeExporter,
  type HttpExporterConfig,
  type FileExporterConfig,
  type RetryConfig,
  type CustomExportHandler,
  type ExportResult,
} from './trace-exporter.js';

/**
 * Configuration for trace batch manager
 */
export interface TraceBatchManagerConfig {
  /**
   * Queue configuration
   */
  queue?: TraceQueueConfig | undefined;

  /**
   * Flush on batch size (number of traces)
   */
  flushOnBatchSize?: number;

  /**
   * Flush on time interval (milliseconds, 0 to disable)
   */
  flushOnTimeIntervalMs?: number;

  /**
   * Flush on process exit/signal
   */
  flushOnExit?: boolean;

  /**
   * HTTP export configuration (optional)
   */
  httpExport?: HttpExporterConfig | undefined;

  /**
   * File export configuration (optional)
   */
  fileExport?: FileExporterConfig | undefined;

  /**
   * Enable console export for development
   */
  consoleExport?: boolean | { verbose?: boolean };

  /**
   * Custom export handlers
   */
  customHandlers?: Array<{ name: string; handler: CustomExportHandler }>;

  /**
   * Retry configuration for exports
   */
  retryConfig?: RetryConfig | undefined;
}

/**
 * Statistics about the batch manager
 */
export interface BatchManagerStats {
  /**
   * Total traces received
   */
  totalTracesReceived: number;

  /**
   * Total traces exported
   */
  totalTracesExported: number;

  /**
   * Total traces dropped
   */
  totalTracesDropped: number;

  /**
   * Current queue size
   */
  currentQueueSize: number;

  /**
   * Total export errors
   */
  totalExportErrors: number;

  /**
   * Last export timestamp
   */
  lastExportTime?: string;
}

/**
 * Trace Batch Manager - Coordinates batching and export of traces
 */
export class TraceBatchManager {
  private queue: TraceQueue;
  private composite: CompositeExporter;
  private config: {
    queue?: TraceQueueConfig;
    flushOnBatchSize: number;
    flushOnTimeIntervalMs: number;
    flushOnExit: boolean;
    httpExport?: HttpExporterConfig;
    fileExport?: FileExporterConfig;
    consoleExport: boolean | { verbose?: boolean };
    customHandlers: Array<{ name: string; handler: CustomExportHandler }>;
    retryConfig?: RetryConfig;
  };
  private stats: BatchManagerStats;
  private flushTimer: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  private exitHandlersRegistered: boolean = false;
  private totalTraces: number = 0;
  private totalExported: number = 0;
  private totalDropped: number = 0;
  private totalErrors: number = 0;

  constructor(config?: TraceBatchManagerConfig) {
    this.config = {
      queue: config?.queue ?? undefined,
      flushOnBatchSize: config?.flushOnBatchSize ?? 100,
      flushOnTimeIntervalMs: config?.flushOnTimeIntervalMs ?? 5000,
      flushOnExit: config?.flushOnExit ?? true,
      httpExport: config?.httpExport ?? undefined,
      fileExport: config?.fileExport ?? undefined,
      consoleExport: config?.consoleExport ?? false,
      customHandlers: config?.customHandlers ?? [],
      retryConfig: config?.retryConfig ?? undefined,
    };

    this.stats = {
      totalTracesReceived: 0,
      totalTracesExported: 0,
      totalTracesDropped: 0,
      currentQueueSize: 0,
      totalExportErrors: 0,
    };

    // Initialize queue
    this.queue = new TraceQueue(this.config.queue);

    // Initialize exporters
    this.composite = new CompositeExporter();
    this.setupExporters();

    // Set up queue processor
    this.queue.setProcessHandler((traces) => this.processBatch(traces));

    // Register exit handlers
    if (this.config.flushOnExit) {
      this.registerExitHandlers();
    }

    // Start time-based flush timer
    if (this.config.flushOnTimeIntervalMs > 0) {
      this.startFlushTimer();
    }
  }

  /**
   * Add a trace to the batch
   */
  public addTrace(trace: TraceEvent): boolean {
    const added = this.queue.enqueue(trace);
    if (added) {
      this.totalTraces++;
      this.stats.totalTracesReceived++;
    } else {
      this.totalDropped++;
      this.stats.totalTracesDropped++;
    }

    // Check if we should flush based on batch size
    if (this.queue.size() >= this.config.flushOnBatchSize) {
      this.flush().catch((error) => {
        console.error('Error during automatic flush:', error);
      });
    }

    return added;
  }

  /**
   * Add multiple traces to the batch
   */
  public addTraces(traces: TraceEvent[]): number {
    let added = 0;
    for (const trace of traces) {
      if (this.addTrace(trace)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Manually flush all pending traces
   */
  public async flush(): Promise<ExportResult> {
    if (this.queue.size() === 0) {
      return { success: true, count: 0, duration: 0 };
    }

    const result = await this.queue.flush();
    return {
      success: result.failed === 0,
      count: result.processed,
      error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      duration: 0,
    };
  }

  /**
   * Process a batch of traces
   */
  private async processBatch(traces: TraceEvent[]): Promise<ProcessResult> {
    if (traces.length === 0) {
      return { processed: 0, failed: 0, errors: [] };
    }

    try {
      const results = await this.composite.exportAll(traces);

      let successCount = 0;
      const errors: string[] = [];

      for (const [name, result] of Object.entries(results)) {
        if (result.success) {
          successCount += result.count;
        } else {
          this.totalErrors++;
          this.stats.totalExportErrors++;
          if (result.error) {
            errors.push(`${name}: ${result.error}`);
          }
        }
      }

      this.totalExported += successCount;
      this.stats.totalTracesExported += successCount;
      this.stats.lastExportTime = new Date().toISOString();

      return {
        processed: successCount,
        failed: traces.length - successCount,
        errors,
      };
    } catch (error) {
      this.totalErrors++;
      this.stats.totalExportErrors++;
      return {
        processed: 0,
        failed: traces.length,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Setup exporters based on configuration
   */
  private setupExporters(): void {
    // HTTP exporter
    if (this.config.httpExport) {
      const httpExporter = new HttpExporter(this.config.httpExport, this.config.retryConfig);
      this.composite.addExporter('http', httpExporter);
    }

    // File exporter
    if (this.config.fileExport) {
      const fileExporter = new FileExporter(this.config.fileExport);
      this.composite.addExporter('file', fileExporter);
    }

    // Console exporter
    if (this.config.consoleExport) {
      const consoleConfig = typeof this.config.consoleExport === 'boolean' ? {} : this.config.consoleExport;
      const consoleExporter = new ConsoleExporter(consoleConfig.verbose ?? true);
      this.composite.addExporter('console', consoleExporter);
    }

    // Custom handlers
    for (const { name, handler } of this.config.customHandlers) {
      const customExporter = new CustomExporter(handler);
      this.composite.addExporter(name, customExporter);
    }
  }

  /**
   * Register process exit handlers
   */
  private registerExitHandlers(): void {
    if (this.exitHandlersRegistered) {
      return;
    }

    this.exitHandlersRegistered = true;

    // Handle graceful shutdown
    const handleExit = async () => {
      if (this.isShuttingDown) {
        return;
      }

      this.isShuttingDown = true;

      // Stop timers
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }

      // Final flush
      try {
        const result = await this.flush();
        if (!result.success) {
          console.error('Failed to flush traces on exit:', result.error);
        }
      } catch (error) {
        console.error('Error during final flush:', error);
      }
    };

    // beforeExit: async operations can still run
    process.on('beforeExit', handleExit);

    // SIGTERM: graceful shutdown signal
    process.on('SIGTERM', handleExit);

    // SIGINT: Ctrl+C
    process.on('SIGINT', handleExit);
  }

  /**
   * Start time-based flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.queue.size() > 0 && !this.isShuttingDown) {
        this.flush().catch((error) => {
          console.error('Error during timed flush:', error);
        });
      }
    }, this.config.flushOnTimeIntervalMs);

    // Don't keep process alive just for flushing
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Get current statistics
   */
  public getStats(): BatchManagerStats {
    return {
      ...this.stats,
      currentQueueSize: this.queue.size(),
    };
  }

  /**
   * Shutdown the batch manager
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    await this.flush();
  }

  /**
   * Clear the queue (drops all pending traces)
   */
  public clear(): void {
    this.queue.clear();
  }

  /**
   * Get queue statistics
   */
  public getQueueStats() {
    return this.queue.getStats();
  }
}

/**
 * Global singleton batch manager instance
 */
let globalBatchManager: TraceBatchManager | null = null;

/**
 * Initialize or get the global batch manager
 */
export function initBatchManager(config?: TraceBatchManagerConfig): TraceBatchManager {
  if (!globalBatchManager) {
    globalBatchManager = new TraceBatchManager(config);
  }
  return globalBatchManager;
}

/**
 * Get the global batch manager instance
 */
export function getBatchManager(): TraceBatchManager | null {
  return globalBatchManager;
}

/**
 * Reset the global batch manager (mainly for testing)
 */
export function resetBatchManager(): void {
  if (globalBatchManager) {
    globalBatchManager.shutdown().catch((error) => {
      console.error('Error shutting down batch manager:', error);
    });
  }
  globalBatchManager = null;
}
