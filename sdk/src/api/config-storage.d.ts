/**
 * Storage interface and implementations for configuration management
 */
import type { StoredTracepointConfig, ApiKey, AuditLogEntry, ConfigVersion, TracepointQueryFilter } from './config-types.js';
/**
 * Storage backend interface for configuration management
 */
export interface ConfigStorageBackend {
    /**
     * Tracepoint operations
     */
    tracepoints: {
        /**
         * Create a new tracepoint
         */
        create(projectId: string, environment: string, config: Omit<StoredTracepointConfig, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'previousVersionId'>): Promise<StoredTracepointConfig>;
        /**
         * Get a tracepoint by ID
         */
        getById(projectId: string, environment: string, id: string): Promise<StoredTracepointConfig | null>;
        /**
         * List tracepoints
         */
        list(projectId: string, environment: string, filter?: TracepointQueryFilter): Promise<{
            tracepoints: StoredTracepointConfig[];
            total: number;
        }>;
        /**
         * Update a tracepoint
         */
        update(projectId: string, environment: string, id: string, updates: Partial<StoredTracepointConfig>, createVersion: boolean): Promise<StoredTracepointConfig>;
        /**
         * Delete a tracepoint
         */
        delete(projectId: string, environment: string, id: string): Promise<void>;
        /**
         * Get version history
         */
        getVersionHistory(projectId: string, environment: string, id: string): Promise<ConfigVersion[]>;
        /**
         * Rollback to a previous version
         */
        rollback(projectId: string, environment: string, id: string, versionId: string): Promise<StoredTracepointConfig>;
    };
    /**
     * API key operations
     */
    apiKeys: {
        /**
         * Create a new API key
         */
        create(projectId: string, key: Omit<ApiKey, 'id' | 'createdAt'>): Promise<ApiKey>;
        /**
         * Get API key by ID
         */
        getById(projectId: string, id: string): Promise<ApiKey | null>;
        /**
         * Get API key by key string
         */
        getByKey(key: string): Promise<ApiKey | null>;
        /**
         * List API keys for a project
         */
        list(projectId: string): Promise<ApiKey[]>;
        /**
         * Revoke an API key
         */
        revoke(projectId: string, id: string): Promise<void>;
        /**
         * Update last used timestamp
         */
        updateLastUsed(key: string): Promise<void>;
    };
    /**
     * Audit log operations
     */
    auditLog: {
        /**
         * Record an audit log entry
         */
        log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
        /**
         * Query audit log
         */
        query(projectId: string, options?: {
            resourceType?: string;
            resourceId?: string;
            action?: string;
            startTime?: string;
            endTime?: string;
            limit?: number;
        }): Promise<AuditLogEntry[]>;
    };
    /**
     * Close/cleanup
     */
    close(): Promise<void>;
}
/**
 * In-memory configuration storage implementation
 */
export declare class InMemoryConfigStorage implements ConfigStorageBackend {
    private tracepointsMap;
    private tracepointVersions;
    private apiKeysMap;
    private apiKeysByString;
    private auditLogs;
    private idCounter;
    readonly tracepoints: {
        create: (projectId: string, environment: string, config: Omit<StoredTracepointConfig, "id" | "createdAt" | "updatedAt" | "version" | "previousVersionId">) => Promise<StoredTracepointConfig>;
        getById: (projectId: string, environment: string, id: string) => Promise<StoredTracepointConfig | null>;
        list: (projectId: string, environment: string, filter?: TracepointQueryFilter) => Promise<{
            tracepoints: StoredTracepointConfig[];
            total: number;
        }>;
        update: (projectId: string, environment: string, id: string, updates: Partial<StoredTracepointConfig>, createVersion: boolean) => Promise<StoredTracepointConfig>;
        delete: (projectId: string, environment: string, id: string) => Promise<void>;
        getVersionHistory: (projectId: string, environment: string, id: string) => Promise<ConfigVersion[]>;
        rollback: (projectId: string, environment: string, id: string, versionId: string) => Promise<StoredTracepointConfig>;
    };
    apiKeys: {
        create: (projectId: string, key: Omit<ApiKey, "id" | "createdAt">) => Promise<ApiKey>;
        getById: (projectId: string, id: string) => Promise<ApiKey | null>;
        getByKey: (key: string) => Promise<ApiKey | null>;
        list: (projectId: string) => Promise<ApiKey[]>;
        revoke: (projectId: string, id: string) => Promise<void>;
        updateLastUsed: (key: string) => Promise<void>;
    };
    readonly auditLog: {
        log: (entry: Omit<AuditLogEntry, "id" | "timestamp">) => Promise<AuditLogEntry>;
        query: (projectId: string, options?: {
            resourceType?: string;
            resourceId?: string;
            action?: string;
            startTime?: string;
            endTime?: string;
            limit?: number;
        }) => Promise<AuditLogEntry[]>;
    };
    close(): Promise<void>;
    private generateId;
}
//# sourceMappingURL=config-storage.d.ts.map