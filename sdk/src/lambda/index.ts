/**
 * @trace-inject/lambda
 *
 * AWS Lambda integration for trace injection
 *
 * Provides:
 * - Automatic Lambda handler wrapping with trace management
 * - Cold start detection and tracing
 * - API Gateway context propagation (REST API and HTTP API)
 * - Lambda@Edge support (CloudFront)
 * - Async trace export via Lambda Extensions
 * - Intelligent timeout-aware trace flushing
 *
 * Usage:
 *
 * ```typescript
 * import { wrapHandler } from '@trace-inject/lambda';
 *
 * export const handler = wrapHandler(async (event, context) => {
 *   // Your handler code with injected tracepoints
 *   return { statusCode: 200 };
 * });
 * ```
 *
 * With options:
 *
 * ```typescript
 * export const handler = wrapHandler(
 *   async (event, context) => {
 *     return { statusCode: 200 };
 *   },
 *   {
 *     detectColdStart: true,
 *     propagateApiGateway: true,
 *     supportExtensions: true,
 *     timeoutBuffer: 3000, // Flush 3s before timeout
 *   }
 * );
 * ```
 */

export * from './types.js';
export * from './handler.js';
export * from './context.js';
export * from './extensions.js';
