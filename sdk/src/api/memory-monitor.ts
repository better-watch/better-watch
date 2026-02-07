/**
 * Memory monitoring and auto-throttling for trace capture
 * Prevents memory exhaustion by monitoring heap usage and throttling captures
 */

/**
 * Configuration for memory monitoring
 */
export interface MemoryMonitorConfig {
  /**
   * Memory threshold as percentage of max heap (default: 80)
   */
  heapUsageThreshold?: number;

  /**
   * Check interval in milliseconds (default: 5000 = 5 seconds)
   */
  checkInterval?: number;

  /**
   * Garbage collection grace period in milliseconds (default: 2000)
   */
  gcGracePeriod?: number;
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  /**
   * Percentage of max heap being used (0-100)
   */
  heapUsagePercent: number;

  /**
   * Used heap in bytes
   */
  heapUsed: number;

  /**
   * Max heap in bytes
   */
  heapMax: number;

  /**
   * Whether memory is high (exceeds threshold)
   */
  isHighMemory: boolean;

  /**
   * Timestamp of measurement
   */
  timestamp: number;
}

/**
 * Memory monitor for tracking heap usage and triggering throttling
 */
export class MemoryMonitor {
  private config: Required<MemoryMonitorConfig>;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private lastGCTime: number = 0;
  private isHighMemory: boolean = false;
  private stats: MemoryStats | null = null;

  constructor(config?: MemoryMonitorConfig) {
    this.config = {
      heapUsageThreshold: config?.heapUsageThreshold ?? 80,
      checkInterval: config?.checkInterval ?? 5000,
      gcGracePeriod: config?.gcGracePeriod ?? 2000,
    };
  }

  /**
   * Start monitoring memory usage
   */
  public startMonitoring(): void {
    if (this.checkIntervalId !== null) {
      return; // Already monitoring
    }

    this.checkIntervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring memory usage
   */
  public stopMonitoring(): void {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Check current memory usage
   */
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const previousHighMemory = this.isHighMemory;
    this.isHighMemory = heapUsagePercent > this.config.heapUsageThreshold;

    // Store stats
    this.stats = {
      heapUsagePercent: Math.round(heapUsagePercent * 100) / 100,
      heapUsed: memUsage.heapUsed,
      heapMax: memUsage.heapTotal,
      isHighMemory: this.isHighMemory,
      timestamp: Date.now(),
    };

    // Trigger GC if transitioning to high memory
    if (this.isHighMemory && !previousHighMemory) {
      this.triggerGarbageCollection();
    }
  }

  /**
   * Trigger garbage collection (if available)
   */
  private triggerGarbageCollection(): void {
    const now = Date.now();
    const timeSinceLastGC = now - this.lastGCTime;

    if (timeSinceLastGC > this.config.gcGracePeriod && global.gc) {
      global.gc();
      this.lastGCTime = now;
    }
  }

  /**
   * Get current memory statistics
   */
  public getMemoryStats(): MemoryStats {
    if (this.stats === null) {
      this.checkMemoryUsage();
    }
    return this.stats!;
  }

  /**
   * Check if memory usage is high
   */
  public isMemoryHigh(): boolean {
    const stats = this.getMemoryStats();
    return stats.isHighMemory;
  }

  /**
   * Get memory usage percentage
   */
  public getHeapUsagePercent(): number {
    const stats = this.getMemoryStats();
    return stats.heapUsagePercent;
  }

  /**
   * Get recommended sampling rate based on memory usage
   * Returns 0-100 percentage, lower when memory is high
   */
  public getAdaptiveSamplingRate(): number {
    const stats = this.getMemoryStats();
    const usage = stats.heapUsagePercent;

    if (usage < 50) {
      return 100; // Full sampling
    } else if (usage < 70) {
      return 75; // Reduced sampling
    } else if (usage < 85) {
      return 50; // Half sampling
    } else {
      return 25; // Minimal sampling
    }
  }
}
