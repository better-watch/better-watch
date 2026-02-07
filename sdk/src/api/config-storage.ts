/**
 * Storage interface and implementations for configuration management
 */

import type {
  StoredTracepointConfig,
  ApiKey,
  AuditLogEntry,
  ConfigVersion,
  TracepointQueryFilter,
} from './config-types.js';

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
    create(
      projectId: string,
      environment: string,
      config: Omit<StoredTracepointConfig, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'previousVersionId'>
    ): Promise<StoredTracepointConfig>;

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
    update(
      projectId: string,
      environment: string,
      id: string,
      updates: Partial<StoredTracepointConfig>,
      createVersion: boolean
    ): Promise<StoredTracepointConfig>;

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
    query(
      projectId: string,
      options?: {
        resourceType?: string;
        resourceId?: string;
        action?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
      }
    ): Promise<AuditLogEntry[]>;
  };

  /**
   * Close/cleanup
   */
  close(): Promise<void>;
}

/**
 * In-memory configuration storage implementation
 */
export class InMemoryConfigStorage implements ConfigStorageBackend {
  private tracepointsMap: Map<string, Map<string, StoredTracepointConfig>> = new Map();
  private tracepointVersions: Map<string, ConfigVersion[]> = new Map();
  private apiKeysMap: Map<string, ApiKey> = new Map();
  private apiKeysByString: Map<string, ApiKey> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private idCounter = 0;

  readonly tracepoints = {
    create: async (
      projectId: string,
      environment: string,
      config: Omit<StoredTracepointConfig, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'previousVersionId'>
    ): Promise<StoredTracepointConfig> => {
      const id = this.generateId();
      const now = new Date().toISOString();

      const tracepointConfig: StoredTracepointConfig = {
        ...config,
        id,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      const key = `${projectId}:${environment}`;
      if (!this.tracepointsMap.has(key)) {
        this.tracepointsMap.set(key, new Map());
      }
      this.tracepointsMap.get(key)!.set(id, tracepointConfig);

      // Store version history
      const versionKey = `${projectId}:${environment}:${id}`;
      this.tracepointVersions.set(versionKey, [
        {
          versionId: '1',
          config: tracepointConfig,
          timestamp: now,
          changedBy: config.createdBy,
        },
      ]);

      return tracepointConfig;
    },

    getById: async (projectId: string, environment: string, id: string): Promise<StoredTracepointConfig | null> => {
      const key = `${projectId}:${environment}`;
      return this.tracepointsMap.get(key)?.get(id) ?? null;
    },

    list: async (
      projectId: string,
      environment: string,
      filter?: TracepointQueryFilter
    ): Promise<{ tracepoints: StoredTracepointConfig[]; total: number }> => {
      const key = `${projectId}:${environment}`;
      let items = Array.from(this.tracepointsMap.get(key)?.values() ?? []);

      // Apply filters
      if (filter?.enabled !== undefined) {
        items = items.filter((t) => t.enabled === filter.enabled);
      }

      if (filter?.tags && filter.tags.length > 0) {
        items = items.filter((t) => filter.tags!.every((tag) => t.tags?.includes(tag)));
      }

      if (filter?.filePath) {
        items = items.filter((t) => t.filePath.includes(filter.filePath!));
      }

      if (filter?.functionName) {
        items = items.filter((t) => t.functionName === filter.functionName);
      }

      if (filter?.type) {
        items = items.filter((t) => t.type === filter.type);
      }

      // Sort
      const sortBy = filter?.sortBy ?? 'createdAt';
      const sortOrder = filter?.sortOrder ?? 'desc';
      items.sort((a, b) => {
        const aVal = a[sortBy as keyof StoredTracepointConfig];
        const bVal = b[sortBy as keyof StoredTracepointConfig];
        if (aVal === undefined || bVal === undefined) return 0;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });

      const total = items.length;
      const limit = filter?.limit ?? 100;
      const offset = filter?.offset ?? 0;
      const paginated = items.slice(offset, offset + limit);

      return { tracepoints: paginated, total };
    },

    update: async (
      projectId: string,
      environment: string,
      id: string,
      updates: Partial<StoredTracepointConfig>,
      createVersion: boolean
    ): Promise<StoredTracepointConfig> => {
      const key = `${projectId}:${environment}`;
      const existing = this.tracepointsMap.get(key)?.get(id);
      if (!existing) {
        throw new Error(`Tracepoint not found: ${id}`);
      }

      const now = new Date().toISOString();
      const updated: StoredTracepointConfig = {
        ...existing,
        ...updates,
        id,
        projectId,
        environment,
        updatedAt: now,
        previousVersionId: createVersion ? undefined : existing.id,
      };

      if (createVersion) {
        updated.version = existing.version + 1;
        updated.previousVersionId = `${existing.id}-v${existing.version}`;

        // Store old version
        const versionKey = `${projectId}:${environment}:${id}`;
        const versions = this.tracepointVersions.get(versionKey) ?? [];
        versions.push({
          versionId: String(existing.version),
          config: existing,
          timestamp: existing.updatedAt,
          changedBy: existing.updatedBy,
        });
        this.tracepointVersions.set(versionKey, versions);
      }

      this.tracepointsMap.get(key)!.set(id, updated);
      return updated;
    },

    delete: async (projectId: string, environment: string, id: string): Promise<void> => {
      const key = `${projectId}:${environment}`;
      this.tracepointsMap.get(key)?.delete(id);
    },

    getVersionHistory: async (
      projectId: string,
      environment: string,
      id: string
    ): Promise<ConfigVersion[]> => {
      const versionKey = `${projectId}:${environment}:${id}`;
      return this.tracepointVersions.get(versionKey) ?? [];
    },

    rollback: async (
      projectId: string,
      environment: string,
      id: string,
      versionId: string
    ): Promise<StoredTracepointConfig> => {
      const versionKey = `${projectId}:${environment}:${id}`;
      const versions = this.tracepointVersions.get(versionKey) ?? [];
      const targetVersion = versions.find((v) => v.versionId === versionId);

      if (!targetVersion) {
        throw new Error(`Version not found: ${versionId}`);
      }

      const now = new Date().toISOString();
      const rolledBack: StoredTracepointConfig = {
        ...targetVersion.config,
        updatedAt: now,
        version: (this.tracepointsMap.get(`${projectId}:${environment}`)?.get(id)?.version ?? 0) + 1,
      };

      const key = `${projectId}:${environment}`;
      this.tracepointsMap.get(key)!.set(id, rolledBack);

      return rolledBack;
    },
  };

  apiKeys = {
    create: async (projectId: string, key: Omit<ApiKey, 'id' | 'createdAt'>): Promise<ApiKey> => {
      const id = this.generateId();
      const createdAt = new Date().toISOString();

      const apiKey: ApiKey = {
        ...key,
        id,
        createdAt,
      };

      this.apiKeysMap.set(`${projectId}:${id}`, apiKey);
      this.apiKeysByString.set(key.key, apiKey);

      return apiKey;
    },

    getById: async (projectId: string, id: string): Promise<ApiKey | null> => {
      return this.apiKeysMap.get(`${projectId}:${id}`) ?? null;
    },

    getByKey: async (key: string): Promise<ApiKey | null> => {
      return this.apiKeysByString.get(key) ?? null;
    },

    list: async (projectId: string): Promise<ApiKey[]> => {
      const prefix = `${projectId}:`;
      return Array.from(this.apiKeysMap.values()).filter((k) =>
        Array.from(this.apiKeysMap.keys()).some((key) => key.startsWith(prefix) && this.apiKeysMap.get(key) === k)
      );
    },

    revoke: async (projectId: string, id: string): Promise<void> => {
      const key = `${projectId}:${id}`;
      const apiKey = this.apiKeysMap.get(key);
      if (apiKey) {
        this.apiKeysByString.delete(apiKey.key);
      }
      this.apiKeysMap.delete(key);
    },

    updateLastUsed: async (key: string): Promise<void> => {
      const apiKey = this.apiKeysByString.get(key);
      if (apiKey) {
        apiKey.lastUsedAt = new Date().toISOString();
      }
    },
  };

  readonly auditLog = {
    log: async (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> => {
      const id = this.generateId();
      const timestamp = new Date().toISOString();

      const auditEntry: AuditLogEntry = {
        ...entry,
        id,
        timestamp,
      };

      this.auditLogs.push(auditEntry);
      return auditEntry;
    },

    query: async (
      projectId: string,
      options?: {
        resourceType?: string;
        resourceId?: string;
        action?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
      }
    ): Promise<AuditLogEntry[]> => {
      let results = this.auditLogs.filter((log) => log.projectId === projectId);

      if (options?.resourceType) {
        results = results.filter((log) => log.resourceType === options.resourceType);
      }

      if (options?.resourceId) {
        results = results.filter((log) => log.resourceId === options.resourceId);
      }

      if (options?.action) {
        results = results.filter((log) => log.action === options.action);
      }

      if (options?.startTime) {
        results = results.filter((log) => log.timestamp >= options.startTime!);
      }

      if (options?.endTime) {
        results = results.filter((log) => log.timestamp <= options.endTime!);
      }

      // Sort by timestamp descending
      results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      const limit = options?.limit ?? 100;
      return results.slice(0, limit);
    },
  };

  async close(): Promise<void> {
    // No-op for in-memory storage
  }

  private generateId(): string {
    return `${Date.now()}-${++this.idCounter}`;
  }
}
