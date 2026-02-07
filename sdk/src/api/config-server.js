/**
 * Config Management API Server
 */
/**
 * Config Management API Server
 */
export class ConfigManagementServer {
    config;
    constructor(config) {
        this.config = {
            validateApiKey: config.validateApiKey ?? (async () => true),
            getCurrentUser: config.getCurrentUser ?? (() => undefined),
            getClientId: config.getClientId ?? (() => undefined),
            maxTracepointsPerEnvironment: config.maxTracepointsPerEnvironment ?? 10000,
            maxImportSize: config.maxImportSize ?? 10 * 1024 * 1024, // 10MB
            storage: config.storage,
        };
    }
    /**
     * Create a new tracepoint
     */
    async createTracepoint(projectId, environment, request, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'write');
        }
        // Validate request
        if (!request.filePath || !request.type || !request.code) {
            throw this.error('VALIDATION_ERROR', 'Missing required fields: filePath, type, code');
        }
        if (request.type === 'before' || request.type === 'after') {
            if (request.lineNumber === undefined) {
                throw this.error('VALIDATION_ERROR', 'lineNumber required for before/after injections');
            }
        }
        else if (request.type === 'entry' || request.type === 'exit') {
            if (!request.functionName && !request.functionPath) {
                throw this.error('VALIDATION_ERROR', 'functionName or functionPath required for entry/exit injections');
            }
        }
        // Check limit
        const { total } = await this.config.storage.tracepoints.list(projectId, environment);
        if (total >= this.config.maxTracepointsPerEnvironment) {
            throw this.error('LIMIT_EXCEEDED', `Maximum tracepoints (${this.config.maxTracepointsPerEnvironment}) exceeded`);
        }
        const userId = this.config.getCurrentUser();
        const tracepointConfig = {
            projectId,
            environment,
            filePath: request.filePath,
            type: request.type,
            code: request.code,
            lineNumber: request.lineNumber,
            functionName: request.functionName,
            functionPath: request.functionPath,
            includeAsync: request.includeAsync,
            includeGenerators: request.includeGenerators,
            name: request.name,
            description: request.description,
            tags: request.tags,
            enabled: request.enabled ?? true,
            createdBy: userId,
            updatedBy: userId,
        };
        const created = await this.config.storage.tracepoints.create(projectId, environment, tracepointConfig);
        // Audit log
        await this.config.storage.auditLog.log({
            projectId,
            action: 'create',
            resourceType: 'tracepoint',
            resourceId: created.id,
            userId,
            success: true,
            clientId: this.config.getClientId(),
            changes: {
                after: created,
            },
        });
        return created;
    }
    /**
     * Get a tracepoint by ID
     */
    async getTracepoint(projectId, environment, id, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'read');
        }
        const tracepoint = await this.config.storage.tracepoints.getById(projectId, environment, id);
        if (!tracepoint) {
            throw this.error('NOT_FOUND', `Tracepoint not found: ${id}`);
        }
        return tracepoint;
    }
    /**
     * List tracepoints with filtering
     */
    async listTracepoints(projectId, environment, filter, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'read');
        }
        return this.config.storage.tracepoints.list(projectId, environment, filter);
    }
    /**
     * Update a tracepoint
     */
    async updateTracepoint(projectId, environment, id, request, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'write');
        }
        const existing = await this.getTracepoint(projectId, environment, id);
        const userId = this.config.getCurrentUser();
        const updates = {
            ...request,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
        };
        const createVersion = request.createVersion !== false;
        const updated = await this.config.storage.tracepoints.update(projectId, environment, id, updates, createVersion);
        // Audit log
        await this.config.storage.auditLog.log({
            projectId,
            action: 'update',
            resourceType: 'tracepoint',
            resourceId: id,
            userId,
            success: true,
            clientId: this.config.getClientId(),
            changes: {
                before: existing,
                after: updated,
            },
        });
        return updated;
    }
    /**
     * Delete a tracepoint
     */
    async deleteTracepoint(projectId, environment, id, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'delete');
        }
        const existing = await this.getTracepoint(projectId, environment, id);
        const userId = this.config.getCurrentUser();
        await this.config.storage.tracepoints.delete(projectId, environment, id);
        // Audit log
        await this.config.storage.auditLog.log({
            projectId,
            action: 'delete',
            resourceType: 'tracepoint',
            resourceId: id,
            userId,
            success: true,
            clientId: this.config.getClientId(),
            changes: {
                before: existing,
            },
        });
    }
    /**
     * Enable a tracepoint
     */
    async enableTracepoint(projectId, environment, id, apiKey) {
        return this.updateTracepoint(projectId, environment, id, { enabled: true }, apiKey);
    }
    /**
     * Disable a tracepoint
     */
    async disableTracepoint(projectId, environment, id, apiKey) {
        return this.updateTracepoint(projectId, environment, id, { enabled: false }, apiKey);
    }
    /**
     * Get version history for a tracepoint
     */
    async getVersionHistory(projectId, environment, id, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'read');
        }
        // Verify tracepoint exists
        await this.getTracepoint(projectId, environment, id);
        return this.config.storage.tracepoints.getVersionHistory(projectId, environment, id);
    }
    /**
     * Rollback a tracepoint to a previous version
     */
    async rollbackVersion(projectId, environment, id, versionId, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'write');
        }
        const existing = await this.getTracepoint(projectId, environment, id);
        const userId = this.config.getCurrentUser();
        const rolledBack = await this.config.storage.tracepoints.rollback(projectId, environment, id, versionId);
        // Audit log
        await this.config.storage.auditLog.log({
            projectId,
            action: 'rollback',
            resourceType: 'tracepoint',
            resourceId: id,
            userId,
            success: true,
            clientId: this.config.getClientId(),
            changes: {
                before: existing,
                after: rolledBack,
            },
        });
        return rolledBack;
    }
    /**
     * Create a new API key
     */
    async createApiKey(projectId, request, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'manage');
        }
        // Generate secure random key
        const key = this.generateApiKey();
        const userId = this.config.getCurrentUser();
        const expiresAt = request.expiresInDays
            ? new Date(Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : undefined;
        const newKey = await this.config.storage.apiKeys.create(projectId, {
            key,
            projectId,
            name: request.name,
            environments: request.environments,
            permissions: request.permissions,
            active: true,
            lastUsedAt: undefined,
            createdBy: userId,
            expiresAt,
        });
        // Audit log
        await this.config.storage.auditLog.log({
            projectId,
            action: 'api_key_create',
            resourceType: 'api_key',
            resourceId: newKey.id,
            userId,
            success: true,
            clientId: this.config.getClientId(),
        });
        return newKey;
    }
    /**
     * List API keys for a project
     */
    async listApiKeys(projectId, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'manage');
        }
        return this.config.storage.apiKeys.list(projectId);
    }
    /**
     * Revoke an API key
     */
    async revokeApiKey(projectId, keyId, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'manage');
        }
        const userId = this.config.getCurrentUser();
        await this.config.storage.apiKeys.revoke(projectId, keyId);
        // Audit log
        await this.config.storage.auditLog.log({
            projectId,
            action: 'api_key_delete',
            resourceType: 'api_key',
            resourceId: keyId,
            userId,
            success: true,
            clientId: this.config.getClientId(),
        });
    }
    /**
     * Get audit log entries
     */
    async getAuditLog(projectId, options, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'read');
        }
        return this.config.storage.auditLog.query(projectId, options);
    }
    /**
     * Export configuration
     */
    async exportConfig(projectId, environment, filter, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'read');
        }
        const { tracepoints } = await this.listTracepoints(projectId, environment, filter);
        const userId = this.config.getCurrentUser();
        const exported = {
            version: '1.0',
            projectId,
            environment,
            tracepoints,
            exportedAt: new Date().toISOString(),
            exportedBy: userId,
        };
        // Audit log
        await this.config.storage.auditLog.log({
            projectId,
            action: 'export',
            resourceType: 'config',
            resourceId: environment,
            userId,
            success: true,
            clientId: this.config.getClientId(),
        });
        return exported;
    }
    /**
     * Import configuration
     */
    async importConfig(projectId, request, apiKey) {
        if (apiKey) {
            await this.validatePermission(apiKey, projectId, 'write');
        }
        const userId = this.config.getCurrentUser();
        // Validate import data
        if (!request.data || !request.data.tracepoints) {
            throw this.error('VALIDATION_ERROR', 'Invalid import data');
        }
        if (JSON.stringify(request.data).length > this.config.maxImportSize) {
            throw this.error('VALIDATION_ERROR', `Import size exceeds maximum of ${this.config.maxImportSize} bytes`);
        }
        const result = {
            imported: 0,
            skipped: 0,
            errors: 0,
            errorDetails: [],
            importedIds: [],
        };
        for (const tp of request.data.tracepoints) {
            try {
                const existing = await this.config.storage.tracepoints.getById(projectId, tp.environment, tp.id);
                if (existing && request.strategy === 'skip') {
                    result.skipped++;
                    continue;
                }
                const tagsToAdd = [...(tp.tags ?? []), ...(request.additionalTags ?? [])];
                const enabled = request.enableAll !== undefined ? request.enableAll : tp.enabled;
                if (existing && request.strategy === 'overwrite') {
                    // Update existing
                    const updated = await this.config.storage.tracepoints.update(projectId, tp.environment, tp.id, {
                        ...tp,
                        tags: tagsToAdd,
                        enabled,
                    }, true);
                    result.imported++;
                    result.importedIds.push(updated.id);
                }
                else if (!existing) {
                    // Create new
                    const created = await this.config.storage.tracepoints.create(projectId, tp.environment, {
                        projectId,
                        environment: tp.environment,
                        filePath: tp.filePath,
                        type: tp.type,
                        code: tp.code,
                        lineNumber: tp.lineNumber,
                        functionName: tp.functionName,
                        functionPath: tp.functionPath,
                        includeAsync: tp.includeAsync,
                        includeGenerators: tp.includeGenerators,
                        name: tp.name,
                        description: tp.description,
                        tags: tagsToAdd,
                        enabled,
                        createdBy: userId,
                        updatedBy: userId,
                    });
                    result.imported++;
                    result.importedIds.push(created.id);
                }
                else {
                    result.skipped++;
                }
            }
            catch (e) {
                result.errors++;
                result.errorDetails.push({
                    tracepointId: tp.id,
                    reason: String(e),
                });
            }
        }
        // Audit log
        await this.config.storage.auditLog.log({
            projectId,
            action: 'import',
            resourceType: 'config',
            resourceId: request.data.environment,
            userId,
            success: true,
            clientId: this.config.getClientId(),
            changes: {
                after: {
                    imported: result.imported,
                    skipped: result.skipped,
                    errors: result.errors,
                },
            },
        });
        return result;
    }
    /**
     * Get audit log for a specific resource
     */
    async getResourceAuditLog(projectId, resourceType, resourceId) {
        return this.config.storage.auditLog.query(projectId, {
            resourceType,
            resourceId,
            limit: 100,
        });
    }
    /**
     * Close server and cleanup
     */
    async close() {
        await this.config.storage.close();
    }
    /**
     * Validate API key permissions
     */
    async validatePermission(apiKey, projectId, permission) {
        const valid = await this.config.validateApiKey(apiKey, projectId, permission);
        if (!valid) {
            throw this.error('UNAUTHORIZED', `API key does not have ${permission} permission`);
        }
    }
    /**
     * Generate a secure API key
     */
    generateApiKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'sk_';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    /**
     * Create a structured error
     */
    error(code, message) {
        return {
            code,
            message,
        };
    }
}
//# sourceMappingURL=config-server.js.map