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
export class Authenticator {
  private apiKeys: Map<string, string>;
  private customValidator?: (apiKey: string, projectId: string) => Promise<boolean>;

  constructor(config?: AuthConfig) {
    this.apiKeys = new Map(Object.entries(config?.apiKeys || {}));
    this.customValidator = config?.validate;
  }

  /**
   * Authenticate an API key with a project ID
   */
  async authenticate(apiKey: string, projectId: string): Promise<boolean> {
    if (!apiKey || !projectId) {
      return false;
    }

    // Check custom validator first (if provided, it's the sole source of truth)
    if (this.customValidator) {
      try {
        return await this.customValidator(apiKey, projectId);
      } catch {
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
  addApiKey(apiKey: string, projectId: string): void {
    this.apiKeys.set(apiKey, projectId);
  }

  /**
   * Remove an API key
   */
  removeApiKey(apiKey: string): void {
    this.apiKeys.delete(apiKey);
  }

  /**
   * Check if an API key exists
   */
  hasApiKey(apiKey: string): boolean {
    return this.apiKeys.has(apiKey);
  }

  /**
   * Get project ID for an API key
   */
  getProjectId(apiKey: string): string | undefined {
    return this.apiKeys.get(apiKey);
  }
}
