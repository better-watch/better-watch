/**
 * API modules (Trace Ingestion and Config Management)
 */

// Trace Ingestion API exports
export type {
  TraceEvent,
  TraceBatchRequest,
  TraceIngestionResponse,
  TraceIngestionConfig,
  ValidationError,
  TraceStorageBackend,
} from './types.js';

export { validateTraceEvent, validateBatchRequest, validateTracesInBatch } from './validation.js';

export { Authenticator } from './auth.js';

export { RateLimiter } from './rate-limiter.js';

export type { CircuitBreakerConfig } from './circuit-breaker.js';
export { CircuitBreaker, CircuitState } from './circuit-breaker.js';

export type { MemoryMonitorConfig, MemoryStats } from './memory-monitor.js';
export { MemoryMonitor } from './memory-monitor.js';

export type { TraceQueueConfig, ProcessResult } from './trace-queue.js';
export { TraceQueue } from './trace-queue.js';

export type {
  ExportResult,
  HttpExporterConfig,
  FileExporterConfig,
  RetryConfig,
  CustomExportHandler,
} from './trace-exporter.js';
export {
  HttpExporter,
  ConsoleExporter,
  FileExporter,
  CustomExporter,
  CompositeExporter,
} from './trace-exporter.js';

export type { TraceBatchManagerConfig, BatchManagerStats } from './trace-batch-manager.js';
export {
  TraceBatchManager,
  initBatchManager,
  getBatchManager,
  resetBatchManager,
} from './trace-batch-manager.js';

export {
  InMemoryStorage,
  ClickHouseStorage,
  PostgreSQLStorage,
} from './storage.js';

export { TraceIngestionServer } from './server.js';

// Config Management API exports
export type {
  StoredTracepointConfig,
  CreateTracepointRequest,
  UpdateTracepointRequest,
  ApiKey,
  CreateApiKeyRequest,
  AuditLogEntry,
  ConfigVersion,
  ConfigExport,
  ConfigImportRequest,
  ConfigImportResult,
  ConfigManagementError,
  TracepointQueryFilter,
} from './config-types.js';

export type { ConfigStorageBackend } from './config-storage.js';

export { InMemoryConfigStorage } from './config-storage.js';

export type { ConfigManagementServerConfig } from './config-server.js';

export { ConfigManagementServer } from './config-server.js';

// Remote Configuration Fetching exports
export type {
  RemoteAuthConfig,
  RemoteConfigFetcherConfig,
  RemoteConfigFetchResult,
} from './remote-config-fetcher.js';

export { RemoteConfigFetcher } from './remote-config-fetcher.js';
