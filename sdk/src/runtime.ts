/**
 * Lightweight Runtime Library for Trace Injection
 *
 * Provides the __trace__() function injected by the transformation pipeline.
 * Manages async trace buffering and export with minimal dependencies.
 *
 * Acceptance Criteria:
 * - Bundle size < 5KB minified + gzipped
 * - Zero external dependencies
 * - Tree-shaking support
 * - Async/non-blocking trace processing
 * - Memory-bounded buffer
 * - Graceful error degradation
 */

/**
 * Trace event captured at runtime
 */
export interface RuntimeTrace {
  id: string;
  timestamp: number;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  functionName?: string;
  traceType?: 'before' | 'after' | 'entry' | 'exit';
  variables?: Record<string, unknown>;
  stackTrace?: string;
  sessionId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for the runtime trace buffer
 */
export interface RuntimeBufferConfig {
  maxSize?: number; // Max number of traces (default: 1000)
  maxBytes?: number; // Max memory in bytes (default: 5MB)
  flushInterval?: number; // Flush interval in ms (default: 5000)
  onFlush?: (traces: RuntimeTrace[]) => Promise<void> | void;
  onError?: (error: Error) => void;
  captureStackTrace?: boolean;
  enabled?: boolean;
  metadata?: Record<string, unknown>; // Additional metadata attached to all traces
}

/**
 * Global trace buffer and configuration
 */
interface TraceBufferState {
  traces: RuntimeTrace[];
  config: Required<RuntimeBufferConfig>;
  flushTimer: NodeJS.Timeout | null;
  isFlushPending: boolean;
  sessionId: string;
}

const DEFAULT_CONFIG: Required<RuntimeBufferConfig> = {
  maxSize: 1000,
  maxBytes: 5 * 1024 * 1024, // 5MB
  flushInterval: 5000,
  onFlush: () => {},
  onError: () => {},
  captureStackTrace: false,
  enabled: true,
  metadata: {},
};

let bufferState: TraceBufferState | null = null;

/**
 * Initialize the runtime trace buffer
 */
export function initializeTraceBuffer(
  config: RuntimeBufferConfig = {}
): void {
  if (bufferState) {
    return; // Already initialized
  }

  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  bufferState = {
    traces: [],
    config: mergedConfig,
    flushTimer: null,
    isFlushPending: false,
    sessionId: generateSessionId(),
  };

  // Start auto-flush timer if interval is set
  if (mergedConfig.flushInterval > 0) {
    scheduleFlush(mergedConfig.flushInterval);
  }

  // Handle graceful shutdown
  if (typeof process !== 'undefined' && process.on) {
    process.on('beforeExit', () => flush());
    process.on('SIGTERM', () => flush());
    process.on('SIGINT', () => flush());
  }
}

/**
 * Core __trace__() function injected into application code
 * This is the main entry point for trace capture
 *
 * Integrates with runtime config checker for dynamic enable/disable
 * and sampling rate control without code changes or rebuilds.
 */
export function trace(
  traceId: string,
  variables?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
  tracepointId?: string
): void {
  try {
    if (!bufferState || !bufferState.config.enabled) {
      return; // Tracing disabled or not initialized
    }

    // Dynamic config checking via runtime config checker (hybrid mode)
    // If config checker is available and tracepointId is provided,
    // check if this tracepoint should execute
    if (typeof globalThis !== 'undefined' && tracepointId) {
      const configChecker = (globalThis as Record<string, unknown>).__traceConfigChecker__;
      if (typeof configChecker === 'object' && configChecker !== null) {
        const checkFn = (configChecker as Record<string, unknown>).checkTracepoint;
        if (typeof checkFn === 'function') {
          if (!(checkFn as (id: string) => boolean)(tracepointId)) {
            return; // Tracepoint disabled or filtered by sampling
          }
        }
      }
    }

    const runtimeTrace: RuntimeTrace = {
      id: traceId,
      timestamp: Date.now(),
      variables,
      sessionId: bufferState.sessionId,
      metadata: {
        ...bufferState.config.metadata,
        ...metadata,
      },
    };

    // Optionally capture stack trace (expensive, disabled by default)
    if (bufferState.config.captureStackTrace) {
      runtimeTrace.stackTrace = captureStackTrace();
    }

    addTrace(runtimeTrace);
  } catch (error) {
    // Graceful error degradation - never throw from trace capture
    try {
      bufferState?.config.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    } catch {
      // Silently ignore errors from error handler
    }
  }
}

/**
 * Add a trace to the buffer and check for flush conditions
 */
function addTrace(trace: RuntimeTrace): void {
  if (!bufferState) return;

  const { traces, config } = bufferState;

  // Add trace
  traces.push(trace);

  // Check memory-bounded conditions
  if (
    traces.length >= config.maxSize ||
    estimateBufferBytes(traces) >= config.maxBytes
  ) {
    flush(); // Async, non-blocking
  }
}

/**
 * Estimate total bytes in buffer (rough estimate)
 */
function estimateBufferBytes(traces: RuntimeTrace[]): number {
  let bytes = 0;
  for (const trace of traces) {
    bytes += JSON.stringify(trace).length; // UTF-8 rough estimate
  }
  return bytes;
}

/**
 * Schedule periodic flush
 */
function scheduleFlush(interval: number): void {
  if (!bufferState) return;

  if (bufferState.flushTimer) {
    clearTimeout(bufferState.flushTimer);
  }

  bufferState.flushTimer = setTimeout(() => {
    flush().then(() => {
      if (bufferState) {
        scheduleFlush(interval);
      }
    });
  }, interval);
}

/**
 * Flush traces asynchronously (non-blocking)
 */
export async function flush(): Promise<void> {
  if (!bufferState) return;

  if (bufferState.isFlushPending) {
    return; // Prevent concurrent flushes
  }

  const { traces, config, flushTimer } = bufferState;

  if (traces.length === 0) {
    return; // Nothing to flush
  }

  bufferState.isFlushPending = true;

  try {
    // Get traces to flush and clear buffer
    const tracesToFlush = traces.splice(0, traces.length);

    // Call flush handler asynchronously
    await Promise.resolve(config.onFlush(tracesToFlush));
  } catch (error) {
    // Graceful error degradation
    try {
      config.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    } catch {
      // Silently ignore errors
    }
  } finally {
    bufferState.isFlushPending = false;

    // Clear any pending flush timer
    if (flushTimer) {
      clearTimeout(flushTimer);
      bufferState.flushTimer = null;
    }
  }
}

/**
 * Get current buffer status (for debugging/monitoring)
 */
export function getBufferStatus(): {
  traceCount: number;
  estimatedBytes: number;
  sessionId: string;
  enabled: boolean;
  isPending: boolean;
} | null {
  if (!bufferState) {
    return null;
  }

  return {
    traceCount: bufferState.traces.length,
    estimatedBytes: estimateBufferBytes(bufferState.traces),
    sessionId: bufferState.sessionId,
    enabled: bufferState.config.enabled,
    isPending: bufferState.isFlushPending,
  };
}

/**
 * Disable tracing
 */
export function disableTracing(): void {
  if (bufferState) {
    bufferState.config.enabled = false;
  }
}

/**
 * Enable tracing
 */
export function enableTracing(): void {
  if (bufferState) {
    bufferState.config.enabled = true;
  }
}

/**
 * Reset the trace buffer (for testing)
 */
export function resetTraceBuffer(): void {
  if (bufferState?.flushTimer) {
    clearTimeout(bufferState.flushTimer);
  }
  bufferState = null;
}

/**
 * Generate a simple session ID
 */
function generateSessionId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Capture stack trace (expensive, only on demand)
 */
function captureStackTrace(): string {
  try {
    const stack = new Error().stack || '';
    return stack.split('\n').slice(2).join('\n'); // Skip Error and this function
  } catch {
    return '';
  }
}

/**
 * Register the config checker for runtime config checking (hybrid mode)
 *
 * This allows the trace() function to check dynamic configuration
 * without code changes or rebuilds.
 *
 * @param checker - Object with checkTracepoint(id: string) => boolean method
 */
export function registerConfigChecker(checker: {
  checkTracepoint: (id: string) => boolean;
}): void {
  if (typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>).__traceConfigChecker__ = checker;
  }
}

/**
 * Get the registered config checker (for testing/inspection)
 */
export function getRegisteredConfigChecker(): {
  checkTracepoint: (id: string) => boolean;
} | undefined {
  if (typeof globalThis !== 'undefined') {
    const checker = (globalThis as Record<string, unknown>).__traceConfigChecker__;
    if (typeof checker === 'object' && checker !== null) {
      return checker as {
        checkTracepoint: (id: string) => boolean;
      };
    }
  }
  return undefined;
}

/**
 * Export minimal aliases for common patterns
 */
export const __trace__ = trace; // Injected code uses __trace__
export const traceCapture = trace; // Alternative name
