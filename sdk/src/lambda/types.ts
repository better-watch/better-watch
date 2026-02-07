/**
 * AWS Lambda Integration Types
 *
 * Defines types for AWS Lambda handler wrapping, context propagation,
 * and cold start detection
 */

/**
 * AWS Lambda context object
 * https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
 */
export interface LambdaContext {
  awsRequestId: string;
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  logGroupName: string;
  logStreamName: string;
  identity?: LambdaContextIdentity;
  clientContext?: LambdaClientContext;
  getRemainingTimeInMillis(): number;
}

/**
 * Lambda context identity (for CloudFront)
 */
export interface LambdaContextIdentity {
  sourceIp?: string;
  userAgent?: string;
}

/**
 * Lambda client context
 */
export interface LambdaClientContext {
  installationId?: string;
  appTitle?: string;
  appVersionCode?: string;
  appVersionName?: string;
  client?: {
    appPackageName?: string;
  };
  env?: Record<string, string>;
}

/**
 * API Gateway event (v1.0)
 */
export interface ApiGatewayEventV1 {
  resource: string;
  path: string;
  httpMethod: string;
  headers: Record<string, string>;
  multiValueHeaders: Record<string, string[]>;
  queryStringParameters: Record<string, string> | null;
  multiValueQueryStringParameters: Record<string, string[]> | null;
  pathParameters: Record<string, string> | null;
  stageVariables: Record<string, string> | null;
  requestContext: ApiGatewayRequestContext;
  body: string | null;
  isBase64Encoded: boolean;
}

/**
 * API Gateway event (v2.0 / HTTP API)
 */
export interface ApiGatewayEventV2 {
  version: '2.0';
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  headers: Record<string, string>;
  queryStringParameters: Record<string, string> | undefined;
  pathParameters: Record<string, string> | undefined;
  requestContext: ApiGatewayHttpRequestContext;
  body: string | undefined;
  isBase64Encoded: boolean;
}

/**
 * API Gateway request context (v1)
 */
export interface ApiGatewayRequestContext {
  resourceId: string;
  resourcePath: string;
  httpMethod: string;
  requestId: string;
  accountId: string;
  stage: string;
  requestTime: string;
  requestTimeEpoch: number;
  identity: ApiGatewayRequestIdentity;
  authorizer?: Record<string, any>;
  protocol: string;
  path: string;
  connectedAt?: number;
  messageDirection?: string;
  messageId: string | null;
  eventType?: string;
  extendedRequestId: string;
  contentLength?: number;
  wsClose?: { statusCode?: number; reason?: string };
}

/**
 * API Gateway HTTP request context (v2)
 */
export interface ApiGatewayHttpRequestContext {
  http: {
    method: string;
    path: string;
    protocol: string;
    sourceIp: string;
    userAgent: string;
  };
  routeKey: string;
  timestamp: string;
  timeEpoch: number;
  requestId: string;
  accountId: string;
  stage: string;
  domainName: string;
  domainPrefix: string;
}

/**
 * API Gateway request identity
 */
export interface ApiGatewayRequestIdentity {
  sourceIp: string;
  userAgent: string;
  accountId: string | null;
  apiKey: string | null;
  caller: string | null;
  cognitoAuthenticationType: string | null;
  cognitoAuthenticationProvider: string | null;
  cognitoIdentityId: string | null;
  cognitoIdentityPoolId: string | null;
  principalOrgId: string | null;
  user: string | null;
  userArn: string | null;
}

/**
 * Lambda@Edge CloudFront event
 */
export interface LambdaEdgeEvent {
  Records: Array<{
    cf: {
      config: {
        distributionDomainName: string;
        distributionId: string;
        eventType: 'viewer-request' | 'origin-request' | 'viewer-response' | 'origin-response';
        requestId: string;
      };
      request?: {
        method: string;
        uri: string;
        querystring: string;
        headers: Record<string, Array<{ key: string; value: string }>>;
        clientIp: string;
      };
      response?: {
        status: string;
        statusDescription: string;
        headers: Record<string, Array<{ key: string; value: string }>>;
      };
    };
  }>;
}

/**
 * Lambda handler type
 */
export type LambdaHandler<E = any, R = any> = (
  event: E,
  context: LambdaContext,
  callback?: (error?: Error | null, result?: R) => void
) => Promise<R> | R;

/**
 * Lambda handler wrapper options
 */
export interface LambdaHandlerOptions {
  /**
   * Enable cold start detection and tracing
   */
  detectColdStart?: boolean;

  /**
   * Time buffer before Lambda timeout to trigger flush (ms)
   * Default: 3000 (flush 3s before timeout)
   */
  timeoutBuffer?: number;

  /**
   * Maximum time to wait for trace flush before timeout
   * If flush exceeds this, it will be interrupted
   */
  maxFlushWait?: number;

  /**
   * Propagate API Gateway context to traces
   */
  propagateApiGateway?: boolean;

  /**
   * Include CloudFront context in traces (Lambda@Edge)
   */
  propagateCloudFront?: boolean;

  /**
   * Custom context propagation function
   */
  propagateContext?: (event: any, context: LambdaContext) => Record<string, any>;

  /**
   * Whether this is Lambda@Edge
   */
  isEdge?: boolean;

  /**
   * Support Lambda Extensions API
   * Requires Lambda service to have extensions enabled
   */
  supportExtensions?: boolean;

  /**
   * Extensions API base URL
   * Default: from AWS_LAMBDA_RUNTIME_API env var
   */
  extensionsApiUrl?: string;
}

/**
 * Lambda tracer context with metadata
 */
export interface LambdaTraceContext {
  awsRequestId: string;
  functionName: string;
  functionVersion: string;
  memoryLimitMB: number;
  remainingTimeMs: number;
  isColdStart: boolean;
  isEdge: boolean;
  isHttpApi: boolean;
  invokeId?: string;
  traceId?: string;
  parentTraceId?: string;
  apiGatewayContext?: {
    stage: string;
    requestId: string;
    httpMethod: string;
    path: string;
    sourceIp: string;
  };
  cloudFrontContext?: {
    distributionId: string;
    eventType: string;
    requestId: string;
  };
}

/**
 * Extension registration response
 */
export interface ExtensionRegisterResponse {
  FunctionVersion: string;
  FunctionArn: string;
  ExtensionId: string;
}

/**
 * Extension event
 */
export interface ExtensionEvent {
  eventType: 'INVOKE' | 'SHUTDOWN';
  deadlineMs: number;
  requestId: string;
  invokedFunctionArn: string;
  traceId: string;
  shutdownReason?: string;
}

/**
 * Trace export response from Extensions API
 */
export interface ExtensionExportResponse {
  statusCode: number;
  body?: string;
  error?: string;
}
