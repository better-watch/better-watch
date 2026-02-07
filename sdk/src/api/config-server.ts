/**
 * Config Management API Server
 */

import type {
  StoredTracepointConfig,
  ApiKey,
  CreateTracepointRequest,
  UpdateTracepointRequest,
  CreateApiKeyRequest,
  ConfigExport,
  ConfigImportRequest,
  ConfigImportResult,
  AuditLogEntry,
  ConfigManagementError,
  TracepointQueryFilter,
} from './config-types.js';
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
export class ConfigManagementServer {
  private config: Required<ConfigManagementServerConfig>;

  constructor(config: ConfigManagementServerConfig) {
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
  async createTracepoint(
    projectId: string,
    environment: string,
    request: CreateTracepointRequest,
    apiKey?: string
  ): Promise<StoredTracepointConfig> {
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
    } else if (request.type === 'entry' || request.type === 'exit') {
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

    const tracepointConfig: Omit<
      StoredTracepointConfig,
      'id' | 'createdAt' | 'updatedAt' | 'version' | 'previousVersionId'
    > = {
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
        after: created as unknown as Record<string, unknown>,
      },
    });

    return created;
  }

  /**
   * Get a tracepoint by ID
   */
  async getTracepoint(
    projectId: string,
    environment: string,
    id: string,
    apiKey?: string
  ): Promise<StoredTracepointConfig> {
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
  async listTracepoints(
    projectId: string,
    environment: string,
    filter?: TracepointQueryFilter,
    apiKey?: string
  ): Promise<{ tracepoints: StoredTracepointConfig[]; total: number }> {
    if (apiKey) {
      await this.validatePermission(apiKey, projectId, 'read');
    }

    return this.config.storage.tracepoints.list(projectId, environment, filter);
  }

  /**
   * Update a tracepoint
   */
  async updateTracepoint(
    projectId: string,
    environment: string,
    id: string,
    request: UpdateTracepointRequest,
    apiKey?: string
  ): Promise<StoredTracepointConfig> {
    if (apiKey) {
      await this.validatePermission(apiKey, projectId, 'write');
    }

    const existing = await this.getTracepoint(projectId, environment, id);
    const userId = this.config.getCurrentUser();

    const updates: Partial<StoredTracepointConfig> = {
      ...request,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    const createVersion = request.createVersion !== false;
    const updated = await this.config.storage.tracepoints.update(
      projectId,
      environment,
      id,
      updates,
      createVersion
    );

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
        before: existing as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      },
    });

    return updated;
  }

  /**
   * Delete a tracepoint
   */
  async deleteTracepoint(
    projectId: string,
    environment: string,
    id: string,
    apiKey?: string
  ): Promise<void> {
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
        before: existing as unknown as Record<string, unknown>,
      },
    });
  }

  /**
   * Enable a tracepoint
   */
  async enableTracepoint(
    projectId: string,
    environment: string,
    id: string,
    apiKey?: string
  ): Promise<StoredTracepointConfig> {
    return this.updateTracepoint(projectId, environment, id, { enabled: true }, apiKey);
  }

  /**
   * Disable a tracepoint
   */
  async disableTracepoint(
    projectId: string,
    environment: string,
    id: string,
    apiKey?: string
  ): Promise<StoredTracepointConfig> {
    return this.updateTracepoint(projectId, environment, id, { enabled: false }, apiKey);
  }

  /**
   * Get version history for a tracepoint
   */
  async getVersionHistory(
    projectId: string,
    environment: string,
    id: string,
    apiKey?: string
  ): Promise<unknown[]> {
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
  async rollbackVersion(
    projectId: string,
    environment: string,
    id: string,
    versionId: string,
    apiKey?: string
  ): Promise<StoredTracepointConfig> {
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
        before: existing as unknown as Record<string, unknown>,
        after: rolledBack as unknown as Record<string, unknown>,
      },
    });

    return rolledBack;
  }

  /**
   * Create a new API key
   */
  async createApiKey(
    projectId: string,
    request: CreateApiKeyRequest,
    apiKey?: string
  ): Promise<ApiKey> {
    if (apiKey) {
      await this.validatePermission(apiKey, projectId, 'manage');
    }

    // Generate secure random key
    const key = this.generateApiKey();
    const userId = this.config.getCurrentUser();

    const expiresAt = request.expiresInDays
      ? new Date(Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const newKey: ApiKey = await this.config.storage.apiKeys.create(projectId, {
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
  async listApiKeys(projectId: string, apiKey?: string): Promise<ApiKey[]> {
    if (apiKey) {
      await this.validatePermission(apiKey, projectId, 'manage');
    }

    return this.config.storage.apiKeys.list(projectId);
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(projectId: string, keyId: string, apiKey?: string): Promise<void> {
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
  async getAuditLog(
    projectId: string,
    options?: {
      resourceType?: string;
      resourceId?: string;
      action?: string;
      startTime?: string;
      endTime?: string;
      limit?: number;
    },
    apiKey?: string
  ): Promise<AuditLogEntry[]> {
    if (apiKey) {
      await this.validatePermission(apiKey, projectId, 'read');
    }

    return this.config.storage.auditLog.query(projectId, options);
  }

  /**
   * Export configuration
   */
  async exportConfig(
    projectId: string,
    environment: string,
    filter?: TracepointQueryFilter,
    apiKey?: string
  ): Promise<ConfigExport> {
    if (apiKey) {
      await this.validatePermission(apiKey, projectId, 'read');
    }

    const { tracepoints } = await this.listTracepoints(projectId, environment, filter);
    const userId = this.config.getCurrentUser();

    const exported: ConfigExport = {
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
  async importConfig(
    projectId: string,
    request: ConfigImportRequest,
    apiKey?: string
  ): Promise<ConfigImportResult> {
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

    const result: ConfigImportResult = {
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
          const updated = await this.config.storage.tracepoints.update(
            projectId,
            tp.environment,
            tp.id,
            {
              ...tp,
              tags: tagsToAdd,
              enabled,
            },
            true
          );
          result.imported++;
          result.importedIds!.push(updated.id);
        } else if (!existing) {
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
          result.importedIds!.push(created.id);
        } else {
          result.skipped++;
        }
      } catch (e) {
        result.errors++;
        result.errorDetails!.push({
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
        } as Record<string, unknown>,
      },
    });

    return result;
  }

  /**
   * Get audit log for a specific resource
   */
  async getResourceAuditLog(
    projectId: string,
    resourceType: string,
    resourceId: string
  ): Promise<AuditLogEntry[]> {
    return this.config.storage.auditLog.query(projectId, {
      resourceType,
      resourceId,
      limit: 100,
    });
  }

  /**
   * Fetch runtime configuration for a project/environment
   * Used by runtime config checker for dynamic config polling
   *
   * @param projectId - Project identifier
   * @param environment - Environment name
   * @param apiKey - Optional API key for authentication
   * @returns Configuration with tracepoint enable/disable and sampling rates
   */
  async fetchRuntimeConfig(
    projectId: string,
    environment?: string,
    apiKey?: string
  ): Promise<{
    tracepoints: Array<{
      id: string;
      enabled: boolean;
      samplingRate: number;
      metadata?: Record<string, unknown>;
    }>;
  }> {
    if (apiKey) {
      await this.validatePermission(apiKey, projectId, 'read');
    }

    // List all tracepoints for this project/environment
    const env = environment || 'default';
    const { tracepoints } = await this.listTracepoints(projectId, env);

    // Extract runtime configuration
    return {
      tracepoints: tracepoints.map((tp) => ({
        id: tp.id,
        enabled: tp.enabled !== false, // Default to enabled
        samplingRate: 1.0, // Default sampling rate (always sample)
        metadata: tp.tags ? { tags: tp.tags } : undefined,
      })),
    };
  }

  /**
   * Close server and cleanup
   */
  async close(): Promise<void> {
    await this.config.storage.close();
  }

  /**
   * Validate API key permissions
   */
  private async validatePermission(apiKey: string, projectId: string, permission: string): Promise<void> {
    const valid = await this.config.validateApiKey(apiKey, projectId, permission);
    if (!valid) {
      throw this.error('UNAUTHORIZED', `API key does not have ${permission} permission`);
    }
  }

  /**
   * Generate a secure API key
   */
  private generateApiKey(): string {
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
  private error(code: string, message: string): ConfigManagementError {
    return {
      code,
      message,
    };
  }
}
