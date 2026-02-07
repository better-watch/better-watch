/**
 * Authentication logic for trace ingestion API
 */
/**
 * Authenticator for API requests
 */
export class Authenticator {
    apiKeys;
    customValidator;
    constructor(config) {
        this.apiKeys = new Map(Object.entries(config?.apiKeys || {}));
        this.customValidator = config?.validate;
    }
    /**
     * Authenticate an API key with a project ID
     */
    async authenticate(apiKey, projectId) {
        if (!apiKey || !projectId) {
            return false;
        }
        // Check custom validator first (if provided, it's the sole source of truth)
        if (this.customValidator) {
            try {
                return await this.customValidator(apiKey, projectId);
            }
            catch {
                return false;
            }
        }
        // Check built-in API keys
        const storedProjectId = this.apiKeys.get(apiKey);
        if (storedProjectId === projectId) {
            return true;
        }
        return false;
    }
    /**
     * Add an API key
     */
    addApiKey(apiKey, projectId) {
        this.apiKeys.set(apiKey, projectId);
    }
    /**
     * Remove an API key
     */
    removeApiKey(apiKey) {
        this.apiKeys.delete(apiKey);
    }
    /**
     * Check if an API key exists
     */
    hasApiKey(apiKey) {
        return this.apiKeys.has(apiKey);
    }
    /**
     * Get project ID for an API key
     */
    getProjectId(apiKey) {
        return this.apiKeys.get(apiKey);
    }
}
//# sourceMappingURL=auth.js.map