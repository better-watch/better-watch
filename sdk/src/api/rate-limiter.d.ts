/**
 * Rate limiting implementation for trace ingestion API
 */
export interface RateLimitConfig {
    /**
     * Maximum requests per time window
     */
    maxRequests: number;
    /**
     * Time window in milliseconds
     */
    windowMs: number;
    /**
     * Whether to track limits per project
     */
    perProject: boolean;
}
/**
 * Rate limiter for API requests
 */
export declare class RateLimiter {
    private config;
    private requestMap;
    constructor(config: RateLimitConfig);
    /**
     * Check if request is allowed
     */
    isAllowed(identifier: string): boolean;
    /**
     * Get remaining requests for identifier
     */
    getRemaining(identifier: string): number;
    /**
     * Get reset time for identifier
     */
    getResetTime(identifier: string): number;
    /**
     * Clear all rate limit records (for testing)
     */
    clear(): void;
    /**
     * Clean up expired records (optional cleanup to prevent memory buildup)
     */
    cleanup(): void;
}
//# sourceMappingURL=rate-limiter.d.ts.map