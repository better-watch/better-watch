/**
 * Storage interface and implementations for configuration management
 */
/**
 * In-memory configuration storage implementation
 */
export class InMemoryConfigStorage {
    tracepointsMap = new Map();
    tracepointVersions = new Map();
    apiKeysMap = new Map();
    apiKeysByString = new Map();
    auditLogs = [];
    idCounter = 0;
    tracepoints = {
        create: async (projectId, environment, config) => {
            const id = this.generateId();
            const now = new Date().toISOString();
            const tracepointConfig = {
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
            this.tracepointsMap.get(key).set(id, tracepointConfig);
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
        getById: async (projectId, environment, id) => {
            const key = `${projectId}:${environment}`;
            return this.tracepointsMap.get(key)?.get(id) ?? null;
        },
        list: async (projectId, environment, filter) => {
            const key = `${projectId}:${environment}`;
            let items = Array.from(this.tracepointsMap.get(key)?.values() ?? []);
            // Apply filters
            if (filter?.enabled !== undefined) {
                items = items.filter((t) => t.enabled === filter.enabled);
            }
            if (filter?.tags && filter.tags.length > 0) {
                items = items.filter((t) => filter.tags.every((tag) => t.tags?.includes(tag)));
            }
            if (filter?.filePath) {
                items = items.filter((t) => t.filePath.includes(filter.filePath));
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
                const aVal = a[sortBy];
                const bVal = b[sortBy];
                if (aVal === undefined || bVal === undefined)
                    return 0;
                const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return sortOrder === 'asc' ? cmp : -cmp;
            });
            const total = items.length;
            const limit = filter?.limit ?? 100;
            const offset = filter?.offset ?? 0;
            const paginated = items.slice(offset, offset + limit);
            return { tracepoints: paginated, total };
        },
        update: async (projectId, environment, id, updates, createVersion) => {
            const key = `${projectId}:${environment}`;
            const existing = this.tracepointsMap.get(key)?.get(id);
            if (!existing) {
                throw new Error(`Tracepoint not found: ${id}`);
            }
            const now = new Date().toISOString();
            const updated = {
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
            this.tracepointsMap.get(key).set(id, updated);
            return updated;
        },
        delete: async (projectId, environment, id) => {
            const key = `${projectId}:${environment}`;
            this.tracepointsMap.get(key)?.delete(id);
        },
        getVersionHistory: async (projectId, environment, id) => {
            const versionKey = `${projectId}:${environment}:${id}`;
            return this.tracepointVersions.get(versionKey) ?? [];
        },
        rollback: async (projectId, environment, id, versionId) => {
            const versionKey = `${projectId}:${environment}:${id}`;
            const versions = this.tracepointVersions.get(versionKey) ?? [];
            const targetVersion = versions.find((v) => v.versionId === versionId);
            if (!targetVersion) {
                throw new Error(`Version not found: ${versionId}`);
            }
            const now = new Date().toISOString();
            const rolledBack = {
                ...targetVersion.config,
                updatedAt: now,
                version: (this.tracepointsMap.get(`${projectId}:${environment}`)?.get(id)?.version ?? 0) + 1,
            };
            const key = `${projectId}:${environment}`;
            this.tracepointsMap.get(key).set(id, rolledBack);
            return rolledBack;
        },
    };
    apiKeys = {
        create: async (projectId, key) => {
            const id = this.generateId();
            const createdAt = new Date().toISOString();
            const apiKey = {
                ...key,
                id,
                createdAt,
            };
            this.apiKeysMap.set(`${projectId}:${id}`, apiKey);
            this.apiKeysByString.set(key.key, apiKey);
            return apiKey;
        },
        getById: async (projectId, id) => {
            return this.apiKeysMap.get(`${projectId}:${id}`) ?? null;
        },
        getByKey: async (key) => {
            return this.apiKeysByString.get(key) ?? null;
        },
        list: async (projectId) => {
            const prefix = `${projectId}:`;
            return Array.from(this.apiKeysMap.values()).filter((k) => Array.from(this.apiKeysMap.keys()).some((key) => key.startsWith(prefix) && this.apiKeysMap.get(key) === k));
        },
        revoke: async (projectId, id) => {
            const key = `${projectId}:${id}`;
            const apiKey = this.apiKeysMap.get(key);
            if (apiKey) {
                this.apiKeysByString.delete(apiKey.key);
            }
            this.apiKeysMap.delete(key);
        },
        updateLastUsed: async (key) => {
            const apiKey = this.apiKeysByString.get(key);
            if (apiKey) {
                apiKey.lastUsedAt = new Date().toISOString();
            }
        },
    };
    auditLog = {
        log: async (entry) => {
            const id = this.generateId();
            const timestamp = new Date().toISOString();
            const auditEntry = {
                ...entry,
                id,
                timestamp,
            };
            this.auditLogs.push(auditEntry);
            return auditEntry;
        },
        query: async (projectId, options) => {
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
                results = results.filter((log) => log.timestamp >= options.startTime);
            }
            if (options?.endTime) {
                results = results.filter((log) => log.timestamp <= options.endTime);
            }
            // Sort by timestamp descending
            results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            const limit = options?.limit ?? 100;
            return results.slice(0, limit);
        },
    };
    async close() {
        // No-op for in-memory storage
    }
    generateId() {
        return `${Date.now()}-${++this.idCounter}`;
    }
}
//# sourceMappingURL=config-storage.js.map