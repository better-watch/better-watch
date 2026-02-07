/**
 * Streaming response handling for Remix with trace context
 *
 * Provides utilities for creating streaming responses while maintaining
 * trace context propagation and proper error handling
 */

/// <reference lib="dom" />
import type { RemixTraceContext, RemixTraceOptions } from './types.js';
import { getTraceContext, runWithTraceContextAsync } from '../node/context.js';

/**
 * BodyInit type compatible with both Node.js and browser Response API
 */
type BodyInit = string | ArrayBuffer | ArrayBufferView | Blob | ReadableStream<Uint8Array> | null;

/**
 * Options for deferred streaming responses
 */
export interface DeferredStreamingOptions extends RemixTraceOptions {
  /**
   * Timeout for resolving individual promises (milliseconds)
   */
  resolveTimeout?: number;

  /**
   * Called when a promise resolves in the deferred data
   */
  onPromiseResolve?: (key: string, duration: number) => void | Promise<void>;

  /**
   * Called when a promise rejects in the deferred data
   */
  onPromiseReject?: (key: string, error: Error) => void | Promise<void>;

  /**
   * Include promise execution time in metadata
   */
  capturePromiseTime?: boolean;
}

/**
 * Create a streaming response with trace context propagation
 *
 * Wraps the Response object to include trace context headers
 * and maintain context across stream boundaries
 *
 * @param body - The Response body or ReadableStream
 * @param init - Response init options
 * @param context - The trace context
 * @returns Response with trace headers
 *
 * @example
 * ```typescript
 * export const loader = async ({ request }) => {
 *   const context = getRemixTraceContext(request);
 *   const stream = fs.createReadStream('data.json');
 *   return createStreamingResponse(
 *     stream,
 *     { status: 200, headers: { 'Content-Type': 'application/json' } },
 *     context
 *   );
 * };
 * ```
 */
export function createStreamingResponse(
  body: BodyInit | ReadableStream<any>,
  init: ResponseInit = {},
  context?: RemixTraceContext
): Response {
  const traceContext = context || (getTraceContext() as RemixTraceContext);

  if (!traceContext) {
    return new Response(body as any, init);
  }

  // Create response with provided init
  const response = new Response(body as any, init);

  // Add trace context headers
  response.headers.set('traceparent', traceContext.traceParent || '');
  if (traceContext.traceState) {
    response.headers.set('tracestate', traceContext.traceState);
  }

  // Add custom trace headers
  response.headers.set('x-trace-id', traceContext.traceId);
  response.headers.set('x-request-id', traceContext.requestId);

  // Mark as streaming response
  if (!response.headers.has('x-streaming-trace')) {
    response.headers.set('x-streaming-trace', 'true');
  }

  return response;
}

/**
 * Handle deferred responses with streaming and trace context
 *
 * Creates a deferred response that tracks promise resolution times
 * and propagates trace context throughout the streaming lifecycle
 *
 * @param data - Object with promise values for deferred resolution
 * @param options - Streaming options
 * @param context - The trace context
 * @returns Response with deferred data
 *
 * @example
 * ```typescript
 * export const loader = traceLoader(async ({ request }) => {
 *   const context = getRemixTraceContext(request);
 *   return handleDeferredResponse(
 *     {
 *       user: getUserAsync(),
 *       posts: getPostsAsync(),
 *     },
 *     {},
 *     context
 *   );
 * });
 * ```
 */
export async function handleDeferredResponse(
  data: Record<string, any>,
  options: DeferredStreamingOptions = {},
  context?: RemixTraceContext
): Promise<Response> {
  const traceContext = context || (getTraceContext() as RemixTraceContext);
  const {
    resolveTimeout = 30000,
    onPromiseResolve,
    onPromiseReject,
    capturePromiseTime = true,
  } = options;

  if (!traceContext) {
    // Return without streaming if no trace context
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Wrap promises to track their resolution
  const wrappedData: Record<string, any> = {};

  return runWithTraceContextAsync(traceContext, async () => {
    const promiseEntries = Object.entries(data);

    for (const [key, value] of promiseEntries) {
      if (value instanceof Promise) {
        const startTime = Date.now();

        try {
          wrappedData[key] = await Promise.race([
            value,
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error(`Promise ${key} timed out after ${resolveTimeout}ms`)),
                resolveTimeout
              )
            ),
          ]);

          const duration = Date.now() - startTime;

          if (capturePromiseTime) {
            const promiseMetrics = (traceContext.metadata?.promiseMetrics || {}) as Record<
              string,
              number
            >;
            promiseMetrics[key] = duration;
            traceContext.metadata = {
              ...traceContext.metadata,
              promiseMetrics,
            };
          }

          if (onPromiseResolve) {
            try {
              await Promise.resolve(onPromiseResolve(key, duration));
            } catch {
              // Ignore callback errors
            }
          }
        } catch (error) {
          wrappedData[key] = error;

          if (onPromiseReject) {
            try {
              const err = error instanceof Error ? error : new Error(String(error));
              await Promise.resolve(onPromiseReject(key, err));
            } catch {
              // Ignore callback errors
            }
          }
        }
      } else {
        wrappedData[key] = value;
      }
    }

    return createStreamingResponse(
      JSON.stringify(wrappedData),
      {
        headers: { 'Content-Type': 'application/json' },
      },
      traceContext
    );
  });
}

/**
 * Create a readable stream that propagates trace context
 *
 * Wraps a source stream and maintains trace context across
 * the entire streaming lifecycle
 *
 * @param sourceStream - The source readable stream
 * @param context - The trace context
 * @returns A new readable stream with trace context
 *
 * @example
 * ```typescript
 * export const loader = async ({ request }) => {
 *   const sourceStream = fs.createReadStream('large-file.json');
 *   const tracedStream = createTracedStream(sourceStream, context);
 *   return new Response(tracedStream, {
 *     headers: { 'Content-Type': 'application/json' },
 *   });
 * };
 * ```
 */
export function createTracedStream(
  sourceStream: ReadableStream<any>,
  context?: RemixTraceContext
): ReadableStream<any> {
  const traceContext = context || (getTraceContext() as RemixTraceContext);

  if (!traceContext) {
    return sourceStream;
  }

  let bytesTransferred = 0;
  const startTime = Date.now();

  return new ReadableStream({
    async start(controller) {
      const reader = sourceStream.getReader();

      try {
        let reading = true;
        while (reading) {
          const { done, value } = await reader.read();

          if (done) {
            const duration = Date.now() - startTime;
            if (traceContext.metadata) {
              traceContext.metadata.streamDuration = duration;
              traceContext.metadata.bytesStreamed = bytesTransferred;
            }
            controller.close();
            reading = false;
          } else if (value) {
            bytesTransferred += value.length;
            controller.enqueue(value);
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },

    cancel(reason) {
      sourceStream.cancel(reason);
    },
  });
}

/**
 * Error handler for streaming responses
 *
 * Ensures trace context is properly recorded even when
 * errors occur during streaming
 *
 * @param error - The error that occurred
 * @param context - The trace context
 * @returns Response with error details
 *
 * @example
 * ```typescript
 * export const loader = async ({ request }) => {
 *   const context = getRemixTraceContext(request);
 *   try {
 *     return streamLargeFile();
 *   } catch (error) {
 *     return handleStreamingError(error, context);
 *   }
 * };
 * ```
 */
export function handleStreamingError(
  error: Error | unknown,
  context?: RemixTraceContext
): Response {
  const traceContext = context || (getTraceContext() as RemixTraceContext);

  const errorMessage = error instanceof Error ? error.message : String(error);
  const statusCode = 500;

  if (traceContext) {
    traceContext.statusCode = statusCode;
    traceContext.endTime = Date.now();
    traceContext.metadata = {
      ...traceContext.metadata,
      error: errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
    };
  }

  return createStreamingResponse(
    JSON.stringify({
      error: errorMessage,
      traceId: traceContext?.traceId,
      requestId: traceContext?.requestId,
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    },
    traceContext
  );
}

/**
 * Options for async iterator streaming
 */
export interface AsyncIteratorStreamingOptions extends DeferredStreamingOptions {
  /**
   * Emit progress events
   */
  emitProgress?: boolean;

  /**
   * Progress callback
   */
  onProgress?: (processed: number, total?: number) => void | Promise<void>;
}

/**
 * Create a streaming response from an async iterator
 *
 * Useful for streaming data from generators or async iterables
 * while maintaining trace context
 *
 * @param asyncIterable - The async iterable to stream
 * @param options - Streaming options
 * @param context - The trace context
 * @returns Response with streamed data
 *
 * @example
 * ```typescript
 * async function* generateData() {
 *   for (let i = 0; i < 100; i++) {
 *     yield JSON.stringify({ item: i });
 *     yield '\n';
 *   }
 * }
 *
 * export const loader = async ({ request }) => {
 *   const context = getRemixTraceContext(request);
 *   return createAsyncIteratorStream(generateData(), {}, context);
 * };
 * ```
 */
export async function createAsyncIteratorStream<T>(
  asyncIterable: AsyncIterable<T>,
  options: AsyncIteratorStreamingOptions = {},
  context?: RemixTraceContext
): Promise<Response> {
  const traceContext = context || (getTraceContext() as RemixTraceContext);
  const { emitProgress = false, onProgress } = options;

  return runWithTraceContextAsync(traceContext || ({} as RemixTraceContext), async () => {
    let processed = 0;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const item of asyncIterable) {
            processed++;

            // Emit progress
            if (emitProgress && onProgress) {
              try {
                await Promise.resolve(onProgress(processed));
              } catch {
                // Ignore callback errors
              }
            }

            // Encode and enqueue item
            const encoded = JSON.stringify(item);
            controller.enqueue(new TextEncoder().encode(encoded + '\n'));
          }

          if (traceContext) {
            traceContext.metadata = {
              ...traceContext.metadata,
              itemsProcessed: processed,
            };
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return createStreamingResponse(readableStream, {}, traceContext);
  });
}
