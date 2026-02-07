/**
 * Async trace processing queue for handling traces off the main thread
 * Batches traces and processes them asynchronously
 */

import type { TraceEvent } from './types.js';

/**
 * Configuration for trace queue
 */
export interface TraceQueueConfig {
  /**
   * Maximum queue size before starting to drop traces (default: 10000)
   */
  maxQueueSize?: number;

  /**
   * Batch size for processing (default: 100)
   */
  batchSize?: number;

  /**
   * Max time to wait before processing partial batch (default: 1000ms)
   */
  maxWaitTime?: number;

  /**
   * Concurrency limit for processing (default: 4)
   */
  maxConcurrency?: number;
}

/**
 * Result of processing a batch
 */
export interface ProcessResult {
  /**
   * Number of traces processed
   */
  processed: number;

  /**
   * Number of traces failed
   */
  failed: number;

  /**
   * Error messages if any
   */
  errors: string[];
}

/**
 * Async trace processing queue
 */
export class TraceQueue {
  private queue: TraceEvent[] = [];
  private config: Required<TraceQueueConfig>;
  private processing: boolean = false;
  private processPromise: Promise<void> | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private activeProcesses: number = 0;
  private droppedCount: number = 0;

  /**
   * Handler for processing batches of traces
   */
  private processHandler: ((traces: TraceEvent[]) => Promise<ProcessResult>) | null = null;

  constructor(config?: TraceQueueConfig) {
    this.config = {
      maxQueueSize: config?.maxQueueSize ?? 10000,
      batchSize: config?.batchSize ?? 100,
      maxWaitTime: config?.maxWaitTime ?? 1000,
      maxConcurrency: config?.maxConcurrency ?? 4,
    };
  }

  /**
   * Set the handler for processing trace batches
   */
  public setProcessHandler(
    handler: (traces: TraceEvent[]) => Promise<ProcessResult>
  ): void {
    this.processHandler = handler;
  }

  /**
   * Add a trace to the queue
   * Returns true if added, false if queue is full (dropped)
   */
  public enqueue(trace: TraceEvent): boolean {
    if (this.queue.length >= this.config.maxQueueSize) {
      this.droppedCount++;
      return false; // Dropped due to queue size limit
    }

    this.queue.push(trace);

    // Schedule processing if not already scheduled
    if (!this.batchTimer && this.queue.length >= this.config.batchSize) {
      this.scheduleBatchProcessing();
    } else if (!this.batchTimer && this.queue.length > 0) {
      // Schedule processing after max wait time
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        this.processBatch();
      }, this.config.maxWaitTime);
    }

    return true;
  }

  /**
   * Add multiple traces to the queue
   */
  public enqueueBatch(traces: TraceEvent[]): number {
    let added = 0;
    for (const trace of traces) {
      if (this.enqueue(trace)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Process asynchronously
    setImmediate(() => {
      this.processBatch();
    });
  }

  /**
   * Process one batch from the queue
   */
  private async processBatch(): Promise<void> {
    // Clear any pending timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.queue.length === 0 || !this.processHandler) {
      return;
    }

    // Wait for available concurrency slot
    if (this.activeProcesses >= this.config.maxConcurrency) {
      // Schedule retry
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        this.processBatch();
      }, 100);
      return;
    }

    const batch = this.queue.splice(0, this.config.batchSize);
    if (batch.length === 0) {
      return;
    }

    this.activeProcesses++;

    try {
      await this.processHandler(batch);

      // Process next batch if queue has more
      if (this.queue.length >= this.config.batchSize) {
        setImmediate(() => {
          this.processBatch();
        });
      } else if (this.queue.length > 0) {
        // Schedule processing of remaining traces
        this.batchTimer = setTimeout(() => {
          this.batchTimer = null;
          this.processBatch();
        }, this.config.maxWaitTime);
      }
    } finally {
      this.activeProcesses--;
    }
  }

  /**
   * Flush all queued traces (process immediately)
   */
  public async flush(): Promise<ProcessResult> {
    if (!this.processHandler) {
      return { processed: 0, failed: 0, errors: ['No process handler set'] };
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    let totalProcessed = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    while (this.queue.length > 0 || this.activeProcesses > 0) {
      // Wait for active processes to complete
      if (this.activeProcesses > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      // Process remaining items
      if (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.config.batchSize);
        this.activeProcesses++;

        try {
          const result = await this.processHandler(batch);
          totalProcessed += result.processed;
          totalFailed += result.failed;
          allErrors.push(...result.errors);
        } finally {
          this.activeProcesses--;
        }
      }
    }

    return {
      processed: totalProcessed,
      failed: totalFailed,
      errors: allErrors,
    };
  }

  /**
   * Get queue statistics
   */
  public getStats(): {
    queueSize: number;
    maxQueueSize: number;
    droppedCount: number;
    activeProcesses: number;
  } {
    return {
      queueSize: this.queue.length,
      maxQueueSize: this.config.maxQueueSize,
      droppedCount: this.droppedCount,
      activeProcesses: this.activeProcesses,
    };
  }

  /**
   * Clear the queue
   */
  public clear(): void {
    this.queue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Get current queue size
   */
  public size(): number {
    return this.queue.length;
  }
}
