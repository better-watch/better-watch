/**
 * Next.js Instrumentation Hook
 * 
 * This file is automatically loaded by Next.js when experimental.instrumentationHook
 * is enabled. It initializes TraceInject tracing for the server-side of the application.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling issues
    const { initializeTracing } = await import('./lib/trace');
    
    console.log('[Instrumentation] Initializing TraceInject...');
    initializeTracing();
  }
}
