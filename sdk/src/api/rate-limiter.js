/**
 * Rate limiting implementation for trace ingestion API
 */
/**
 * Rate limiter for API requests
 */
export class RateLimiter {
    config;
    requestMap = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Check if request is allowed
     */
    isAllowed(identifier) {
        const now = Date.now();
        const record = this.requestMap.get(identifier);
        if (!record) {
            // First request for this identifier
            this.requestMap.set(identifier, {
                count: 1,
                resetTime: now + this.config.windowMs,
            });
            return true;
        }
        if (now >= record.resetTime) {
            // Reset window has passed
            this.requestMap.set(identifier, {
                count: 1,
                resetTime: now + this.config.windowMs,
            });
            return true;
        }
        // Still within window
        if (record.count < this.config.maxRequests) {
            record.count++;
            return true;
        }
        return false;
    }
    /**
     * Get remaining requests for identifier
     */
    getRemaining(identifier) {
        const record = this.requestMap.get(identifier);
        if (!record) {
            return this.config.maxRequests;
        }
        const now = Date.now();
        if (now >= record.resetTime) {
            return this.config.maxRequests;
        }
        return Math.max(0, this.config.maxRequests - record.count);
    }
    /**
     * Get reset time for identifier
     */
    getResetTime(identifier) {
        const record = this.requestMap.get(identifier);
        if (!record) {
            return Date.now();
        }
        return record.resetTime;
    }
    /**
     * Clear all rate limit records (for testing)
     */
    clear() {
        this.requestMap.clear();
    }
    /**
     * Clean up expired records (optional cleanup to prevent memory buildup)
     */
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        this.requestMap.forEach((record, key) => {
            if (now >= record.resetTime) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => {
            this.requestMap.delete(key);
        });
    }
}
//# sourceMappingURL=rate-limiter.js.map