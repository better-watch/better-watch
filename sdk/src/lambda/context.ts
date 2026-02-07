/**
 * Lambda Context Extraction and Propagation
 *
 * Extracts and propagates context from Lambda events (API Gateway, CloudFront, etc.)
 */

import {
  LambdaContext,
  LambdaTraceContext,
  LambdaHandlerOptions,
  ApiGatewayEventV1,
  ApiGatewayEventV2,
} from './types.js';

/**
 * Create Lambda trace context from event and Lambda context
 */
export function createLambdaTraceContext(
  event: unknown,
  context: LambdaContext,
  isColdStart: boolean,
  options: LambdaHandlerOptions = {}
): LambdaTraceContext {
  const traceContext: LambdaTraceContext = {
    awsRequestId: context.awsRequestId,
    functionName: context.functionName,
    functionVersion: context.functionVersion,
    memoryLimitMB: parseInt(context.memoryLimitInMB, 10),
    remainingTimeMs: context.getRemainingTimeInMillis(),
    isColdStart,
    isEdge: options.isEdge ?? isLambdaEdge(event, context),
    isHttpApi: isHttpApiEvent(event),
  };

  // Extract tracing headers for X-Ray
  const traceId = process.env._X_AMZN_TRACE_ID;
  if (traceId) {
    traceContext.traceId = traceId;
  }

  // Propagate API Gateway context
  if (options.propagateApiGateway !== false) {
    const apiGatewayCtx = extractApiGatewayContext(event);
    if (apiGatewayCtx) {
      traceContext.apiGatewayContext = apiGatewayCtx;
    }
  }

  // Propagate CloudFront context (Lambda@Edge)
  if ((options.propagateCloudFront !== false) && isLambdaEdge(event, context)) {
    const cloudFrontCtx = extractCloudFrontContext(event);
    if (cloudFrontCtx) {
      traceContext.cloudFrontContext = cloudFrontCtx;
    }
  }

  // Custom context propagation
  if (options.propagateContext) {
    const customCtx = options.propagateContext(event, context);
    Object.assign(traceContext, customCtx);
  }

  return traceContext;
}

/**
 * Check if this is a Lambda@Edge invocation
 */
export function isLambdaEdge(event: unknown, context: LambdaContext): boolean {
  // Lambda@Edge function ARNs contain 'lambda:edge'
  if (context.invokedFunctionArn?.includes('lambda:edge')) {
    return true;
  }

  // Check for CloudFront event structure
  const eventObj = event as Record<string, unknown>;
  if (Array.isArray(eventObj.Records) && eventObj.Records[0]) {
    const record = eventObj.Records[0] as Record<string, unknown>;
    if (record.cf) {
      return true;
    }
  }

  return false;
}

/**
 * Check if this is an HTTP API event (API Gateway v2)
 */
export function isHttpApiEvent(event: unknown): boolean {
  const eventObj = event as Record<string, unknown>;
  return eventObj.version === '2.0' ||
         (typeof eventObj.requestContext === 'object' &&
          eventObj.requestContext !== null &&
          (eventObj.requestContext as Record<string, unknown>).http !== undefined);
}

/**
 * Check if this is an API Gateway v1 REST API event
 */
export function isRestApiEvent(event: unknown): boolean {
  const eventObj = event as Record<string, unknown>;
  return (
    eventObj.httpMethod !== undefined && eventObj.requestContext !== undefined &&
    !isHttpApiEvent(event)
  );
}

/**
 * Extract API Gateway context from event
 */
export function extractApiGatewayContext(
  event: unknown
): LambdaTraceContext['apiGatewayContext'] | null {
  if (isHttpApiEvent(event)) {
    return extractHttpApiContext(event as ApiGatewayEventV2);
  }

  if (isRestApiEvent(event)) {
    return extractRestApiContext(event as ApiGatewayEventV1);
  }

  return null;
}

/**
 * Extract HTTP API (v2) context
 */
function extractHttpApiContext(
  event: ApiGatewayEventV2
): LambdaTraceContext['apiGatewayContext'] {
  return {
    stage: event.requestContext.stage,
    requestId: event.requestContext.requestId,
    httpMethod: event.requestContext.http.method,
    path: event.requestContext.http.path,
    sourceIp: event.requestContext.http.sourceIp,
  };
}

/**
 * Extract REST API (v1) context
 */
function extractRestApiContext(
  event: ApiGatewayEventV1
): LambdaTraceContext['apiGatewayContext'] {
  return {
    stage: event.requestContext.stage,
    requestId: event.requestContext.requestId,
    httpMethod: event.httpMethod,
    path: event.path,
    sourceIp: event.requestContext.identity.sourceIp,
  };
}

/**
 * Extract CloudFront (Lambda@Edge) context
 */
export function extractCloudFrontContext(
  event: unknown
): LambdaTraceContext['cloudFrontContext'] | null {
  const eventObj = event as Record<string, unknown>;
  if (!Array.isArray(eventObj.Records) || !eventObj.Records[0]) {
    return null;
  }

  const record = eventObj.Records[0] as Record<string, unknown>;
  const cfEvent = record.cf;
  if (!cfEvent) {
    return null;
  }

  const cf = cfEvent as Record<string, unknown>;
  const config = cf.config as Record<string, unknown>;

  return {
    distributionId: String(config.distributionId),
    eventType: String(config.eventType),
    requestId: String(config.requestId),
  };
}

/**
 * Extract trace ID from X-Ray environment variable
 */
export function getXRayTraceId(): string | null {
  const traceIdHeader = process.env._X_AMZN_TRACE_ID;
  if (!traceIdHeader) {
    return null;
  }

  // Format: Root=1-<timestamp>-<id>;Parent=<parent>;Sampled=<sampled>
  const rootMatch = traceIdHeader.match(/Root=([^;]+)/);
  return rootMatch?.[1] ?? traceIdHeader;
}

/**
 * Extract trace context from HTTP headers
 * Supports W3C Trace Context and AWS X-Ray format
 */
export function extractTracePropagation(
  headers: Record<string, unknown>
): { traceId?: string; parentTraceId?: string } {
  const result: { traceId?: string; parentTraceId?: string } = {};

  // Check for W3C Trace Context
  const traceParent = headers['traceparent'];
  if (traceParent && typeof traceParent === 'string') {
    const parts = traceParent.split('-');
    if (parts.length >= 2) {
      result.traceId = parts[1];
      result.parentTraceId = parts[2];
    }
  }

  // Check for X-Ray trace ID
  const xrayHeader = headers['x-amzn-trace-id'];
  if (xrayHeader && typeof xrayHeader === 'string') {
    const rootMatch = xrayHeader.match(/Root=([^;]+)/);
    if (rootMatch) {
      result.traceId = rootMatch[1];
    }

    const parentMatch = xrayHeader.match(/Parent=([^;]+)/);
    if (parentMatch) {
      result.parentTraceId = parentMatch[1];
    }
  }

  return result;
}

/**
 * Create W3C Trace Context header value
 */
export function createTraceParentHeader(
  traceId: string,
  parentTraceId?: string
): string {
  const version = '00';
  const parent = parentTraceId || '0000000000000000';
  const traceFlags = '01'; // Sampled

  return `${version}-${traceId}-${parent}-${traceFlags}`;
}

/**
 * Determine if request is sampled for tracing
 */
export function isTraceSampled(event: unknown): boolean {
  // Check for X-Ray sampling decision
  const eventObj = event as Record<string, unknown>;
  const headers = eventObj.headers;

  if (typeof headers === 'object' && headers !== null) {
    const headersObj = headers as Record<string, unknown>;
    const xrayHeader = headersObj['x-amzn-trace-id'];

    if (xrayHeader && typeof xrayHeader === 'string') {
      const sampledMatch = xrayHeader.match(/Sampled=([01])/);
      if (sampledMatch) {
        return sampledMatch[1] === '1';
      }
    }
  }

  // Default to sampling enabled
  return true;
}
