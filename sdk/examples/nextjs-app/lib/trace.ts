/**
 * TraceInject Runtime Integration
 * 
 * This module initializes the trace buffer and configures trace export
 * to the remote trace server for real-time debugging.
 */

// Import from the compiled dist folder
import {
  initializeTraceBuffer,
  flush,
  type RuntimeTrace,
} from '../../../dist/runtime.js';

// Configuration from environment
const TRACE_SERVER_URL = process.env.TRACE_SERVER_URL || 'http://localhost:4444';
const TRACE_PROJECT_ID = process.env.TRACE_PROJECT_ID || 'nextjs-example';
const TRACE_API_KEY = process.env.TRACE_API_KEY || 'demo-api-key';

let isInitialized = false;

/**
 * Initialize trace collection and export
 */
export function initializeTracing() {
  if (isInitialized) {
    return;
  }

  initializeTraceBuffer({
    maxSize: 500,
    maxBytes: 2 * 1024 * 1024, // 2MB
    flushInterval: 3000, // Flush every 3 seconds
    enabled: process.env.NODE_ENV !== 'test',
    metadata: {
      projectId: TRACE_PROJECT_ID,
      environment: process.env.NODE_ENV || 'development',
      runtime: 'next.js',
    },
    onFlush: async (traces: RuntimeTrace[]) => {
      if (traces.length === 0) return;

      try {
        const response = await fetch(`${TRACE_SERVER_URL}/api/traces`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': TRACE_API_KEY,
            'X-Project-ID': TRACE_PROJECT_ID,
          },
          body: JSON.stringify({
            projectId: TRACE_PROJECT_ID,
            apiKey: TRACE_API_KEY,
            traces: traces.map((t) => ({
              ...t,
              id: t.id || `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              timestamp: new Date(t.timestamp).toISOString(),
            })),
          }),
        });

        if (!response.ok) {
          console.error('[TraceInject] Failed to send traces:', response.statusText);
        }
      } catch (error) {
        // Silently fail to avoid affecting app performance
        console.error('[TraceInject] Error sending traces:', error);
      }
    },
    onError: (error: Error) => {
      console.error('[TraceInject] Trace error:', error.message);
    },
  });

  isInitialized = true;
  console.log('[TraceInject] Initialized - traces will be sent to', TRACE_SERVER_URL);
}

/**
 * Manually flush pending traces
 */
export async function flushTraces() {
  await flush();
}

/**
 * Check if tracing is initialized
 */
export function isTracingInitialized() {
  return isInitialized;
}
