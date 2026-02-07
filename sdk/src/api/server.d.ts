/**
 * Trace Ingestion API Server
 */
import type { TraceIngestionConfig, TraceIngestionResponse, TraceStorageBackend } from './types.js';
import { Authenticator } from './auth.js';
import { RateLimiter } from './rate-limiter.js';
/**
 * Trace Ingestion API Server
 */
export declare class TraceIngestionServer {
    private config;
    private storage;
    private authenticator;
    private rateLimiter;
    private requestCounter;
    constructor(config?: TraceIngestionConfig);
    private initializeStorage;
    /**
     * Process a batch trace ingestion request
     */
    ingestTraces(payload: unknown, payloadSize?: number): Promise<TraceIngestionResponse>;
    /**
     * Get server configuration
     */
    getConfig(): TraceIngestionConfig;
    /**
     * Get storage backend
     */
    getStorage(): TraceStorageBackend;
    /**
     * Get authenticator
     */
    getAuthenticator(): Authenticator;
    /**
     * Get rate limiter
     */
    getRateLimiter(): RateLimiter;
    /**
     * Shutdown server
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map