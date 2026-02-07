/**
 * Authentication logic for trace ingestion API
 */
export interface AuthConfig {
    /**
     * Map of API keys to project IDs
     */
    apiKeys?: Record<string, string>;
    /**
     * Custom authentication function
     */
    validate?: (apiKey: string, projectId: string) => Promise<boolean>;
}
/**
 * Authenticator for API requests
 */
export declare class Authenticator {
    private apiKeys;
    private customValidator?;
    constructor(config?: AuthConfig);
    /**
     * Authenticate an API key with a project ID
     */
    authenticate(apiKey: string, projectId: string): Promise<boolean>;
    /**
     * Add an API key
     */
    addApiKey(apiKey: string, projectId: string): void;
    /**
     * Remove an API key
     */
    removeApiKey(apiKey: string): void;
    /**
     * Check if an API key exists
     */
    hasApiKey(apiKey: string): boolean;
    /**
     * Get project ID for an API key
     */
    getProjectId(apiKey: string): string | undefined;
}
//# sourceMappingURL=auth.d.ts.map