/**
 * AWS Lambda Handler Wrapper
 *
 * Wraps Lambda handlers to automatically:
 * - Detect cold starts
 * - Propagate context (API Gateway, CloudFront)
 * - Manage trace buffer lifecycle
 * - Ensure traces are flushed before timeout
 * - Support Lambda Extensions for async export
 */

import {
  initializeTraceBuffer,
  flush,
  getBufferStatus,
  RuntimeBufferConfig,
} from '../runtime.js';
import {
  LambdaHandler,
  LambdaContext,
  LambdaHandlerOptions,
  LambdaTraceContext,
} from './types.js';
import { createLambdaTraceContext } from './context.js';
import { ExtensionsManager } from './extensions.js';

/**
 * Track cold start state across invocations
 */
let isInitialColdStart = true;

/**
 * Global trace context for current invocation
 */
let currentTraceContext: LambdaTraceContext | null = null;

/**
 * Extensions manager instance
 */
let extensionsManager: ExtensionsManager | null = null;

/**
 * Wrap a Lambda handler with automatic trace management
 */
export function wrapHandler<E = unknown, R = unknown>(
  handler: LambdaHandler<E, R>,
  options: LambdaHandlerOptions = {}
): LambdaHandler<E, R> {
  // Initialize extensions manager if enabled
  if (options.supportExtensions && !extensionsManager) {
    extensionsManager = new ExtensionsManager(options.extensionsApiUrl);
  }

  return async (
    event: E,
    context: LambdaContext,
    callback?: (error?: Error | null, result?: R) => void
  ) => {
    try {
      // Detect cold start
      const isColdStart = isInitialColdStart;
      if (options.detectColdStart !== false) {
        isInitialColdStart = false;
      }

      // Create Lambda trace context
      currentTraceContext = createLambdaTraceContext(
        event,
        context,
        isColdStart,
        options
      );

      // Initialize trace buffer for this invocation
      initializeTraceBuffer({
        ...buildBufferConfig(options, context),
        metadata: currentTraceContext as unknown as Record<string, unknown>,
      });

      // Register with Extensions API if enabled
      if (extensionsManager) {
        await extensionsManager.registerInvoke(context.awsRequestId);
      }

      // Execute handler
      let result: R;
      try {
        result = await Promise.resolve(handler(event, context, callback));
      } catch (error) {
        // Log error to trace buffer
        if (currentTraceContext) {
          currentTraceContext.invokeId = context.awsRequestId;
        }
        throw error;
      }

      // Calculate remaining time
      const remainingMs = context.getRemainingTimeInMillis();

      // Flush traces with timeout buffer
      await flushTracesBeforeTimeout(context, remainingMs, options);

      // Export via extensions if available
      if (extensionsManager) {
        await extensionsManager.exportTraces(getBufferStatus()).catch((err) => {
          console.warn('Failed to export traces via extensions:', err);
        });
      }

      return result;
    } catch (error) {
      // Always attempt flush on error
      const remainingMs = context.getRemainingTimeInMillis();
      await flushTracesBeforeTimeout(context, remainingMs, options).catch(
        (flushErr) => {
          console.error('Failed to flush traces on error:', flushErr);
        }
      );

      throw error;
    } finally {
      currentTraceContext = null;
    }
  };
}

/**
 * Build runtime buffer config for Lambda
 */
function buildBufferConfig(
  options: LambdaHandlerOptions,
  context: LambdaContext
): RuntimeBufferConfig {
  // Adjust buffer size based on memory limit
  const memoryMB = parseInt(context.memoryLimitInMB, 10);
  const maxBytes = Math.min(memoryMB * 50 * 1024, 10 * 1024 * 1024); // Up to 10MB

  return {
    maxSize: 10000,
    maxBytes,
    flushInterval: 0, // Disable auto-flush, we'll flush on timeout
    enabled: true,
  };
}

/**
 * Flush traces before Lambda timeout
 */
async function flushTracesBeforeTimeout(
  context: LambdaContext,
  remainingMs: number,
  options: LambdaHandlerOptions
): Promise<void> {
  const timeoutBuffer = options.timeoutBuffer ?? 3000;
  const maxFlushWait = options.maxFlushWait ?? Math.max(1000, remainingMs - timeoutBuffer);

  if (remainingMs <= timeoutBuffer) {
    // Very close to timeout, flush immediately without waiting
    // Use setImmediate to not block
    setImmediate(() => {
      flush().catch((err) => {
        console.error('Failed to flush traces:', err);
      });
    });
    return;
  }

  // Flush with timeout
  try {
    await Promise.race([
      flush(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Trace flush timeout')), maxFlushWait)
      ),
    ]);
  } catch (error) {
    // Trace flush timeout is non-fatal, log and continue
    console.warn('Trace flush error:', error);
  }
}

/**
 * Get current Lambda trace context
 */
export function getLambdaTraceContext(): LambdaTraceContext | null {
  return currentTraceContext;
}

/**
 * Set custom metadata on current trace context
 */
export function setTraceMetadata(metadata: Record<string, any>): void {
  if (currentTraceContext) {
    Object.assign(currentTraceContext, metadata);
  }
}

/**
 * Inject handler - alternative syntax for backwards compatibility
 */
export function handler<E = unknown, R = unknown>(
  fn: LambdaHandler<E, R>,
  options?: LambdaHandlerOptions
): LambdaHandler<E, R> {
  return wrapHandler(fn, options);
}

/**
 * Middleware-style wrapper
 */
export function withTraceInjection<E = unknown, R = unknown>(
  options: LambdaHandlerOptions = {}
) {
  return (handler: LambdaHandler<E, R>): LambdaHandler<E, R> => {
    return wrapHandler(handler, options);
  };
}
