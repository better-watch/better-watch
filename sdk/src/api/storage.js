/**
 * Storage backend implementations for trace data
 */
/**
 * In-memory storage backend (for development/testing)
 */
export class InMemoryStorage {
    traces = [];
    async storeTrace(trace) {
        this.traces.push(trace);
    }
    async storeBatch(traces) {
        this.traces.push(...traces);
        return traces.length;
    }
    async queryTraces(projectId, options) {
        let results = this.traces.filter((t) => t.projectId === projectId);
        if (options?.startTime) {
            const startTime = new Date(options.startTime).getTime();
            results = results.filter((t) => {
                const traceTime = new Date(t.timestamp).getTime();
                return traceTime >= startTime;
            });
        }
        if (options?.endTime) {
            const endTime = new Date(options.endTime).getTime();
            results = results.filter((t) => {
                const traceTime = new Date(t.timestamp).getTime();
                return traceTime <= endTime;
            });
        }
        if (options?.functionName) {
            results = results.filter((t) => t.functionName === options.functionName);
        }
        if (options?.limit) {
            results = results.slice(-options.limit);
        }
        return results;
    }
    async close() {
        this.traces = [];
    }
    /**
     * Get all stored traces (for testing)
     */
    getAllTraces() {
        return [...this.traces];
    }
}
/**
 * Stub implementation for ClickHouse backend
 */
export class ClickHouseStorage {
    connectionString;
    connected = false;
    constructor(connectionString) {
        this.connectionString = connectionString;
    }
    async connect() {
        // In a real implementation, connect to ClickHouse
        // For now, this is a stub that accepts the connection
        this.connected = true;
    }
    async storeTrace(_trace) {
        if (!this.connected) {
            throw new Error('Not connected to ClickHouse');
        }
        // In a real implementation, insert trace into ClickHouse
        // INSERT INTO traces (id, projectId, filePath, ...) VALUES (...)
    }
    async storeBatch(traces) {
        if (!this.connected) {
            throw new Error('Not connected to ClickHouse');
        }
        // In a real implementation, batch insert into ClickHouse
        return traces.length;
    }
    async queryTraces(_projectId, _options) {
        if (!this.connected) {
            throw new Error('Not connected to ClickHouse');
        }
        // In a real implementation, query from ClickHouse
        return [];
    }
    async close() {
        this.connected = false;
    }
}
/**
 * Stub implementation for PostgreSQL backend
 */
export class PostgreSQLStorage {
    connectionString;
    connected = false;
    constructor(connectionString) {
        this.connectionString = connectionString;
    }
    async connect() {
        // In a real implementation, connect to PostgreSQL
        this.connected = true;
    }
    async storeTrace(_trace) {
        if (!this.connected) {
            throw new Error('Not connected to PostgreSQL');
        }
        // In a real implementation, insert trace into PostgreSQL
    }
    async storeBatch(traces) {
        if (!this.connected) {
            throw new Error('Not connected to PostgreSQL');
        }
        // In a real implementation, batch insert into PostgreSQL
        return traces.length;
    }
    async queryTraces(_projectId, _options) {
        if (!this.connected) {
            throw new Error('Not connected to PostgreSQL');
        }
        // In a real implementation, query from PostgreSQL
        return [];
    }
    async close() {
        this.connected = false;
    }
}
//# sourceMappingURL=storage.js.map