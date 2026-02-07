/**
 * Type definitions for Config Management API
 */
import type { TracepointConfig } from '../injector/types.js';
/**
 * Stored tracepoint configuration with metadata
 */
export interface StoredTracepointConfig extends TracepointConfig {
    /**
     * Unique identifier for this tracepoint
     */
    id: string;
    /**
     * Project ID this tracepoint belongs to
     */
    projectId: string;
    /**
     * Environment name (e.g., 'development', 'staging', 'production')
     */
    environment: string;
    /**
     * File path where this tracepoint applies
     */
    filePath: string;
    /**
     * Human-readable name for this tracepoint
     */
    name?: string;
    /**
     * Description of what this tracepoint captures
     */
    description?: string;
    /**
     * Whether this tracepoint is currently enabled
     */
    enabled: boolean;
    /**
     * Tags for organizing tracepoints
     */
    tags?: string[];
    /**
     * Creation timestamp (ISO 8601)
     */
    createdAt: string;
    /**
     * Last update timestamp (ISO 8601)
     */
    updatedAt: string;
    /**
     * Version number for this configuration
     */
    version: number;
    /**
     * User who created this tracepoint
     */
    createdBy?: string;
    /**
     * User who last updated this tracepoint
     */
    updatedBy?: string;
    /**
     * Previous version ID for rollback reference
     */
    previousVersionId?: string;
}
/**
 * Request to create a new tracepoint
 */
export interface CreateTracepointRequest {
    /**
     * File path where this tracepoint applies
     */
    filePath: string;
    /**
     * Injection type
     */
    type: 'before' | 'after' | 'entry' | 'exit';
    /**
     * Line number for before/after injections
     */
    lineNumber?: number;
    /**
     * Function name for entry/exit injections
     */
    functionName?: string;
    /**
     * Function path for nested functions
     */
    functionPath?: string;
    /**
     * Code to inject
     */
    code: string;
    /**
     * Human-readable name
     */
    name?: string;
    /**
     * Description
     */
    description?: string;
    /**
     * Whether to include async functions
     */
    includeAsync?: boolean;
    /**
     * Whether to include generator functions
     */
    includeGenerators?: boolean;
    /**
     * Tags for organizing
     */
    tags?: string[];
    /**
     * Whether enabled by default
     */
    enabled?: boolean;
}
/**
 * Request to update a tracepoint
 */
export interface UpdateTracepointRequest extends Partial<CreateTracepointRequest> {
    /**
     * Whether to create a new version (default: true)
     */
    createVersion?: boolean;
}
/**
 * API key information
 */
export interface ApiKey {
    /**
     * Unique identifier for this API key
     */
    id: string;
    /**
     * The actual API key (only shown at creation)
     */
    key: string;
    /**
     * Project ID this key grants access to
     */
    projectId: string;
    /**
     * Human-readable name for this key
     */
    name: string;
    /**
     * Environments this key can access
     */
    environments: string[];
    /**
     * Permissions granted to this key
     */
    permissions: ('read' | 'write' | 'delete' | 'manage')[];
    /**
     * Whether this key is currently active
     */
    active: boolean;
    /**
     * Creation timestamp
     */
    createdAt: string;
    /**
     * Last used timestamp
     */
    lastUsedAt?: string;
    /**
     * User who created this key
     */
    createdBy?: string;
    /**
     * Expiration timestamp (optional)
     */
    expiresAt?: string;
}
/**
 * Request to create a new API key
 */
export interface CreateApiKeyRequest {
    /**
     * Human-readable name
     */
    name: string;
    /**
     * Environments this key can access
     */
    environments: string[];
    /**
     * Permissions granted
     */
    permissions: ('read' | 'write' | 'delete' | 'manage')[];
    /**
     * Optional expiration time (days from now)
     */
    expiresInDays?: number;
}
/**
 * Audit log entry
 */
export interface AuditLogEntry {
    /**
     * Unique identifier
     */
    id: string;
    /**
     * Project ID
     */
    projectId: string;
    /**
     * Type of action
     */
    action: 'create' | 'update' | 'delete' | 'enable' | 'disable' | 'rollback' | 'export' | 'import' | 'api_key_create' | 'api_key_delete' | 'api_key_rotate';
    /**
     * Resource type affected
     */
    resourceType: 'tracepoint' | 'api_key' | 'config';
    /**
     * Resource ID affected
     */
    resourceId: string;
    /**
     * Changes made (before/after)
     */
    changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
    };
    /**
     * User who performed the action
     */
    userId?: string;
    /**
     * Whether the action succeeded
     */
    success: boolean;
    /**
     * Error message if failed
     */
    errorMessage?: string;
    /**
     * Timestamp
     */
    timestamp: string;
    /**
     * IP address or client identifier
     */
    clientId?: string;
}
/**
 * Configuration version history entry
 */
export interface ConfigVersion {
    /**
     * Version identifier (unique per tracepoint)
     */
    versionId: string;
    /**
     * The configuration at this version
     */
    config: StoredTracepointConfig;
    /**
     * Reason for this version
     */
    reason?: string;
    /**
     * User who made the change
     */
    changedBy?: string;
    /**
     * Timestamp
     */
    timestamp: string;
}
/**
 * Bulk import/export format
 */
export interface ConfigExport {
    /**
     * Export format version
     */
    version: string;
    /**
     * Project ID
     */
    projectId: string;
    /**
     * Environment name
     */
    environment: string;
    /**
     * Exported tracepoints
     */
    tracepoints: StoredTracepointConfig[];
    /**
     * Export timestamp
     */
    exportedAt: string;
    /**
     * User who exported
     */
    exportedBy?: string;
    /**
     * Optional checksum for validation
     */
    checksum?: string;
}
/**
 * Bulk import request
 */
export interface ConfigImportRequest {
    /**
     * The configuration export to import
     */
    data: ConfigExport;
    /**
     * How to handle existing tracepoints
     */
    strategy: 'overwrite' | 'merge' | 'skip';
    /**
     * List of tags to add to all imported tracepoints
     */
    additionalTags?: string[];
    /**
     * Whether to enable all imported tracepoints
     */
    enableAll?: boolean;
}
/**
 * Result of bulk import
 */
export interface ConfigImportResult {
    /**
     * Number of tracepoints imported
     */
    imported: number;
    /**
     * Number of tracepoints skipped
     */
    skipped: number;
    /**
     * Number of tracepoints that had errors
     */
    errors: number;
    /**
     * Details about any errors
     */
    errorDetails?: Array<{
        tracepointId: string;
        reason: string;
    }>;
    /**
     * IDs of successfully imported tracepoints
     */
    importedIds?: string[];
}
/**
 * Config management API error response
 */
export interface ConfigManagementError {
    /**
     * Error code
     */
    code: string;
    /**
     * Error message
     */
    message: string;
    /**
     * Additional details
     */
    details?: Record<string, unknown>;
    /**
     * Request ID for tracking
     */
    requestId?: string;
}
/**
 * Query filters for listing tracepoints
 */
export interface TracepointQueryFilter {
    /**
     * Filter by enabled status
     */
    enabled?: boolean;
    /**
     * Filter by tags (AND logic - must have all tags)
     */
    tags?: string[];
    /**
     * Filter by file path (partial match)
     */
    filePath?: string;
    /**
     * Filter by function name
     */
    functionName?: string;
    /**
     * Filter by injection type
     */
    type?: 'before' | 'after' | 'entry' | 'exit';
    /**
     * Sort order
     */
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    /**
     * Sort direction
     */
    sortOrder?: 'asc' | 'desc';
    /**
     * Pagination: limit
     */
    limit?: number;
    /**
     * Pagination: offset
     */
    offset?: number;
}
//# sourceMappingURL=config-types.d.ts.map