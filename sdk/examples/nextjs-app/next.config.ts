import type { NextConfig } from 'next';
import path from 'path';

/**
 * Next.js configuration with TraceInject plugin
 * 
 * In a production setup, you would use:
 * 
 * ```ts
 * import withTraceInject from '@trace-inject/nextjs';
 * 
 * export default withTraceInject({
 *   configPath: './tracepoint-config.json',
 *   enabled: true,
 *   serverOnly: true,
 *   remoteConfig: {
 *     enabled: true,
 *     endpoint: process.env.TRACE_CONFIG_ENDPOINT,
 *   },
 * })(nextConfig);
 * ```
 * 
 * For this example, we're using a simplified setup that works
 * with the local trace-inject core package.
 */

const nextConfig: NextConfig = {
  // Set the output file tracing root to avoid the lockfile warning
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Environment variables for trace configuration
  env: {
    TRACE_SERVER_URL: process.env.TRACE_SERVER_URL || 'http://localhost:4444',
    TRACE_PROJECT_ID: process.env.TRACE_PROJECT_ID || 'nextjs-example',
    TRACE_ENABLED: process.env.TRACE_ENABLED || 'true',
  },
};

export default nextConfig;
