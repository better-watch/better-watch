/**
 * Storage backend implementations for trace data
 */
import type { TraceEvent, TraceStorageBackend } from './types.js';
/**
 * In-memory storage backend (for development/testing)
 */
export declare class InMemoryStorage implements TraceStorageBackend {
    private traces;
    storeTrace(trace: TraceEvent): Promise<void>;
    storeBatch(traces: TraceEvent[]): Promise<number>;
    queryTraces(projectId: string, options?: {
        startTime?: string;
        endTime?: string;
        functionName?: string;
        limit?: number;
    }): Promise<TraceEvent[]>;
    close(): Promise<void>;
    /**
     * Get all stored traces (for testing)
     */
    getAllTraces(): TraceEvent[];
}
/**
 * Stub implementation for ClickHouse backend
 */
export declare class ClickHouseStorage implements TraceStorageBackend {
    private connectionString;
    private connected;
    constructor(connectionString: string);
    connect(): Promise<void>;
    storeTrace(_trace: TraceEvent): Promise<void>;
    storeBatch(traces: TraceEvent[]): Promise<number>;
    queryTraces(_projectId: string, _options?: {
        startTime?: string;
        endTime?: string;
        functionName?: string;
        limit?: number;
    }): Promise<TraceEvent[]>;
    close(): Promise<void>;
}
/**
 * Stub implementation for PostgreSQL backend
 */
export declare class PostgreSQLStorage implements TraceStorageBackend {
    private connectionString;
    private connected;
    constructor(connectionString: string);
    connect(): Promise<void>;
    storeTrace(_trace: TraceEvent): Promise<void>;
    storeBatch(traces: TraceEvent[]): Promise<number>;
    queryTraces(_projectId: string, _options?: {
        startTime?: string;
        endTime?: string;
        functionName?: string;
        limit?: number;
    }): Promise<TraceEvent[]>;
    close(): Promise<void>;
}
//# sourceMappingURL=storage.d.ts.map