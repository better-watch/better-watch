/**
 * Config Management API Server
 */
import type { StoredTracepointConfig, ApiKey, CreateTracepointRequest, UpdateTracepointRequest, CreateApiKeyRequest, ConfigExport, ConfigImportRequest, ConfigImportResult, AuditLogEntry, TracepointQueryFilter } from './config-types.js';
import type { ConfigStorageBackend } from './config-storage.js';
/**
 * Configuration for the Config Management Server
 */
export interface ConfigManagementServerConfig {
    /**
     * Storage backend to use
     */
    storage: ConfigStorageBackend;
    /**
     * Function to validate API key access
     */
    validateApiKey?: (apiKey: string, projectId: string, permission: string) => Promise<boolean>;
    /**
     * Function to get current user ID (for audit logging)
     */
    getCurrentUser?: () => string | undefined;
    /**
     * Function to get client ID (for audit logging)
     */
    getClientId?: () => string | undefined;
    /**
     * Maximum number of tracepoints per project/environment
     */
    maxTracepointsPerEnvironment?: number;
    /**
     * Maximum size of imported configuration in bytes
     */
    maxImportSize?: number;
}
/**
 * Config Management API Server
 */
export declare class ConfigManagementServer {
    private config;
    constructor(config: ConfigManagementServerConfig);
    /**
     * Create a new tracepoint
     */
    createTracepoint(projectId: string, environment: string, request: CreateTracepointRequest, apiKey?: string): Promise<StoredTracepointConfig>;
    /**
     * Get a tracepoint by ID
     */
    getTracepoint(projectId: string, environment: string, id: string, apiKey?: string): Promise<StoredTracepointConfig>;
    /**
     * List tracepoints with filtering
     */
    listTracepoints(projectId: string, environment: string, filter?: TracepointQueryFilter, apiKey?: string): Promise<{
        tracepoints: StoredTracepointConfig[];
        total: number;
    }>;
    /**
     * Update a tracepoint
     */
    updateTracepoint(projectId: string, environment: string, id: string, request: UpdateTracepointRequest, apiKey?: string): Promise<StoredTracepointConfig>;
    /**
     * Delete a tracepoint
     */
    deleteTracepoint(projectId: string, environment: string, id: string, apiKey?: string): Promise<void>;
    /**
     * Enable a tracepoint
     */
    enableTracepoint(projectId: string, environment: string, id: string, apiKey?: string): Promise<StoredTracepointConfig>;
    /**
     * Disable a tracepoint
     */
    disableTracepoint(projectId: string, environment: string, id: string, apiKey?: string): Promise<StoredTracepointConfig>;
    /**
     * Get version history for a tracepoint
     */
    getVersionHistory(projectId: string, environment: string, id: string, apiKey?: string): Promise<unknown[]>;
    /**
     * Rollback a tracepoint to a previous version
     */
    rollbackVersion(projectId: string, environment: string, id: string, versionId: string, apiKey?: string): Promise<StoredTracepointConfig>;
    /**
     * Create a new API key
     */
    createApiKey(projectId: string, request: CreateApiKeyRequest, apiKey?: string): Promise<ApiKey>;
    /**
     * List API keys for a project
     */
    listApiKeys(projectId: string, apiKey?: string): Promise<ApiKey[]>;
    /**
     * Revoke an API key
     */
    revokeApiKey(projectId: string, keyId: string, apiKey?: string): Promise<void>;
    /**
     * Get audit log entries
     */
    getAuditLog(projectId: string, options?: {
        resourceType?: string;
        resourceId?: string;
        action?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
    }, apiKey?: string): Promise<AuditLogEntry[]>;
    /**
     * Export configuration
     */
    exportConfig(projectId: string, environment: string, filter?: TracepointQueryFilter, apiKey?: string): Promise<ConfigExport>;
    /**
     * Import configuration
     */
    importConfig(projectId: string, request: ConfigImportRequest, apiKey?: string): Promise<ConfigImportResult>;
    /**
     * Get audit log for a specific resource
     */
    getResourceAuditLog(projectId: string, resourceType: string, resourceId: string): Promise<AuditLogEntry[]>;
    /**
     * Close server and cleanup
     */
    close(): Promise<void>;
    /**
     * Validate API key permissions
     */
    private validatePermission;
    /**
     * Generate a secure API key
     */
    private generateApiKey;
    /**
     * Create a structured error
     */
    private error;
}
//# sourceMappingURL=config-server.d.ts.map